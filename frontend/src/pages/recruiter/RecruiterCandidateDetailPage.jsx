import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, interviewsApi } from '../../services/api';

// ---------------------------------------------------------------------------
// Interview Result Panel — transcript + AI summary for a completed session
// ---------------------------------------------------------------------------
function InterviewResultPanel({ interviews, application, isDark }) {
  const [showTranscript, setShowTranscript] = useState(false);
  const completedInterview = interviews?.find(
    (i) => (i.status === 'completed' || i.status === 'no_show') && i.session
  );
  if (!completedInterview) return null;

  const session = completedInterview.session;
  const isNoShow = completedInterview.status === 'no_show';
  const transcript = session.chat_transcript || [];
  const summary = session.llm_summary || '';
  const score = application?.interview_score;

  const cardCls = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white';
  const innerCls = isDark ? 'border-slate-600 bg-slate-900/50' : 'border-gray-200 bg-gray-50';

  const scoreColor =
    score == null ? 'text-gray-500'
    : score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 50 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';

  const scoreBg =
    score == null ? ''
    : score >= 75 ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    : score >= 50 ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';

  return (
    <div className={`rounded-lg border p-6 mb-6 ${cardCls}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">AI Interview Results</h2>
        {isNoShow && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
            No Show
          </span>
        )}
      </div>

      {isNoShow ? (
        <p className="text-sm opacity-75">The candidate did not complete the interview (fewer than 3 responses recorded).</p>
      ) : (
        <>
          {/* Score + Recommendation */}
          {score != null && (
            <div className={`flex items-center gap-4 p-4 rounded-lg border mb-4 ${scoreBg}`}>
              <div className="text-center">
                <p className="text-xs opacity-75 mb-1">Interview Score</p>
                <p className={`text-3xl font-bold ${scoreColor}`}>{score}</p>
                <p className="text-xs opacity-60">/ 100</p>
              </div>
              <div className="flex-1 text-sm opacity-90 leading-relaxed whitespace-pre-wrap">
                {summary}
              </div>
            </div>
          )}
          {score == null && summary && (
            <div className={`p-4 rounded-lg border mb-4 ${innerCls}`}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {/* Transcript toggle */}
          {transcript.length > 0 && (
            <div>
              <button
                type="button"
                onClick={() => setShowTranscript((v) => !v)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:underline mb-3"
              >
                <span>{showTranscript ? '▲ Hide' : '▼ Show'} transcript</span>
                <span className="opacity-60">({transcript.length} messages)</span>
              </button>
              {showTranscript && (
                <div className={`rounded-lg border p-4 space-y-3 max-h-96 overflow-y-auto ${innerCls}`}>
                  {transcript.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex gap-3 ${msg.role === 'agent' ? 'flex-row' : 'flex-row-reverse'}`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-white ${
                          msg.role === 'agent' ? 'bg-purple-600' : 'bg-blue-600'
                        }`}
                      >
                        {msg.role === 'agent' ? 'AI' : 'C'}
                      </div>
                      <div
                        className={`max-w-[75%] px-3 py-2 rounded-lg text-sm ${
                          msg.role === 'agent'
                            ? isDark ? 'bg-slate-700' : 'bg-white border border-gray-200'
                            : isDark ? 'bg-blue-900/40' : 'bg-blue-50 border border-blue-100'
                        }`}
                      >
                        <p>{msg.text}</p>
                        <p className="text-xs opacity-50 mt-1">
                          {msg.timestamp ? new Date(msg.timestamp).toLocaleTimeString() : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Candidate Rating Panel — combined score + hire recommendation
// ---------------------------------------------------------------------------
function CandidateRatingPanel({ application, assessmentResult, isDark }) {
  const assessScore = application?.assessment_score ?? assessmentResult?.score_percent ?? null;
  const interviewScore = application?.interview_score ?? null;

  if (assessScore == null && interviewScore == null) return null;

  const scores = [assessScore, interviewScore].filter((s) => s != null);
  const combined = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;

  const recommendation =
    combined == null ? null
    : combined >= 75 ? { label: 'Recommended — Hire', color: 'emerald' }
    : combined >= 55 ? { label: 'Borderline — Review', color: 'amber' }
    : { label: 'Not Recommended', color: 'red' };

  const colorMap = {
    emerald: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    amber: 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-300 dark:border-red-700',
  };
  const barColor = {
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  const cardCls = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white';

  return (
    <div className={`rounded-lg border p-6 mb-6 ${cardCls}`}>
      <h2 className="text-xl font-semibold mb-4">Candidate Rating</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        {assessScore != null && (
          <ScoreCard label="Assessment" score={Math.round(assessScore)} isDark={isDark} />
        )}
        {interviewScore != null && (
          <ScoreCard label="AI Interview" score={interviewScore} isDark={isDark} />
        )}
        {combined != null && (
          <ScoreCard label="Combined" score={combined} isDark={isDark} highlight />
        )}
      </div>
      {combined != null && (
        <div className="mb-4">
          <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
            <div
              className={`h-2 rounded-full transition-all ${barColor[recommendation.color]}`}
              style={{ width: `${combined}%` }}
            />
          </div>
        </div>
      )}
      {recommendation && (
        <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold border ${colorMap[recommendation.color]}`}>
          {recommendation.label}
        </span>
      )}
    </div>
  );
}

function ScoreCard({ label, score, isDark, highlight }) {
  const bg = highlight
    ? isDark ? 'bg-slate-700' : 'bg-gray-100'
    : isDark ? 'bg-slate-900/50' : 'bg-gray-50';
  const scoreColor =
    score >= 75 ? 'text-emerald-600 dark:text-emerald-400'
    : score >= 55 ? 'text-amber-600 dark:text-amber-400'
    : 'text-red-600 dark:text-red-400';
  return (
    <div className={`rounded-lg p-4 text-center border ${bg} ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
      <p className="text-xs opacity-60 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${scoreColor}`}>{score}</p>
      <p className="text-xs opacity-50">/ 100</p>
    </div>
  );
}

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || 'https://hire-base.vercel.app';

/** Placeholder readiness for in-person (assessment + interview); backend can replace with real score later. */
function getReadyForInPersonLabel(application, assessmentResult) {
  const assessmentScore = application.assessment_score ?? assessmentResult?.score_percent;
  const interviewScore = application.interview_score;
  if (assessmentScore != null && interviewScore != null) {
    const combined = Math.round((Number(assessmentScore) + Number(interviewScore)) / 2);
    return combined >= 60 ? { label: 'Recommended for in-person', score: combined } : { label: 'Review before inviting', score: combined };
  }
  if (assessmentScore != null) return { label: 'Assessment done — invite after AI interview', score: Number(assessmentScore) };
  return { label: 'Complete assessment and AI interview first', score: null };
}

function HiringNextStepsSection({ application, applicationId, assessmentResult, isDark, queryClient }) {
  const [inPersonDateTime, setInPersonDateTime] = useState('');
  const [inPersonNotes, setInPersonNotes] = useState('');
  const [showOfferConfirm, setShowOfferConfirm] = useState(false);
  const [message, setMessage] = useState(null); // success or backend-not-ready

  const updateStatusMutation = useMutation({
    mutationFn: (status) => applicationsApi.updateStatus(applicationId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setMessage({ type: 'success', text: 'Candidate marked as invited for in-person.' });
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err) => {
      setMessage({ type: 'error', text: err?.response?.data?.detail ?? err?.message ?? 'Update failed' });
    },
  });

  const scheduleInPersonMutation = useMutation({
    mutationFn: (body) => applicationsApi.scheduleInPerson(applicationId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setMessage({ type: 'success', text: 'In-person interview scheduled; candidate will be notified.' });
      setInPersonDateTime('');
      setInPersonNotes('');
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err) => {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        setMessage({ type: 'info', text: 'In-person scheduling will be available once the backend is connected.' });
      } else {
        setMessage({ type: 'error', text: err?.response?.data?.detail ?? err?.message ?? 'Scheduling failed' });
      }
    },
  });

  const sendOfferMutation = useMutation({
    mutationFn: () => applicationsApi.sendOfferLetter(applicationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowOfferConfirm(false);
      setMessage({ type: 'success', text: 'Offer letter sent to candidate.' });
      setTimeout(() => setMessage(null), 4000);
    },
    onError: (err) => {
      const status = err?.response?.status;
      if (status === 404 || status === 501) {
        setMessage({ type: 'info', text: 'Offer letter feature will be available once the backend is set up.' });
      } else {
        setMessage({ type: 'error', text: err?.response?.data?.detail ?? err?.message ?? 'Failed to send offer' });
      }
      setShowOfferConfirm(false);
    },
  });

  const readiness = getReadyForInPersonLabel(application, assessmentResult);
  const showSection = application.status === 'interview' || application.status === 'selected';
  if (!showSection) return null;

  const handleScheduleInPerson = (e) => {
    e.preventDefault();
    if (!inPersonDateTime) {
      setMessage({ type: 'error', text: 'Please select a date and time.' });
      return;
    }
    const dt = new Date(inPersonDateTime);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      setMessage({ type: 'error', text: 'Please select a future date and time.' });
      return;
    }
    setMessage(null);
    scheduleInPersonMutation.mutate({ scheduled_at: inPersonDateTime, notes: inPersonNotes || undefined });
  };

  const borderCls = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white';
  const inputCls = `w-full px-3 py-2 rounded border ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`;

  return (
    <div className={`rounded-lg border p-6 mb-6 ${borderCls}`}>
      <h2 className="text-xl font-semibold mb-2">Hiring next steps</h2>
      <p className="text-sm opacity-75 mb-6">
        Rate for in-person, schedule an on-site interview, or send an offer letter.
      </p>

      {message && (
        <div className={`mb-4 p-3 rounded-lg text-sm ${
          message.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
          : message.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* 1. Rate for in-person */}
      <div className={`p-4 rounded-lg border mb-4 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
        <h3 className="font-medium mb-2">Rate for in-person interview</h3>
        <p className="text-sm opacity-80 mb-2">{readiness.label}</p>
        {readiness.score != null && (
          <p className="text-sm font-medium mb-3">Combined score: {readiness.score}%</p>
        )}
        {application.status === 'interview' && (
          <button
            type="button"
            onClick={() => updateStatusMutation.mutate('selected')}
            disabled={updateStatusMutation.isPending}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
          >
            {updateStatusMutation.isPending ? 'Updating…' : 'Invite for in-person'}
          </button>
        )}
        {application.status === 'selected' && (
          <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">Invited for in-person</span>
        )}
      </div>

      {/* 2. Schedule in-person (when selected) */}
      {application.status === 'selected' && (
        <div className={`p-4 rounded-lg border mb-4 ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className="font-medium mb-2">Schedule in-person interview</h3>
          {application.in_person_scheduled_at && (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-2">
              Scheduled for {new Date(application.in_person_scheduled_at).toLocaleString()}
              {application.in_person_notes && ` · ${application.in_person_notes}`}
            </p>
          )}
          <p className="text-sm opacity-80 mb-3">Pick a date and time; the candidate will be notified by email.</p>
          <form onSubmit={handleScheduleInPerson} className="space-y-3">
            <input
              type="datetime-local"
              value={inPersonDateTime}
              onChange={(e) => setInPersonDateTime(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              className={inputCls}
              disabled={scheduleInPersonMutation.isPending}
            />
            <textarea
              placeholder="Optional notes (e.g. location, format)"
              value={inPersonNotes}
              onChange={(e) => setInPersonNotes(e.target.value)}
              rows={2}
              className={inputCls}
              disabled={scheduleInPersonMutation.isPending}
            />
            <button
              type="submit"
              disabled={scheduleInPersonMutation.isPending || !inPersonDateTime}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            >
              {scheduleInPersonMutation.isPending ? 'Scheduling…' : application.in_person_scheduled_at ? 'Reschedule in-person & notify' : 'Schedule in-person & notify'}
            </button>
          </form>
        </div>
      )}

      {/* 3. Offer letter */}
      {application.status === 'selected' && (
        <div className={`p-4 rounded-lg border ${isDark ? 'border-slate-600 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
          <h3 className="font-medium mb-2">Offer letter</h3>
          {application.offer_sent_at ? (
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
              Offer sent on {new Date(application.offer_sent_at).toLocaleString()}
            </p>
          ) : (
            <>
              <p className="text-sm opacity-80 mb-3">Send an offer letter to the candidate by email.</p>
              <button
                type="button"
                onClick={() => setShowOfferConfirm(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
              >
                Send offer letter
              </button>
            </>
          )}
        </div>
      )}

      {showOfferConfirm && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowOfferConfirm(false)} aria-hidden="true" />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 rounded-lg w-full max-w-md shadow-xl ${borderCls}`}>
            <h3 className="font-semibold mb-2">Send offer letter?</h3>
            <p className="text-sm opacity-80 mb-4">An offer letter will be sent to {application.email}.</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => sendOfferMutation.mutate()}
                disabled={sendOfferMutation.isPending}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                {sendOfferMutation.isPending ? 'Sending…' : 'Send'}
              </button>
              <button
                type="button"
                onClick={() => !sendOfferMutation.isPending && setShowOfferConfirm(false)}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
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

function ScheduleInterviewSection({ applicationId, isDark }) {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [scheduleDateTime, setScheduleDateTime] = useState('');
  const [error, setError] = useState(null);
  const [editingInterviewId, setEditingInterviewId] = useState(null);
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
      setEditingInterviewId(null);
    },
    onError: (err) => {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Failed to schedule interview';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    },
  });
  const rescheduleMutation = useMutation({
    mutationFn: ({ interviewId, scheduled_at, duration_minutes }) =>
      interviewsApi.reschedule(interviewId, { scheduled_at, duration_minutes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setShowModal(false);
      setScheduleDateTime('');
      setError(null);
      setEditingInterviewId(null);
    },
    onError: (err) => {
      const message = err?.response?.data?.detail ?? err?.message ?? 'Failed to reschedule interview';
      setError(Array.isArray(message) ? message.join(', ') : String(message));
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (interviewId) => interviewsApi.cancel(interviewId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['interviews', applicationId] });
      queryClient.invalidateQueries({ queryKey: ['application', applicationId] });
      setEditingInterviewId(null);
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
    if (editingInterviewId) {
      rescheduleMutation.mutate({
        interviewId: editingInterviewId,
        scheduled_at: scheduleDateTime,
        duration_minutes: 30,
      });
    } else {
      scheduleMutation.mutate({
        application_id: applicationId,
        // Send raw datetime-local string; backend normalizes safely
        scheduled_at: scheduleDateTime,
        duration_minutes: 30,
      });
    }
  };
  const closeModal = () => {
    setShowModal(false);
    setError(null);
    setEditingInterviewId(null);
    if (!scheduleMutation.isPending && !rescheduleMutation.isPending) setScheduleDateTime('');
  };
  const interviews = interviewsData?.interviews || [];
  const hasScheduled = interviews.some((i) => i.status === 'scheduled');
  return (
    <div>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (hasScheduled) return;
          setError(null);
          setEditingInterviewId(null);
          setScheduleDateTime('');
          setShowModal(true);
        }}
        disabled={hasScheduled}
        className={`px-4 py-2 rounded-lg text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
          hasScheduled
            ? 'bg-purple-400 cursor-not-allowed opacity-70'
            : 'bg-purple-600 hover:bg-purple-700 focus:ring-purple-500'
        }`}
      >
        {hasScheduled ? 'Interview Scheduled' : 'Schedule AI Interview'}
      </button>
      {interviews.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-sm font-medium">Scheduled interviews:</p>
          {interviews.map((i) => (
            <div key={i.id} className={`p-3 rounded border ${isDark ? 'border-slate-600' : 'border-gray-200'}`}>
              <p className="text-sm">
                {new Date(i.scheduled_at).toLocaleString()} · {i.duration_minutes} min · {i.status}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Candidate link: {FRONTEND_URL}/interview/room/{i.id}
              </p>
              {i.status === 'scheduled' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInterviewId(i.id);
                      try {
                        const iso = new Date(i.scheduled_at).toISOString().slice(0, 16);
                        setScheduleDateTime(iso);
                      } catch {
                        setScheduleDateTime('');
                      }
                      setError(null);
                      setShowModal(true);
                    }}
                    className="px-3 py-1.5 rounded-md text-xs font-medium bg-purple-600 hover:bg-purple-700 text-white"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => cancelMutation.mutate(i.id)}
                    disabled={cancelMutation.isPending}
                    className="px-3 py-1.5 rounded-md text-xs font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-100 dark:hover:bg-slate-700"
                  >
                    {cancelMutation.isPending ? 'Cancelling…' : 'Cancel'}
                  </button>
                </div>
              )}
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
    scheduleMutation.mutate({
      application_id: id,
      // Send raw datetime-local string; backend normalizes safely
      scheduled_at: scheduleDateTime,
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

      {/* AI Interviews — schedule */}
      <div className={`rounded-lg border p-6 mb-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <h2 className="text-xl font-semibold mb-4">AI Interviews</h2>
        <p className="text-sm opacity-75 mb-4">
          Schedule an AI-powered video interview. The candidate will join via LiveKit; an LLM agent conducts the interview based on the job description.
        </p>
        <ScheduleInterviewSection applicationId={id} isDark={isDark} />
      </div>

      {/* Interview Results — transcript + AI summary (shown after completion) */}
      <InterviewResultPanel
        interviews={interviewsData?.interviews}
        application={application}
        isDark={isDark}
      />

      {/* Candidate Rating — combined score + hire recommendation */}
      <CandidateRatingPanel
        application={application}
        assessmentResult={assessmentResult}
        isDark={isDark}
      />

      {/* Hiring next steps: rate for in-person, schedule in-person, offer letter */}
      <HiringNextStepsSection application={application} applicationId={id} assessmentResult={assessmentResult} isDark={isDark} queryClient={queryClient} />
    </div>
  );
}
