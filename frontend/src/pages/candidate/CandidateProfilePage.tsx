import { useState, useCallback, useEffect, KeyboardEvent } from 'react';
import { useUser } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { profileApi } from '../../services/api';

type EducationEntry = {
  institution: string;
  degree: string;
  field_of_study: string;
  start_year?: number | null;
  end_year?: number | null;
};

type WorkExperienceEntry = {
  company: string;
  title: string;
  description: string;
  start_date: string;
  end_date?: string | null;
  current: boolean;
};

type ProfileData = {
  id: string;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  bio?: string | null;
  skills: string[];
  experience_years?: number | null;
  education: EducationEntry[];
  work_experience: WorkExperienceEntry[];
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  github_url?: string | null;
  resume_filename?: string | null;
  resume_url?: string | null;
  expected_salary_min?: number | null;
  expected_salary_max?: number | null;
};

const emptyEducation: EducationEntry = {
  institution: '',
  degree: '',
  field_of_study: '',
  start_year: null,
  end_year: null,
};

const emptyWork: WorkExperienceEntry = {
  company: '',
  title: '',
  description: '',
  start_date: '',
  end_date: null,
  current: false,
};

function completionScore(form: ProfileData): number {
  let filled = 0;
  const checks = [
    !!form.phone,
    !!form.city,
    !!form.country,
    !!form.bio,
    form.skills.length > 0,
    !!form.experience_years,
    form.education.some((e) => e.institution),
    form.work_experience.some((w) => w.company),
    !!form.linkedin_url,
    !!form.resume_filename,
  ];
  checks.forEach((c) => { if (c) filled++; });
  return Math.round((filled / checks.length) * 100);
}

export default function CandidateProfilePage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isDark = theme === 'dark';

  const [skillInput, setSkillInput] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: profileApi.get,
    enabled: !!user?.id,
  });

  const [form, setForm] = useState<ProfileData | null>(null);

  useEffect(() => {
    setForm(null);
  }, [user?.id]);

  const initForm = useCallback(
    (p: ProfileData) => {
      setForm({
        ...p,
        skills: p.skills || [],
        education:
          p.education && p.education.length > 0
            ? p.education.map((e: EducationEntry) => ({ ...emptyEducation, ...e }))
            : [{ ...emptyEducation }],
        work_experience:
          p.work_experience && p.work_experience.length > 0
            ? p.work_experience.map((w: WorkExperienceEntry) => ({ ...emptyWork, ...w }))
            : [{ ...emptyWork }],
      });
    },
    []
  );

  useEffect(() => {
    if (profile && !form) initForm(profile as ProfileData);
  }, [profile, form, initForm]);

  const showMsg = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast(msg);
    setToastType(type);
    setTimeout(() => setToast(null), 3500);
  };

  const updateForm = (updates: Partial<ProfileData>) => {
    if (form) setForm({ ...form, ...updates });
  };

  const updateEducation = (index: number, updates: Partial<EducationEntry>) => {
    if (!form) return;
    const next = [...form.education];
    next[index] = { ...next[index], ...updates };
    setForm({ ...form, education: next });
  };

  const addEducation = () => {
    if (form) setForm({ ...form, education: [...form.education, { ...emptyEducation }] });
  };

  const removeEducation = (index: number) => {
    if (!form || form.education.length <= 1) return;
    setForm({ ...form, education: form.education.filter((_, i) => i !== index) });
  };

  const updateWork = (index: number, updates: Partial<WorkExperienceEntry>) => {
    if (!form) return;
    const next = [...form.work_experience];
    next[index] = { ...next[index], ...updates };
    setForm({ ...form, work_experience: next });
  };

  const addWork = () => {
    if (form) setForm({ ...form, work_experience: [...form.work_experience, { ...emptyWork }] });
  };

  const removeWork = (index: number) => {
    if (!form || form.work_experience.length <= 1) return;
    setForm({ ...form, work_experience: form.work_experience.filter((_, i) => i !== index) });
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val || !form) return;
    if (form.skills.includes(val)) { setSkillInput(''); return; }
    setForm({ ...form, skills: [...form.skills, val] });
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    if (!form) return;
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addSkill(); }
  };

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => profileApi.update(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      showMsg('Profile saved successfully!');
      setTimeout(() => navigate('/candidate/dashboard'), 1200);
    },
    onError: () => showMsg('Failed to save. Please try again.', 'error'),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadResume(file),
    onSuccess: (data: ProfileData) => {
      if (user?.id) queryClient.setQueryData(['profile', user.id], data);
      initForm(data);
      showMsg('Resume uploaded and profile auto-filled!');
    },
    onError: (err: { response?: { data?: { detail?: string }; status?: number } }) => {
      const msg = err.response?.status === 413 ? 'File too large (max 5 MB)' : 'Resume upload failed.';
      showMsg(msg, 'error');
    },
  });

  const deleteResumeMutation = useMutation({
    mutationFn: () => profileApi.deleteResume(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile', user?.id] }),
  });

  const handleSave = () => {
    if (!form) return;
    updateMutation.mutate({
      phone: form.phone || null,
      address: form.address || null,
      city: form.city || null,
      country: form.country || null,
      bio: form.bio || null,
      skills: form.skills,
      experience_years: form.experience_years ?? null,
      education: form.education.filter((e) => e.institution || e.degree || e.field_of_study),
      work_experience: form.work_experience.filter((w) => w.company || w.title),
      linkedin_url: form.linkedin_url || null,
      portfolio_url: form.portfolio_url || null,
      github_url: form.github_url || null,
      expected_salary_min: form.expected_salary_min ?? null,
      expected_salary_max: form.expected_salary_max ?? null,
    });
  };

  const handleResumeChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.pdf')) { alert('Only PDF files are accepted'); return; }
    if (file.size > 5 * 1024 * 1024) { alert('File exceeds 5 MB limit'); return; }
    uploadMutation.mutate(file);
  };

  const clearAutoFilledFields = () => {
    if (!form) return;
    setForm({
      ...form,
      phone: null, address: null, city: null, country: null,
      bio: '', skills: [], experience_years: null,
      education: [{ ...emptyEducation }],
      work_experience: [{ ...emptyWork }],
      linkedin_url: '', portfolio_url: '', github_url: '',
      expected_salary_min: null, expected_salary_max: null,
    });
    showMsg('Auto-filled fields cleared. Enter fresh details.');
  };

  // Style helpers
  const sectionCls = `rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;
  const inputCls = `w-full rounded-lg border px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
    isDark ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder:text-slate-500' : 'border-gray-300 bg-white text-gray-900 placeholder:text-gray-400'
  }`;
  const labelCls = `block text-xs font-medium mb-1.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;
  const sectionHeadingCls = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-sm text-red-500">Failed to load profile. Please try again.</p>
      </div>
    );
  }
  if (!form) return null;

  const score = completionScore(form);
  const initials = (user?.firstName?.[0] || '') + (user?.lastName?.[0] || '');

  return (
    <div className={`max-w-3xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white transition-all ${toastType === 'success' ? 'bg-emerald-600' : 'bg-red-600'}`}>
          {toastType === 'success' ? (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          )}
          {toast}
          <button onClick={() => setToast(null)} className="ml-2 opacity-75 hover:opacity-100">×</button>
        </div>
      )}

      {/* Profile header card */}
      <div className={`rounded-xl border mb-6 overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          {/* Avatar — Clerk profile photo with initials fallback */}
          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-slate-800">
            {user?.imageUrl ? (
              <img src={user.imageUrl} alt={user.fullName || 'Profile'} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-lg font-bold">
                {initials || '?'}
              </div>
            )}
          </div>
          {/* Name & meta */}
          <div className="flex-1 min-w-0">
            <h1 className={`text-lg font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
              {user?.fullName || 'Your Profile'}
            </h1>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{user?.primaryEmailAddress?.emailAddress}</p>
            {(form.city || form.country) && (
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                {[form.city, form.country].filter(Boolean).join(', ')}
              </p>
            )}
          </div>
          {/* Completion */}
          <div className="shrink-0 text-right">
            <p className={`text-xs font-medium mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Profile strength</p>
            <div className="flex items-center gap-2">
              <div className={`w-24 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <div
                  className={`h-full rounded-full transition-all ${score >= 80 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-400'}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <span className={`text-xs font-semibold ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-400'}`}>
                {score}%
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">

        {/* Resume */}
        <section className={sectionCls}>
          <div className="px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
            <p className={sectionHeadingCls}>Resume / CV</p>
          </div>
          <div className="px-5 py-4">
            {profile?.resume_filename && (
              <div className={`flex items-center gap-3 mb-4 p-3 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900/60' : 'border-gray-100 bg-gray-50'}`}>
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/20 flex items-center justify-center shrink-0">
                  <svg className="w-4.5 h-4.5 text-red-500" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{profile.resume_filename}</p>
                  {profile.resume_url && (
                    <a href={profile.resume_url} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-indigo-500 hover:underline">View file →</a>
                  )}
                </div>
                <button type="button"
                  onClick={() => !deleteResumeMutation.isPending && deleteResumeMutation.mutate()}
                  disabled={deleteResumeMutation.isPending}
                  className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-red-300 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 font-medium disabled:opacity-50 transition-colors">
                  {deleteResumeMutation.isPending ? 'Removing…' : 'Remove'}
                </button>
              </div>
            )}

            <div className="flex flex-wrap gap-3 items-center">
              <label className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors ${
                isDark ? 'border-slate-600 bg-slate-900/60 hover:border-indigo-500 text-slate-200' : 'border-gray-300 bg-white hover:border-indigo-400 text-gray-700'
              } ${uploadMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}>
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                {uploadMutation.isPending ? 'Uploading & auto-filling…' : 'Upload PDF Resume'}
                <input type="file" accept=".pdf" onChange={handleResumeChoose}
                  disabled={uploadMutation.isPending} className="hidden" />
              </label>
              {profile?.resume_filename && (
                <button type="button" onClick={clearAutoFilledFields}
                  className={`text-xs px-3 py-2 rounded-lg border transition-colors ${isDark ? 'border-slate-600 text-slate-400 hover:bg-slate-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                  Clear auto-filled fields
                </button>
              )}
            </div>
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              PDF only · max 5 MB · uploading auto-fills the sections below
            </p>
          </div>
        </section>

        {/* Personal Info */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
            <p className={sectionHeadingCls}>Personal Info</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Phone</label>
                <input type="text" value={form.phone || ''} onChange={(e) => updateForm({ phone: e.target.value })}
                  className={inputCls} placeholder="+92 300 1234567" />
              </div>
              <div>
                <label className={labelCls}>City</label>
                <input type="text" value={form.city || ''} onChange={(e) => updateForm({ city: e.target.value })}
                  className={inputCls} placeholder="Karachi" />
              </div>
              <div>
                <label className={labelCls}>Country</label>
                <input type="text" value={form.country || ''} onChange={(e) => updateForm({ country: e.target.value })}
                  className={inputCls} placeholder="Pakistan" />
              </div>
              <div>
                <label className={labelCls}>Address</label>
                <input type="text" value={form.address || ''} onChange={(e) => updateForm({ address: e.target.value })}
                  className={inputCls} placeholder="123 Main St" />
              </div>
            </div>
          </div>
        </section>

        {/* Bio */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
            </svg>
            <p className={sectionHeadingCls}>Bio</p>
          </div>
          <div className="px-5 py-4">
            <textarea value={form.bio || ''} onChange={(e) => updateForm({ bio: e.target.value })}
              className={`${inputCls} resize-none`} rows={4}
              placeholder="Write a short summary about yourself — your background, goals, and what you bring to the table…" />
          </div>
        </section>

        {/* Skills */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
            </svg>
            <p className={sectionHeadingCls}>Skills</p>
          </div>
          <div className="px-5 py-4">
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {form.skills.map((s) => (
                  <span key={s} className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${
                    isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                  }`}>
                    {s}
                    <button type="button" onClick={() => removeSkill(s)}
                      className="hover:text-red-500 font-bold leading-none transition-colors">×</button>
                  </span>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input type="text" value={skillInput} onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown} className={inputCls}
                placeholder="Type a skill and press Enter or ," />
              <button type="button" onClick={addSkill}
                className="shrink-0 px-4 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium transition-colors">
                Add
              </button>
            </div>
          </div>
        </section>

        {/* Experience & Salary */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
            </svg>
            <p className={sectionHeadingCls}>Experience & Salary</p>
          </div>
          <div className="px-5 py-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Years of Experience</label>
                <input type="number" min={0} value={form.experience_years ?? ''}
                  onChange={(e) => updateForm({ experience_years: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className={inputCls} placeholder="e.g. 5" />
              </div>
              <div>
                <label className={labelCls}>Min Expected (PKR/mo)</label>
                <input type="number" min={0} value={form.expected_salary_min ?? ''}
                  onChange={(e) => updateForm({ expected_salary_min: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className={inputCls} placeholder="e.g. 50,000" />
              </div>
              <div>
                <label className={labelCls}>Max Expected (PKR/mo)</label>
                <input type="number" min={0} value={form.expected_salary_max ?? ''}
                  onChange={(e) => updateForm({ expected_salary_max: e.target.value ? parseInt(e.target.value, 10) : null })}
                  className={inputCls} placeholder="e.g. 150,000" />
              </div>
            </div>
          </div>
        </section>

        {/* Education */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} stroke="currentColor" fill="none"/>
              </svg>
              <p className={sectionHeadingCls}>Education</p>
            </div>
            <button type="button" onClick={addEducation}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Add
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {form.education.map((e, i) => (
              <div key={i} className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {e.institution || `Education ${i + 1}`}
                  </p>
                  <button type="button" onClick={() => removeEducation(i)} disabled={form.education.length <= 1}
                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors">Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Institution</label>
                    <input type="text" value={e.institution}
                      onChange={(ev) => updateEducation(i, { institution: ev.target.value })}
                      className={inputCls} placeholder="University Name" />
                  </div>
                  <div>
                    <label className={labelCls}>Degree</label>
                    <input type="text" value={e.degree}
                      onChange={(ev) => updateEducation(i, { degree: ev.target.value })}
                      className={inputCls} placeholder="B.S." />
                  </div>
                  <div>
                    <label className={labelCls}>Field of Study</label>
                    <input type="text" value={e.field_of_study}
                      onChange={(ev) => updateEducation(i, { field_of_study: ev.target.value })}
                      className={inputCls} placeholder="Computer Science" />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Start Year</label>
                      <input type="number" value={e.start_year ?? ''}
                        onChange={(ev) => updateEducation(i, { start_year: ev.target.value ? parseInt(ev.target.value, 10) : null })}
                        className={inputCls} placeholder="2019" />
                    </div>
                    <div>
                      <label className={labelCls}>End Year</label>
                      <input type="number" value={e.end_year ?? ''}
                        onChange={(ev) => updateEducation(i, { end_year: ev.target.value ? parseInt(ev.target.value, 10) : null })}
                        className={inputCls} placeholder="2023" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Work Experience */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              <p className={sectionHeadingCls}>Work Experience</p>
            </div>
            <button type="button" onClick={addWork}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 hover:text-indigo-600 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
              </svg>
              Add
            </button>
          </div>
          <div className="px-5 py-4 space-y-4">
            {form.work_experience.map((w, i) => (
              <div key={i} className={`rounded-lg border p-4 ${isDark ? 'border-slate-700 bg-slate-900/50' : 'border-gray-100 bg-gray-50'}`}>
                <div className="flex items-center justify-between mb-3">
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
                    {w.company ? `${w.title ? w.title + ' @ ' : ''}${w.company}` : `Experience ${i + 1}`}
                  </p>
                  <button type="button" onClick={() => removeWork(i)} disabled={form.work_experience.length <= 1}
                    className="text-xs text-red-500 hover:text-red-600 disabled:opacity-30 transition-colors">Remove</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Company</label>
                    <input type="text" value={w.company}
                      onChange={(ev) => updateWork(i, { company: ev.target.value })}
                      className={inputCls} placeholder="Acme Inc." />
                  </div>
                  <div>
                    <label className={labelCls}>Job Title</label>
                    <input type="text" value={w.title}
                      onChange={(ev) => updateWork(i, { title: ev.target.value })}
                      className={inputCls} placeholder="Software Engineer" />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Description</label>
                  <textarea value={w.description}
                    onChange={(ev) => updateWork(i, { description: ev.target.value })}
                    className={`${inputCls} resize-none`} rows={3}
                    placeholder="Key responsibilities and achievements…" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <input type="text" value={w.start_date}
                      onChange={(ev) => updateWork(i, { start_date: ev.target.value })}
                      className={inputCls} placeholder="Jan 2020" />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="text" value={w.end_date || ''}
                      onChange={(ev) => updateWork(i, { end_date: ev.target.value || null })}
                      className={inputCls} placeholder="Dec 2023"
                      disabled={w.current} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={`flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
                    <input type="checkbox" checked={w.current}
                      onChange={(ev) => updateWork(i, { current: ev.target.checked })}
                      className="w-4 h-4 accent-indigo-600 rounded" />
                    Currently working here
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Links */}
        <section className={sectionCls}>
          <div className={`px-5 py-4 border-b flex items-center gap-2 ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
            </svg>
            <p className={sectionHeadingCls}>Online Presence</p>
          </div>
          <div className="px-5 py-4 space-y-4">
            {/* LinkedIn */}
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-[#0077B5]/10 flex items-center justify-center shrink-0">
                <svg className="w-4 h-4 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div className="flex-1">
                <label className={labelCls}>LinkedIn</label>
                <input type="url" value={form.linkedin_url || ''}
                  onChange={(e) => updateForm({ linkedin_url: e.target.value })}
                  className={inputCls} placeholder="https://linkedin.com/in/username" />
              </div>
            </div>
            {/* Portfolio */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
                </svg>
              </div>
              <div className="flex-1">
                <label className={labelCls}>Portfolio / Website</label>
                <input type="url" value={form.portfolio_url || ''}
                  onChange={(e) => updateForm({ portfolio_url: e.target.value })}
                  className={inputCls} placeholder="https://yourportfolio.com" />
              </div>
            </div>
            {/* GitHub */}
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
              </div>
              <div className="flex-1">
                <label className={labelCls}>GitHub</label>
                <input type="url" value={form.github_url || ''}
                  onChange={(e) => updateForm({ github_url: e.target.value })}
                  className={inputCls} placeholder="https://github.com/username" />
              </div>
            </div>
          </div>
        </section>

        {/* Sticky save bar */}
        <div className={`sticky bottom-0 z-10 -mx-4 px-4 py-3 border-t ${isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white/95 border-gray-200'} backdrop-blur`}>
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Profile strength: <span className={`font-semibold ${score >= 80 ? 'text-emerald-500' : score >= 50 ? 'text-amber-500' : 'text-red-400'}`}>{score}%</span>
            </p>
            <button type="button" onClick={handleSave} disabled={updateMutation.isPending}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 transition-all shadow-sm">
              {updateMutation.isPending ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Saving…
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                  </svg>
                  Save Profile
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
