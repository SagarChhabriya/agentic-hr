import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, interviewsApi } from '../../services/api';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://hire-base.vercel.app';

function ScheduleInterviewSection({ applicationId, isDark }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [error, setError] = useState(null);
  const { data: interviewsData } = useQuery({
    queryKey: ['interviews', applicationId],
    queryFn: () => interviewsApi.listByApplication(applicationId),
    enabled: !!applicationId,
  });
  const scheduleMutation = useMutation({
    mutationFn: (body) => interviewsApi.schedule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowModal(false);
      setScheduleDateTime('');
      setError(null);
    },
    onError: (err) => {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Failed to schedule interview';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    },
  });
  const handleSchedule = (e) => {
    e.preventDefault?.();
    e.stopPropagation?.();
    setError(null);
    if (!scheduleDateTime) {
      setError('Please select a date and time.');
      return;
    }
    const dt = new Date(scheduleDateTime);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      setError('Please select a future date and time.');
      return;
    }
    scheduleMutation.mutate({
      application_id: applicationId,
      scheduled_at: dt.toISOString(),
      duration_minutes: 30,
    });
  };
  const closeModal = () => {
    setShowModal(false);
    setError(null);
    if (!scheduleMutation.isPending) setScheduleDateTime('');
  };
  const interviews = interviewsData?.interviews || [];
  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setError(null);
          setShowModal(true);
        }}
        className="px-4 py-2 rounded-lg text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
      >
        Schedule AI Interview
      </button>
      {interviews.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Scheduled interviews:</p>
          {interviews.map((i) => (
            <div key={i.id} className={`p-3 rounded border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
              <p className="text-sm">{new Date(i.scheduled_at).toLocaleString()} · {i.duration_minutes} min · {i.status}</p>
              <p className="text-xs mt-1 opacity-75">
                Candidate link: {FRONTEND_URL}/interview/room/{i.id}
              </p>
            </div>
          ))}
        </div>
      )}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40"
            onClick={closeModal}
            onKeyDown={(e) => e.key === 'Escape' && closeModal()}
            role="presentation"
            aria-hidden="true"
          />
          <div
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 rounded-lg w-full max-w-md shadow-xl ${isDark ? 'bg-slate-800 border border-slate-700' : 'bg-white border border-gray-200'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="schedule-interview-title"
          >
            <h3 id="schedule-interview-title" className="font-semibold mb-4">Schedule AI Interview</h3>
            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 text-sm">
                {error}
              </div>
            )}
            <input
              type="datetime-local"
              value={scheduleDateTime}
              onChange={(e) => { setScheduleDateTime(e.target.value); setError(null); }}
              min={new Date().toISOString().slice(0, 16)}
              className={`w-full px-3 py-2 rounded border mb-4 ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`}
              disabled={scheduleMutation.isPending}
              aria-invalid={!!error}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleSchedule}
                disabled={scheduleMutation.isPending || !scheduleDateTime}
                className="px-4 py-2 rounded bg-purple-600 text-white disabled:opacity-50 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {scheduleMutation.isPending ? 'Scheduling…' : 'Schedule'}
              </button>
              <button
                type="button"
                onClick={closeModal}
                disabled={scheduleMutation.isPending}
                className="px-4 py-2 rounded border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function RecruiterCandidateDetailPage() {
  const { id } = useParams();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: application, isLoading, error } = useQuery({
    queryKey: ['application', id],
    queryFn: () => applicationsApi.get(id),
    enabled: !!id,
  });

  const { data: assessmentResult } = useQuery({
    queryKey: ['application', id, 'assessment-result'],
    queryFn: () => applicationsApi.getAssessmentResult(id),
    enabled: !!id && !!application,
  });

  const queryClient = useQueryClient();
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');

  const { data: interviewsData } = useQuery({
    queryKey: ['interviews', id],
    queryFn: () => interviewsApi.listByApplication(id),
    enabled: !!id,
  });

  const resendMutation = useMutation({
    mutationFn: () => applicationsApi.resendAssessment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
    },
  });

  const scheduleMutation = useMutation({
    mutationFn: (body) => interviewsApi.schedule(body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', id] });
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setShowScheduleModal(false);
      setScheduleDateTime('');
    },
  });

  const handleSchedule = () => {
    if (!scheduleDateTime) return;
    const dt = new Date(scheduleDateTime);
    scheduleMutation.mutate({
      application_id: id,
      scheduled_at: dt.toISOString(),
      duration_minutes: 30,
    });
  };

  if (isLoading) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="flex justify-center py-12">Loading candidate details...</div>
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="text-center py-12">
          <p className="text-red-500 mb-4">Candidate not found or failed to load.</p>
          <Link to="/recruiter/candidates" className="text-blue-600 dark:text-blue-400 hover:underline">
            ← Back to candidates
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-8 max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link
        to="/recruiter/candidates"
        className="inline-flex items-center text-sm text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mb-6"
      >
        ← Back to candidates
      </Link>

      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h1 className="text-2xl font-bold mb-4">Candidate Details</h1>
        <div className="grid gap-4">
          <div>
            <span className="text-sm opacity-75">Name</span>
            <p className="font-medium">{application.name}</p>
          </div>
          <div>
            <span className="text-sm opacity-75">Email</span>
            <p className="font-medium">{application.email}</p>
          </div>
          <div>
            <span className="text-sm opacity-75">Job Applied</span>
            <p className="font-medium">{application.job_title}</p>
          </div>
          <div>
            <span className="text-sm opacity-75">Status</span>
            <div className="flex items-center gap-3 mt-1">
              <span className={`inline-block px-3 py-1 rounded text-sm font-medium ${
                application.status === 'selected' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : application.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                : application.status === 'interview' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400'
                : application.status === 'assessment' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
              }`}>
                {application.status}
              </span>
              {application.job_has_assessment && (
                <button
                  type="button"
                  onClick={() => resendMutation.mutate()}
                  disabled={resendMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {resendMutation.isPending ? 'Sending...' : 'Resend assessment email'}
                </button>
              )}
            </div>
          </div>
          {application.assessment_score != null && (
            <div>
              <span className="text-sm opacity-75">Assessment Score</span>
              <p className="font-medium">{application.assessment_score}%</p>
            </div>
          )}
          {application.resume_url && (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-sm opacity-75 block">Resume</span>
                <span className="text-xs opacity-60">
                  Uploaded by candidate · opens in new tab
                </span>
              </div>
              <a
                href={application.resume_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white shadow-sm hover:shadow-md transition-colors"
              >
                <span>View Resume</span>
              </a>
            </div>
          )}
          {application.cover_letter && (
            <div>
              <span className="text-sm opacity-75">Cover Letter</span>
              <p className="mt-1 text-sm whitespace-pre-wrap">{application.cover_letter}</p>
            </div>
          )}
          {application.custom_answers && Object.keys(application.custom_answers).length > 0 && (
            <div>
              <span className="text-sm opacity-75">Custom Answers</span>
              <div className="mt-2 space-y-2">
                {Object.entries(application.custom_answers).map(([k, v]) => (
                  <div key={k} className={`p-2 rounded ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                    <p className="text-xs opacity-75">{(application.custom_question_labels && application.custom_question_labels[k]) || k}</p>
                    <p className="text-sm">{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {application.candidate_profile && (
        <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Candidate Profile</h2>
          <div className="space-y-4">
            {(application.candidate_profile.phone || application.candidate_profile.address || application.candidate_profile.city || application.candidate_profile.country) && (
              <div>
                <span className="text-sm opacity-75">Contact & Location</span>
                <div className="mt-1 text-sm space-y-1">
                  {application.candidate_profile.phone && <p>Phone: {application.candidate_profile.phone}</p>}
                  {application.candidate_profile.address && <p>Address: {application.candidate_profile.address}</p>}
                  {(application.candidate_profile.city || application.candidate_profile.country) && (
                    <p>Location: {[application.candidate_profile.city, application.candidate_profile.country].filter(Boolean).join(', ')}</p>
                  )}
                </div>
              </div>
            )}
            {application.candidate_profile.bio && (
              <div>
                <span className="text-sm opacity-75">Bio</span>
                <p className="mt-1 text-sm whitespace-pre-wrap">{application.candidate_profile.bio}</p>
              </div>
            )}
            {application.candidate_profile.skills?.length > 0 && (
              <div>
                <span className="text-sm opacity-75">Skills</span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {application.candidate_profile.skills.map((s, i) => (
                    <span key={i} className={`px-2 py-1 rounded text-sm ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {application.candidate_profile.experience_years != null && (
              <div>
                <span className="text-sm opacity-75">Years of Experience</span>
                <p className="font-medium">{application.candidate_profile.experience_years}</p>
              </div>
            )}
            {application.candidate_profile.education?.length > 0 && (
              <div>
                <span className="text-sm opacity-75">Education</span>
                <div className="mt-2 space-y-2">
                  {application.candidate_profile.education.map((e, i) => (
                    <div key={i} className={`p-3 rounded ${isDark ? 'bg-slate-900' : 'bg-gray-50'}`}>
                      <p className="font-medium text-sm">{e.degree} {e.field_of_study && `in ${e.field_of_study}`}</p>
                      <p className="text-sm opacity-90">{e.institution}</p>
                      {(e.start_year || e.end_year) && (
                        <p className="text-xs opacity-75">{e.start_year || '?'} – {e.end_year || 'Present'}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {application.candidate_profile.work_experience?.length > 0 && (
              <div>
                <span className="text-sm opacity-75">Work Experience</span>
                <div className="mt-2 space-y-3">
                  {application.candidate_profile.work_experience.map((w, i) => (
                    <div key={i} className={`p-3 rounded border ${isDark ? 'border-slate-600 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}>
                      <p className="font-medium text-sm">{w.title} at {w.company}</p>
                      <p className="text-xs opacity-75">{w.start_date} – {w.current ? 'Present' : (w.end_date || 'N/A')}</p>
                      {w.description && <p className="mt-1 text-sm">{w.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {(application.candidate_profile.linkedin_url || application.candidate_profile.portfolio_url || application.candidate_profile.github_url) && (
              <div>
                <span className="text-sm opacity-75">Links</span>
                <div className="mt-1 flex flex-wrap gap-3">
                  {application.candidate_profile.linkedin_url && (
                    <a href={application.candidate_profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm">LinkedIn</a>
                  )}
                  {application.candidate_profile.portfolio_url && (
                    <a href={application.candidate_profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm">Portfolio</a>
                  )}
                  {application.candidate_profile.github_url && (
                    <a href={application.candidate_profile.github_url} target="_blank" rel="noopener noreferrer"
                      className="text-blue-600 dark:text-blue-400 hover:underline text-sm">GitHub</a>
                  )}
                </div>
              </div>
            )}
            {(application.candidate_profile.expected_salary_min != null || application.candidate_profile.expected_salary_max != null) && (
              <div>
                <span className="text-sm opacity-75">Expected Salary</span>
                <p className="font-medium">
                  {application.candidate_profile.expected_salary_min != null && application.candidate_profile.expected_salary_max != null
                    ? `${application.candidate_profile.expected_salary_min} – ${application.candidate_profile.expected_salary_max}`
                    : application.candidate_profile.expected_salary_min != null
                      ? `Min: ${application.candidate_profile.expected_salary_min}`
                      : `Max: ${application.candidate_profile.expected_salary_max}`}
                </p>
              </div>
            )}
            {application.candidate_profile.resume_score != null && (
              <div>
                <span className="text-sm opacity-75">Resume Score (AI)</span>
                <p className="font-medium">{application.candidate_profile.resume_score}%</p>
                {application.candidate_profile.resume_score_justification && (
                  <p className="mt-1 text-sm opacity-90">{application.candidate_profile.resume_score_justification}</p>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {assessmentResult?.has_attempt && (
        <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <h2 className="text-xl font-semibold mb-4">Assessment Results</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <span className="text-sm opacity-75">Correct</span>
              <p className="font-bold text-green-600">{assessmentResult.correct_count}</p>
            </div>
            <div>
              <span className="text-sm opacity-75">Wrong</span>
              <p className="font-bold text-red-600">{assessmentResult.wrong_count}</p>
            </div>
            <div>
              <span className="text-sm opacity-75">Total</span>
              <p className="font-medium">{assessmentResult.total_questions}</p>
            </div>
            <div>
              <span className="text-sm opacity-75">Score</span>
              <p className="font-bold">{assessmentResult.score_percent?.toFixed(1)}%</p>
            </div>
          </div>
          {assessmentResult.answers?.length > 0 && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">Answers</h3>
              <div className="space-y-3">
                {assessmentResult.answers.map((a, i) => (
                  <div key={i} className={`p-3 rounded border ${
                    a.is_correct ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : 'border-red-500 bg-red-50 dark:bg-red-900/20'
                  }`}>
                    <p className="font-medium text-sm">{a.question_text}</p>
                    <p className="text-xs mt-1">
                      Selected: {a.options?.[a.selected_index] ?? 'N/A'}
                      {!a.is_correct && a.options?.[a.correct_index] != null && (
                        <span className="text-green-600 dark:text-green-400 ml-2">
                          Correct: {a.options[a.correct_index]}
                        </span>
                      )}
                    </p>
                    <span className={`text-xs font-medium ${a.is_correct ? 'text-green-600' : 'text-red-600'}`}>
                      {a.is_correct ? '✓ Correct' : '✗ Wrong'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AI Interviews */}
      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">AI Interviews</h2>
        <p className="text-sm opacity-75 mb-4">
          Schedule an AI-powered video interview. The candidate will join via LiveKit; an LLM agent conducts the interview based on the job description.
        </p>
        <ScheduleInterviewSection applicationId={id} isDark={isDark} />
      </div>
    </div>
  );
}
