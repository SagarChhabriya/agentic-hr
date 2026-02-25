import { useState, useCallback, KeyboardEvent } from 'react';
import { useUser } from '@clerk/clerk-react';
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

export default function CandidateProfilePage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = theme === 'dark';

  const [skillInput, setSkillInput] = useState('');
  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['profile'],
    queryFn: profileApi.get,
  });

  const [form, setForm] = useState<ProfileData | null>(null);

  const initForm = useCallback(
    (p: ProfileData) => {
      setForm({
        ...p,
        skills: p.skills || [],
        education: (p.education && p.education.length > 0)
          ? p.education.map((e: EducationEntry) => ({ ...emptyEducation, ...e }))
          : [{ ...emptyEducation }],
        work_experience: (p.work_experience && p.work_experience.length > 0)
          ? p.work_experience.map((w: WorkExperienceEntry) => ({ ...emptyWork, ...w }))
          : [{ ...emptyWork }],
      });
    },
    []
  );

  if (profile && !form) {
    initForm(profile as ProfileData);
  }

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
    if (form.skills.includes(val)) {
      setSkillInput('');
      return;
    }
    setForm({ ...form, skills: [...form.skills, val] });
    setSkillInput('');
  };

  const removeSkill = (skill: string) => {
    if (!form) return;
    setForm({ ...form, skills: form.skills.filter((s) => s !== skill) });
  };

  const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill();
    }
  };

  const updateMutation = useMutation({
    mutationFn: (body: Record<string, unknown>) => profileApi.update(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => profileApi.uploadResume(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setResumeFile(null);
    },
  });

  const deleteResumeMutation = useMutation({
    mutationFn: () => profileApi.deleteResume(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['profile'] }),
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
    });
  };

  const handleResumeUpload = () => {
    if (resumeFile) {
      if (!resumeFile.name.toLowerCase().endsWith('.pdf')) {
        alert('Only PDF files are accepted');
        return;
      }
      uploadMutation.mutate(resumeFile);
    }
  };

  const cardCls = isDark
    ? 'border-slate-700 bg-slate-800'
    : 'border-gray-200 bg-white shadow-sm';
  const inputCls = `w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100'
      : 'border-gray-300 bg-white text-gray-900'
  }`;
  const labelCls = `block text-sm font-medium mb-1 ${isDark ? 'text-slate-300' : 'text-gray-700'}`;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-lg text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto text-center text-red-600 dark:text-red-400">
          Failed to load profile. Please try again.
        </div>
      </div>
    );
  }

  if (!form) return null;

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">My Profile</h1>
        <p className="text-sm opacity-75">
          {user?.firstName || user?.fullName || 'Candidate'} · Keep your profile up to date
        </p>
      </div>

      <div className="max-w-3xl space-y-6">
        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Personal Info</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Phone</label>
              <input
                type="text"
                value={form.phone || ''}
                onChange={(e) => updateForm({ phone: e.target.value })}
                className={inputCls}
                placeholder="+1 234 567 8900"
              />
            </div>
            <div>
              <label className={labelCls}>City</label>
              <input
                type="text"
                value={form.city || ''}
                onChange={(e) => updateForm({ city: e.target.value })}
                className={inputCls}
                placeholder="San Francisco"
              />
            </div>
          </div>
          <div className="mt-4">
            <label className={labelCls}>Address</label>
            <input
              type="text"
              value={form.address || ''}
              onChange={(e) => updateForm({ address: e.target.value })}
              className={inputCls}
              placeholder="123 Main St"
            />
          </div>
          <div className="mt-4">
            <label className={labelCls}>Country</label>
            <input
              type="text"
              value={form.country || ''}
              onChange={(e) => updateForm({ country: e.target.value })}
              className={inputCls}
              placeholder="United States"
            />
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Bio</h2>
          <textarea
            value={form.bio || ''}
            onChange={(e) => updateForm({ bio: e.target.value })}
            className={`${inputCls} min-h-[100px]`}
            placeholder="Tell recruiters about yourself..."
            rows={4}
          />
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Skills</h2>
          <div className="flex flex-wrap gap-2 mb-3">
            {form.skills.map((s) => (
              <span
                key={s}
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                  isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-200 text-gray-800'
                }`}
              >
                {s}
                <button
                  type="button"
                  onClick={() => removeSkill(s)}
                  className="hover:text-red-500 font-bold ml-1"
                  aria-label="Remove"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={handleSkillKeyDown}
              className={inputCls}
              placeholder="Add skill (press Enter)"
            />
            <button
              type="button"
              onClick={addSkill}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              Add
            </button>
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Experience</h2>
          <div>
            <label className={labelCls}>Years of experience</label>
            <input
              type="number"
              min={0}
              value={form.experience_years ?? ''}
              onChange={(e) =>
                updateForm({
                  experience_years: e.target.value ? parseInt(e.target.value, 10) : null,
                })
              }
              className={inputCls}
              placeholder="5"
            />
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Education</h2>
            <button
              type="button"
              onClick={addEducation}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add
            </button>
          </div>
          <div className="space-y-4">
            {form.education.map((e, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-medium">Entry {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeEducation(i)}
                    disabled={form.education.length <= 1}
                    className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Institution</label>
                    <input
                      type="text"
                      value={e.institution}
                      onChange={(ev) => updateEducation(i, { institution: ev.target.value })}
                      className={inputCls}
                      placeholder="Stanford University"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Degree</label>
                    <input
                      type="text"
                      value={e.degree}
                      onChange={(ev) => updateEducation(i, { degree: ev.target.value })}
                      className={inputCls}
                      placeholder="B.S."
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Field of study</label>
                    <input
                      type="text"
                      value={e.field_of_study}
                      onChange={(ev) => updateEducation(i, { field_of_study: ev.target.value })}
                      className={inputCls}
                      placeholder="Computer Science"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelCls}>Start year</label>
                      <input
                        type="number"
                        value={e.start_year ?? ''}
                        onChange={(ev) =>
                          updateEducation(i, {
                            start_year: ev.target.value ? parseInt(ev.target.value, 10) : null,
                          })
                        }
                        className={inputCls}
                        placeholder="2015"
                      />
                    </div>
                    <div>
                      <label className={labelCls}>End year</label>
                      <input
                        type="number"
                        value={e.end_year ?? ''}
                        onChange={(ev) =>
                          updateEducation(i, {
                            end_year: ev.target.value ? parseInt(ev.target.value, 10) : null,
                          })
                        }
                        className={inputCls}
                        placeholder="2019"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Work Experience</h2>
            <button
              type="button"
              onClick={addWork}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Add
            </button>
          </div>
          <div className="space-y-4">
            {form.work_experience.map((w, i) => (
              <div
                key={i}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between mb-3">
                  <span className="text-sm font-medium">Entry {i + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeWork(i)}
                    disabled={form.work_experience.length <= 1}
                    className="text-red-500 hover:text-red-600 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Company</label>
                    <input
                      type="text"
                      value={w.company}
                      onChange={(ev) => updateWork(i, { company: ev.target.value })}
                      className={inputCls}
                      placeholder="Acme Inc"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>Title</label>
                    <input
                      type="text"
                      value={w.title}
                      onChange={(ev) => updateWork(i, { title: ev.target.value })}
                      className={inputCls}
                      placeholder="Software Engineer"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={labelCls}>Description</label>
                  <textarea
                    value={w.description}
                    onChange={(ev) => updateWork(i, { description: ev.target.value })}
                    className={`${inputCls} min-h-[80px]`}
                    placeholder="Responsibilities and achievements..."
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className={labelCls}>Start date</label>
                    <input
                      type="text"
                      value={w.start_date}
                      onChange={(ev) => updateWork(i, { start_date: ev.target.value })}
                      className={inputCls}
                      placeholder="Jan 2020"
                    />
                  </div>
                  <div>
                    <label className={labelCls}>End date</label>
                    <input
                      type="text"
                      value={w.end_date || ''}
                      onChange={(ev) => updateWork(i, { end_date: ev.target.value || null })}
                      className={inputCls}
                      placeholder="Dec 2023"
                      disabled={w.current}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className={`flex items-center gap-2 cursor-pointer text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    <input
                      type="checkbox"
                      checked={w.current}
                      onChange={(ev) => updateWork(i, { current: ev.target.checked })}
                      className="rounded border-gray-400"
                    />
                    Currently working here
                  </label>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Links</h2>
          <div className="space-y-4">
            <div>
              <label className={labelCls}>LinkedIn</label>
              <input
                type="url"
                value={form.linkedin_url || ''}
                onChange={(e) => updateForm({ linkedin_url: e.target.value })}
                className={inputCls}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <label className={labelCls}>Portfolio</label>
              <input
                type="url"
                value={form.portfolio_url || ''}
                onChange={(e) => updateForm({ portfolio_url: e.target.value })}
                className={inputCls}
                placeholder="https://yourportfolio.com"
              />
            </div>
            <div>
              <label className={labelCls}>GitHub</label>
              <input
                type="url"
                value={form.github_url || ''}
                onChange={(e) => updateForm({ github_url: e.target.value })}
                className={inputCls}
                placeholder="https://github.com/username"
              />
            </div>
          </div>
        </section>

        <section className={`rounded-lg border p-6 ${cardCls}`}>
          <h2 className="text-lg font-semibold mb-4">Resume</h2>
          {profile?.resume_filename && (
            <p className={`text-sm mb-4 ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>
              Current: {profile.resume_filename}
            </p>
          )}
          <div className="flex flex-wrap gap-4 items-center">
            <input
              type="file"
              accept=".pdf"
              onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              className="text-sm"
            />
            <button
              type="button"
              onClick={handleResumeUpload}
              disabled={!resumeFile || uploadMutation.isPending}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </button>
            {profile?.resume_filename && (
              <button
                type="button"
                onClick={() =>
                  deleteResumeMutation.isPending ? undefined : deleteResumeMutation.mutate()
                }
                disabled={deleteResumeMutation.isPending}
                className="px-4 py-2 rounded-lg border border-red-500 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium disabled:opacity-50"
              >
                {deleteResumeMutation.isPending ? 'Removing...' : 'Delete resume'}
              </button>
            )}
          </div>
          <p className="text-xs opacity-75 mt-2">PDF only, max 5 MB</p>
        </section>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateMutation.isPending ? 'Saving...' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
