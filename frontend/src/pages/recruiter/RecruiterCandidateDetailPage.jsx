import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, interviewsApi } from '../../services/api';
import {
  datetimeLocalToKarachiIso,
  formatDateTimeKarachi,
  formatTimeKarachi,
  minDatetimeLocalKarachiNow,
  utcIsoToDatetimeLocalKarachi,
} from '../../lib/datetimeKarachi';

// ---------------------------------------------------------------------------
// Recording video player (modal)
// ---------------------------------------------------------------------------
function RecordingPlayer({ interviewId, isDark }) {
  const [signedUrl, setSignedUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      setSignedUrl(null);
      try {
        const data = await interviewsApi.getRecordingSignedUrl(interviewId);
        const url = data?.signed_url ?? data?.signedUrl;
        if (cancelled) return;
        if (url) setSignedUrl(url);
        else setError('No playback URL returned from server.');
      } catch (err) {
        if (!cancelled) {
          setError(err?.response?.data?.detail ?? err?.message ?? 'Failed to load recording');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [interviewId]);

  if (loading) {
    return (
      <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        Loading recording…
      </div>
    );
  }
  if (error) {
    return <p className="text-xs text-red-500">{error}</p>;
  }
  if (!signedUrl) {
    return <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Could not load video URL.</p>;
  }

  return (
    <div className="w-full min-w-0">
      <video
        src={signedUrl}
        controls
        playsInline
        className={`w-full rounded-lg border bg-black aspect-video max-h-[min(420px,50vh)] ${
          isDark ? 'border-slate-600' : 'border-gray-200'
        }`}
        preload="metadata"
      />
      <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
        Candidate camera + audio (WebM). Link refreshes if you reload the page.
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Interview Result Panel — transcript + AI summary for a completed session
// ---------------------------------------------------------------------------
function InterviewResultPanel({ interviews, application, isDark }) {
  const [showTranscript, setShowTranscript] = useState(true);
  const completedInterview = interviews?.find((i) => {
    if (!i.session) return false;
    if (i.status === 'completed' || i.status === 'no_show') return true;
    if (i.status === 'scheduled' && i.session.video_url) return true;
    return false;
  });
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
    <div className={`rounded-xl border p-5 mb-5 ${cardCls}`}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>AI Interview Results</h2>
        {isNoShow && (
          <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-300">
            No Show
          </span>
        )}
      </div>

      {/* Recording — inline video when storage path exists */}
      <div className={`p-3 rounded-lg border mb-4 space-y-3 ${isDark ? 'border-slate-600 bg-slate-900/40' : 'border-gray-200 bg-gray-50'}`}>
        <div className="flex items-start gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-violet-900/40' : 'bg-violet-100'}`}>
            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.361a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
              {session.video_url ? 'Interview recording' : 'No recording file'}
            </p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              {session.video_url
                ? 'Plays below (served via a short-lived signed URL from storage).'
                : 'The candidate may not have uploaded a recording, or storage is not configured.'}
            </p>
          </div>
        </div>
        {session.video_url ? <RecordingPlayer interviewId={completedInterview.id} isDark={isDark} /> : null}
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
                          {msg.timestamp ? formatTimeKarachi(msg.timestamp) : ''}
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
    : combined >= 75 ? { label: 'Recommended (Hire)', color: 'emerald' }
    : combined >= 55 ? { label: 'Borderline (Review)', color: 'amber' }
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
    <div className={`rounded-xl border p-5 mb-5 ${cardCls}`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Candidate Rating</h2>
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
function getReadyForInPersonLabel(application, assessmentResult, interviews) {
  const assessmentScore = application.assessment_score ?? assessmentResult?.score_percent;
  const interviewScore = application.interview_score;
  const hasAiInterviewDone = (interviews || []).some(
    (i) => i.status === 'completed' || i.status === 'no_show' || Boolean(i.session?.video_url)
  );
  if (assessmentScore != null && interviewScore != null) {
    const combined = Math.round((Number(assessmentScore) + Number(interviewScore)) / 2);
    return combined >= 60 ? { label: 'Recommended for in-person', score: combined } : { label: 'Review before inviting', score: combined };
  }
  if (assessmentScore != null && hasAiInterviewDone && interviewScore == null) {
    return {
      label: 'AI interview complete. Review recording and summary below (score may appear after agent sync).',
      score: Number(assessmentScore),
    };
  }
  if (assessmentScore != null) return { label: 'Assessment done, invite after AI interview', score: Number(assessmentScore) };
  return { label: 'Complete assessment and AI interview first', score: null };
}

function HiringNextStepsSection({ application, applicationId, assessmentResult, interviews, isDark, queryClient }) {
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

  const readiness = getReadyForInPersonLabel(application, assessmentResult, interviews);
  const showSection = application.status === 'interview' || application.status === 'selected';
  if (!showSection) return null;

  const handleScheduleInPerson = (e) => {
    e.preventDefault();
    if (!inPersonDateTime) {
      setMessage({ type: 'error', text: 'Please select a date and time.' });
      return;
    }
    const iso = datetimeLocalToKarachiIso(inPersonDateTime);
    const dt = new Date(iso);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      setMessage({ type: 'error', text: 'Please select a future date and time.' });
      return;
    }
    setMessage(null);
    scheduleInPersonMutation.mutate({ scheduled_at: iso, notes: inPersonNotes || undefined });
  };

  const borderCls = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white';
  const inputCls = `w-full px-3 py-2 rounded border ${isDark ? 'bg-slate-900 border-slate-600 text-slate-100' : 'bg-white border-gray-300 text-gray-900'}`;

  return (
    <div className={`rounded-xl border p-5 mb-5 ${borderCls}`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Hiring Next Steps</h2>
      <p className={`text-xs mb-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
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
              Scheduled for {formatDateTimeKarachi(application.in_person_scheduled_at)}
              {application.in_person_notes && ` · ${application.in_person_notes}`}
            </p>
          )}
          <p className="text-sm opacity-80 mb-3">Pick a date and time; the candidate will be notified by email.</p>
          <form onSubmit={handleScheduleInPerson} className="space-y-3">
            <input
              type="datetime-local"
              value={inPersonDateTime}
              onChange={(e) => setInPersonDateTime(e.target.value)}
              min={minDatetimeLocalKarachiNow()}
              title="Date and time in Asia/Karachi (PKT)"
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
              Offer sent on {formatDateTimeKarachi(application.offer_sent_at)}
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
    const iso = datetimeLocalToKarachiIso(scheduleDateTime);
    const dt = new Date(iso);
    if (isNaN(dt.getTime()) || dt <= new Date()) {
      setError('Please select a future date and time.');
      return;
    }
    if (editingInterviewId) {
      rescheduleMutation.mutate({
        interviewId: editingInterviewId,
        scheduled_at: iso,
        duration_minutes: 30,
      });
    } else {
      scheduleMutation.mutate({
        application_id: applicationId,
        scheduled_at: iso,
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
  const hasScheduled = interviews.some((i) => i.status === 'scheduled' && !i.session?.video_url);
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
                {formatDateTimeKarachi(i.scheduled_at)} · {i.duration_minutes} min ·{' '}
                {i.status === 'scheduled' && i.session?.video_url ? 'completed' : i.status}
              </p>
              <p className="text-xs mt-1 opacity-75">
                Candidate link: {FRONTEND_URL}/interview/room/{i.id}
              </p>
              {i.status === 'scheduled' && !i.session?.video_url && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingInterviewId(i.id);
                      try {
                        setScheduleDateTime(utcIsoToDatetimeLocalKarachi(i.scheduled_at));
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
              min={minDatetimeLocalKarachiNow()}
              title="Date and time in Asia/Karachi (PKT)"
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
  const [showRejectConfirm, setShowRejectConfirm] = useState(false);
  const [rejectMessage, setRejectMessage] = useState(null);

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

  const rejectMutation = useMutation({
    mutationFn: () => applicationsApi.updateStatus(id, 'rejected'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['application', id] });
      setShowRejectConfirm(false);
      setRejectMessage({ type: 'success', text: 'Candidate rejected and notified by email.' });
      setTimeout(() => setRejectMessage(null), 5000);
    },
    onError: (err) => {
      setShowRejectConfirm(false);
      setRejectMessage({ type: 'error', text: err?.response?.data?.detail ?? 'Failed to reject candidate.' });
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
    const iso = datetimeLocalToKarachiIso(scheduleDateTime);
    if (Number.isNaN(new Date(iso).getTime())) return;
    scheduleMutation.mutate({
      application_id: id,
      scheduled_at: iso,
      duration_minutes: 30,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !application) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-3 text-sm">Candidate not found or failed to load.</p>
        <Link to="/recruiter/candidates" className="text-sm text-indigo-500 hover:underline">← Back to candidates</Link>
      </div>
    );
  }

  const STATUS_STYLES = {
    applied:    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800',
    assessment: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800',
    interview:  'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800',
    selected:   'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    rejected:   'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800',
  };

  const initials = (application.name || '?').split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);
  const profile = application.candidate_profile || null;
  const cardBg = isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm';

  return (
    <div className={`max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link to="/recruiter/candidates"
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Candidates
      </Link>

      {rejectMessage && (
        <div className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
          rejectMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300'
            : 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-300'
        }`}>
          {rejectMessage.text}
        </div>
      )}

      {/* Hero profile card */}
      <div className={`rounded-xl border mb-5 overflow-hidden ${cardBg}`}>
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-violet-500 flex items-center justify-center shrink-0 shadow-md">
              <span className="text-2xl font-bold text-white">{initials}</span>
            </div>
            {/* Identity */}
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-1">
                <h1 className={`text-xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{application.name}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[application.status] || STATUS_STYLES.applied}`}>
                  {application.status}
                </span>
              </div>
              <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{application.email}</p>
              <p className={`text-sm font-medium ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                Applied for: {application.job_title}
              </p>
              {/* Profile meta chips */}
              <div className="flex flex-wrap gap-2 mt-3">
                {profile?.experience_years != null && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                    </svg>
                    {profile.experience_years} yr{profile.experience_years !== 1 ? 's' : ''} exp
                  </span>
                )}
                {(profile?.city || profile?.country) && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {[profile.city, profile.country].filter(Boolean).join(', ')}
                  </span>
                )}
                {profile?.phone && (
                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-100 text-gray-600'}`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                    </svg>
                    {profile.phone}
                  </span>
                )}
              </div>
            </div>
            {/* Actions */}
            <div className="flex flex-row sm:flex-col gap-2 sm:items-end shrink-0">
              {application.resume_url && (
                <a href={application.resume_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  </svg>
                  Resume
                </a>
              )}
              {application.job_has_assessment && (
                <button type="button" onClick={() => resendMutation.mutate()} disabled={resendMutation.isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${isDark ? 'border-amber-700 text-amber-400 hover:bg-amber-900/20' : 'border-amber-300 text-amber-700 hover:bg-amber-50'}`}>
                  {resendMutation.isPending ? 'Sending…' : 'Resend assessment'}
                </button>
              )}
              {application.status !== 'rejected' && (
                <button type="button" onClick={() => setShowRejectConfirm(true)} disabled={rejectMutation.isPending}
                  className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors disabled:opacity-50 ${isDark ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
                  Reject
                </button>
              )}
            </div>
          </div>

          {/* Social links */}
          {profile && (profile.linkedin_url || profile.portfolio_url || profile.github_url) && (
            <div className={`flex flex-wrap gap-3 mt-4 pt-4 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              {profile.linkedin_url && (
                <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0077B5] hover:underline">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              )}
              {profile.github_url && (
                <a href={profile.github_url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                  GitHub
                </a>
              )}
              {profile.portfolio_url && (
                <a href={profile.portfolio_url} target="_blank" rel="noopener noreferrer"
                  className={`inline-flex items-center gap-1.5 text-xs font-medium hover:underline ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/></svg>
                  Portfolio
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bio */}
      {profile?.bio && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>About</h2>
          <p className={`text-sm leading-6 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{profile.bio}</p>
        </div>
      )}

      {/* Skills */}
      {profile?.skills?.length > 0 && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Skills</h2>
          <div className="flex flex-wrap gap-2">
            {profile.skills.map((s, i) => (
              <span key={i} className={`px-3 py-1 rounded-full text-xs font-medium border ${isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200'}`}>
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Work Experience */}
      {profile?.work_experience?.length > 0 && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Work Experience</h2>
          <div className="space-y-4">
            {profile.work_experience.map((w, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex flex-col items-center mt-1">
                  <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-indigo-400' : 'bg-indigo-500'} shrink-0`} />
                  {i < profile.work_experience.length - 1 && (
                    <div className={`w-0.5 flex-1 mt-1 ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`} />
                  )}
                </div>
                <div className={`pb-4 flex-1 ${i < profile.work_experience.length - 1 ? '' : ''}`}>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{w.title}</p>
                  <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>{w.company}</p>
                  <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                    {w.start_date} – {w.current ? 'Present' : (w.end_date || 'N/A')}
                  </p>
                  {w.description && <p className={`text-xs mt-2 leading-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{w.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Education */}
      {profile?.education?.length > 0 && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Education</h2>
          <div className="space-y-3">
            {profile.education.map((e, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDark ? 'bg-slate-600' : 'bg-white border border-gray-200'}`}>
                  <svg className={`w-4 h-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z"/><path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                    {e.degree}{e.field_of_study ? ` in ${e.field_of_study}` : ''}
                  </p>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{e.institution}</p>
                  {(e.start_year || e.end_year) && (
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{e.start_year || '?'} – {e.end_year || 'Present'}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Salary expectation */}
      {profile && (profile.expected_salary_min != null || profile.expected_salary_max != null) && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Expected Salary</h2>
          <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {profile.expected_salary_min != null && profile.expected_salary_max != null
              ? `${profile.expected_salary_min} – ${profile.expected_salary_max}`
              : profile.expected_salary_min != null ? `From ${profile.expected_salary_min}` : `Up to ${profile.expected_salary_max}`}
          </p>
        </div>
      )}

      {/* AI Resume Score */}
      {profile?.resume_score != null && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>AI Resume Score</h2>
          <div className="flex items-center gap-4">
            <div className={`text-3xl font-bold tabular-nums ${profile.resume_score >= 70 ? 'text-emerald-500' : profile.resume_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {profile.resume_score}<span className="text-base font-medium opacity-60">%</span>
            </div>
            <div className="flex-1">
              <div className={`w-full h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                <div className={`h-2 rounded-full ${profile.resume_score >= 70 ? 'bg-emerald-500' : profile.resume_score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${profile.resume_score}%` }} />
              </div>
              {profile.resume_score_justification && (
                <p className={`text-xs mt-2 leading-5 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{profile.resume_score_justification}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cover letter / custom answers */}
      {(application.cover_letter || (application.custom_answers && Object.keys(application.custom_answers).length > 0)) && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          {application.cover_letter && (
            <>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Cover Letter</h2>
              <p className={`text-sm leading-6 whitespace-pre-wrap mb-4 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{application.cover_letter}</p>
            </>
          )}
          {application.custom_answers && Object.keys(application.custom_answers).length > 0 && (
            <>
              <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Application Questions</h2>
              <div className="space-y-3">
                {Object.entries(application.custom_answers).map(([k, v]) => (
                  <div key={k}>
                    <p className={`text-xs font-medium mb-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {(application.custom_question_labels && application.custom_question_labels[k]) || k}
                    </p>
                    <p className={`text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {assessmentResult?.has_attempt && (
        <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Assessment Results</h2>
          <div className="grid grid-cols-4 gap-3 mb-5">
            {[
              { label: 'Correct', value: assessmentResult.correct_count, color: 'text-emerald-500' },
              { label: 'Wrong', value: assessmentResult.wrong_count, color: 'text-red-500' },
              { label: 'Total', value: assessmentResult.total_questions, color: isDark ? 'text-slate-200' : 'text-gray-800' },
              { label: 'Score', value: `${assessmentResult.score_percent?.toFixed(0)}%`, color: assessmentResult.score_percent >= 70 ? 'text-emerald-500' : assessmentResult.score_percent >= 50 ? 'text-amber-500' : 'text-red-500' },
            ].map((item) => (
              <div key={item.label} className={`text-center p-3 rounded-lg ${isDark ? 'bg-slate-700/40' : 'bg-gray-50'}`}>
                <p className={`text-xl font-bold tabular-nums ${item.color}`}>{item.value}</p>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{item.label}</p>
              </div>
            ))}
          </div>
          {assessmentResult.answers?.length > 0 && (
            <div className="space-y-2">
              {assessmentResult.answers.map((a, i) => (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                  a.is_correct
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800/50 dark:bg-emerald-900/10'
                    : 'border-red-200 bg-red-50 dark:border-red-800/50 dark:bg-red-900/10'
                }`}>
                  <span className={`mt-0.5 shrink-0 text-xs font-bold ${a.is_correct ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {a.is_correct ? '✓' : '✗'}
                  </span>
                  <div className="min-w-0">
                    <p className={`text-xs font-medium ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{a.question_text}</p>
                    <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      Selected: <span className="font-medium">{a.options?.[a.selected_index] ?? 'N/A'}</span>
                      {!a.is_correct && a.options?.[a.correct_index] != null && (
                        <span className="text-emerald-600 dark:text-emerald-400 ml-2">
                          · Correct: <span className="font-medium">{a.options[a.correct_index]}</span>
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* AI Interviews — only shown when no completed interview and candidate is not rejected */}
      {(() => {
        const interviews = interviewsData?.interviews || [];
        const hasCompletedLike = interviews.some(
          (i) =>
            i.status === 'completed' ||
            i.status === 'no_show' ||
            Boolean(i.session?.video_url)
        );
        if (hasCompletedLike || application.status === 'rejected') return null;
        return (
          <div className={`rounded-xl border p-5 mb-5 ${cardBg}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>AI Interview</h2>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              Schedule a video interview conducted by an AI agent. The candidate joins via a private link.
            </p>
            <ScheduleInterviewSection applicationId={id} isDark={isDark} />
          </div>
        );
      })()}

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
      <HiringNextStepsSection
        application={application}
        applicationId={id}
        assessmentResult={assessmentResult}
        interviews={interviewsData?.interviews}
        isDark={isDark}
        queryClient={queryClient}
      />

      {/* Reject confirmation modal */}
      {showRejectConfirm && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setShowRejectConfirm(false)} aria-hidden="true" />
          <div className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 p-6 rounded-xl w-full max-w-sm shadow-2xl border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>Reject this candidate?</h3>
            <p className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              <span className="font-medium">{application.name}</span> | {application.job_title}
            </p>
            <p className={`text-xs mb-5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
              The candidate will be notified by email. This action can be undone by changing their status manually.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={() => rejectMutation.mutate()} disabled={rejectMutation.isPending}
                className="flex-1 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-sm font-medium disabled:opacity-50">
                {rejectMutation.isPending ? 'Rejecting…' : 'Yes, reject'}
              </button>
              <button type="button" onClick={() => setShowRejectConfirm(false)} disabled={rejectMutation.isPending}
                className={`flex-1 px-4 py-2 rounded-lg border text-sm font-medium ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                Cancel
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
