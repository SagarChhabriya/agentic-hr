import { useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jobsApi, applicationsApi, profileApi } from '../../services/api';
import axios from 'axios';
import { showToast } from '../../components/Toast';

type CustomQuestion = { id: string; question: string; type: string; required: boolean };
type JobData = {
  id: string;
  title: string;
  description: string;
  location: string;
  job_type?: string;
  salary?: string;
  cover_letter_required: boolean;
  custom_questions: CustomQuestion[];
  required_skills?: string[];
};

// ---------- Step indicator ----------
function StepIndicator({ step }: { step: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {[1, 2].map(n => (
        <div key={n} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
            step === n
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : step > n
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-200 dark:border-slate-600 text-gray-400 dark:text-slate-500 bg-white dark:bg-slate-800'
          }`}>
            {step > n
              ? <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              : n
            }
          </div>
          <span className={`text-xs font-medium hidden sm:inline ${step >= n ? 'text-gray-900 dark:text-slate-100' : 'text-gray-400 dark:text-slate-500'}`}>
            {n === 1 ? 'Review' : 'Apply'}
          </span>
          {n < 2 && <div className={`h-0.5 w-8 ${step > n ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

// ---------- Custom question input ----------
function CustomQuestionInput({ q, value, onChange }: { q: CustomQuestion; value: string; onChange: (val: string) => void }) {
  const cls = 'w-full px-3 py-2.5 text-sm rounded-lg border bg-white dark:bg-slate-800 border-gray-300 dark:border-slate-600 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent';
  if (q.type === 'TEXTAREA') {
    return <textarea value={value} onChange={e => onChange(e.target.value)} placeholder="Your answer…" required={q.required} rows={3} className={cls} />;
  }
  if (q.type === 'NUMBER') {
    return <input type="number" value={value} onChange={e => onChange(e.target.value)} placeholder="0" required={q.required} className={cls} />;
  }
  if (q.type === 'YES_NO') {
    return (
      <select value={value} onChange={e => onChange(e.target.value)} required={q.required} className={cls}>
        <option value="">Select…</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    );
  }
  return <input type="text" value={value} onChange={e => onChange(e.target.value)} placeholder="Your answer…" required={q.required} className={cls} />;
}

export default function ApplyJobPage() {
  const { user } = useUser();
  const params = useParams<{ job_id?: string; id?: string }>();
  const job_id = params.job_id ?? params.id;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [coverLetter, setCoverLetter] = useState('');
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});

  const { data: job, isLoading: jobLoading, error: jobError } = useQuery({
    queryKey: ['job-apply-data', job_id],
    queryFn: () => jobsApi.getApplyData(job_id!),
    enabled: !!job_id,
  });

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: profileApi.get,
    enabled: !!user?.id,
  });

  const hasProfile = profile && (profile.phone || profile.bio || (profile.skills && profile.skills.length > 0));
  const hasResume = !!profile?.resume_url;

  const applyMutation = useMutation({
    mutationFn: (body: { job_id: string; cover_letter?: string; custom_answers?: Record<string, string> }) =>
      applicationsApi.apply(body),
  });

  const updateAnswer = useCallback((questionId: string, value: string) => {
    setCustomAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    showToast('Submitting application…', 'info');
    if (!job_id || !job) return;
    const jobData = job as JobData;
    const cover = jobData.cover_letter_required ? coverLetter : (coverLetter || undefined);
    applyMutation.mutate(
      { job_id, cover_letter: cover, custom_answers: Object.keys(customAnswers).length ? customAnswers : undefined },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
          showToast(`Application submitted for ${jobData.title}`, 'success');
          navigate('/candidate/applications', { state: { message: `Application submitted for ${jobData.title}!` } });
        },
        onError: (err) => {
          if (axios.isAxiosError(err) && err.response?.status === 409) {
            applyMutation.reset();
            showToast('You have already applied to this job.', 'warning');
            return;
          }
          const msg = axios.isAxiosError(err) && err.response?.data?.detail
            ? String(err.response.data.detail)
            : 'Could not submit application.';
          showToast(msg, 'error');
        },
      }
    );
  };

  // ---------- Loading state ----------
  if (jobLoading || profileLoading || !job_id) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ---------- Error states ----------
  if (jobError || !job) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 text-center">
        <p className="text-sm text-red-500 mb-3">Job not found or no longer available.</p>
        <button onClick={() => { showToast('Going back', 'info'); navigate(-1); }} className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Go back</button>
      </div>
    );
  }

  if (!hasProfile) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-1">Complete your profile first</h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            Add your phone number, bio, and at least one skill to start applying.
          </p>
          <Link to="/candidate/profile" onClick={() => showToast('Opening profile', 'info')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
            Set up profile →
          </Link>
        </div>
      </div>
    );
  }

  if (!hasResume) {
    return (
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 p-6">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center mb-4">
            <svg className="w-5 h-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
            </svg>
          </div>
          <h2 className="text-base font-semibold text-amber-800 dark:text-amber-200 mb-1">Resume required</h2>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
            Upload a PDF resume to your profile before applying.
          </p>
          <Link to="/candidate/profile" onClick={() => showToast('Opening profile', 'info')} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium">
            Upload resume →
          </Link>
        </div>
      </div>
    );
  }

  const jobData = job as JobData;
  const is409 = axios.isAxiosError(applyMutation.error) && applyMutation.error.response?.status === 409;
  const skills = (jobData.required_skills || []).slice(0, 5);
  const resumeFilename = profile?.resume_url?.split('/').pop() || 'Resume uploaded';

  // ========================== STEP 1 ==========================
  if (step === 1) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        <Link to={`/jobs/${job_id}`} onClick={() => showToast('Opening job details', 'info')} className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-5 transition-colors">
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
          Back to job
        </Link>

        <StepIndicator step={1} />

        <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100 mb-1">Review before applying</h1>
        <p className="text-sm text-gray-500 dark:text-slate-400 mb-6">Confirm your profile looks good and review the job details.</p>

        {/* Job summary */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden mb-4 shadow-sm">
          <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-slate-100">{jobData.title}</h2>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{jobData.location}</p>
              </div>
              {jobData.salary && (
                <span className="shrink-0 text-xs font-medium text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700 px-2 py-1 rounded-lg">
                  {jobData.salary}
                </span>
              )}
            </div>
            {skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {skills.map(s => (
                  <span key={s} className="px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/50">
                    {s}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Profile summary */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 mb-4 shadow-sm">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-3">Your Profile</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-xs text-gray-700 dark:text-slate-300 font-medium">{user?.fullName || user?.firstName || 'You'}</span>
              </div>
              <span className="text-xs text-gray-400 dark:text-slate-500">{user?.primaryEmailAddress?.emailAddress}</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-3.5 h-3.5 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <span className="text-xs text-gray-700 dark:text-slate-300 truncate">{resumeFilename}</span>
            </div>
            {profile?.skills?.length > 0 && (
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-emerald-500 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <span className="text-xs text-gray-500 dark:text-slate-400">{profile.skills.slice(0, 4).join(', ')}{profile.skills.length > 4 ? ` +${profile.skills.length - 4}` : ''}</span>
              </div>
            )}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-700">
            <Link to="/candidate/profile" onClick={() => showToast('Opening profile', 'info')} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">
              Edit profile →
            </Link>
          </div>
        </div>

        {/* What to expect */}
        <div className="rounded-xl border border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-800/50 p-4 mb-6">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">What to expect</h3>
          <ul className="space-y-1.5">
            {[
              jobData.cover_letter_required ? 'Cover letter required' : 'Cover letter optional',
              jobData.custom_questions?.length > 0 ? `${jobData.custom_questions.length} screening question${jobData.custom_questions.length > 1 ? 's' : ''}` : 'No extra questions',
              'Your resume will be shared with the recruiter',
              'You may be invited for an AI interview after review',
            ].map((item, i) => (
              <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-400">
                <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => { showToast('Continue to application form', 'info'); setStep(2); }}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white transition-all shadow-sm hover:shadow-md text-sm">
            Continue to Application
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>
          </button>
          <button onClick={() => { showToast('Cancelled', 'info'); navigate(-1); }}
            className="px-4 py-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ========================== STEP 2 ==========================
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button onClick={() => { showToast('Back to review', 'info'); setStep(1); }} className="inline-flex items-center gap-1 text-xs text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 mb-5 transition-colors">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
        Back to review
      </button>

      <StepIndicator step={2} />

      <div className="flex items-start gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-slate-100">Apply: {jobData.title}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{jobData.location}</p>
        </div>
      </div>

      {is409 && (
        <div className="mb-5 rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/10 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          You have already applied to this job.
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Cover letter */}
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
          <label htmlFor="cover_letter" className="block text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-2">
            Cover Letter {jobData.cover_letter_required ? <span className="text-red-400 normal-case tracking-normal">*required</span> : <span className="font-normal normal-case tracking-normal">(optional)</span>}
          </label>
          <textarea
            id="cover_letter"
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            rows={5}
            required={jobData.cover_letter_required}
            placeholder="Introduce yourself and explain why you're a great fit for this role…"
            className="w-full px-3 py-2.5 text-sm rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-900 dark:text-slate-100 placeholder:text-gray-400 dark:placeholder:text-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          />
        </div>

        {/* Custom questions */}
        {jobData.custom_questions?.length > 0 && (
          <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-4 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-slate-400 mb-4">
              Screening Questions
            </p>
            <div className="space-y-4">
              {jobData.custom_questions.map(q => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1.5">
                    {q.question} {q.required && <span className="text-red-400 text-xs">*</span>}
                  </label>
                  <CustomQuestionInput q={q} value={customAnswers[q.id] ?? ''} onChange={v => updateAnswer(q.id, v)} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error */}
        {applyMutation.isError && !is409 && (
          <div className="rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-300">
            Something went wrong. Please try again.
          </div>
        )}

        {/* Submit */}
        <div className="flex gap-3 pt-1">
          <button type="submit" disabled={applyMutation.isPending}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white disabled:opacity-50 transition-all shadow-sm hover:shadow-md">
            {applyMutation.isPending ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Submitting…
              </>
            ) : (
              <>
                Submit Application
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
                </svg>
              </>
            )}
          </button>
          <button type="button" onClick={() => { showToast('Back to review', 'info'); setStep(1); }}
            className="px-4 py-3 rounded-lg text-sm font-medium border border-gray-200 dark:border-slate-600 text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
