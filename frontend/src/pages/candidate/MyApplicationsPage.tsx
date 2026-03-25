import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, interviewsApi } from '../../services/api';

const PIPELINE_STEPS = [
  { key: 'applied',    label: 'Applied' },
  { key: 'assessment', label: 'Assessment' },
  { key: 'interview',  label: 'Interview' },
  { key: 'selected',   label: 'Offer' },
  { key: 'hired',      label: 'Hired' },
];

function PipelineTracker({ status }: { status: string }) {
  const keys = PIPELINE_STEPS.map(s => s.key);
  const currentIdx = keys.indexOf(status);
  const isTerminal = status === 'rejected' || status === 'withdrawn';

  return (
    <div className="flex items-start mt-4 pt-3.5 border-t border-gray-100 dark:border-slate-700/60">
      {PIPELINE_STEPS.map((step, idx) => {
        const completed = !isTerminal && currentIdx > idx;
        const active = !isTerminal && currentIdx === idx;
        const future = isTerminal || currentIdx < idx;
        return (
          <div key={step.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center min-w-0">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                completed
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : active
                  ? 'bg-white dark:bg-slate-800 border-indigo-600 text-indigo-600 dark:text-indigo-400'
                  : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-300 dark:text-slate-600'
              }`}>
                {completed ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                  </svg>
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span className={`text-xs mt-1 whitespace-nowrap leading-none ${
                active
                  ? 'text-indigo-600 dark:text-indigo-400 font-semibold'
                  : completed
                  ? 'text-gray-600 dark:text-slate-400'
                  : 'text-gray-300 dark:text-slate-600'
              }`}>
                {step.label}
              </span>
            </div>
            {idx < PIPELINE_STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 mx-1 mb-4 ${completed ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-slate-700'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

type Application = {
  id: string;
  job_id: string;
  job_title: string;
  job_location: string;
  status: string;
  applied_at: string;
  job_has_assessment?: boolean;
  assessment_id?: string | null;
  assessment_score?: number | null;
  interview_score?: number | null;
  offer_sent_at?: string | null;
  in_person_scheduled_at?: string | null;
  in_person_notes?: string | null;
};

type Interview = {
  id: string;
  application_id: string;
  job_title: string;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  session_summary?: string | null;
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  assessment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  hired: 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300',
  withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
};

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  assessment: 'Assessment',
  interview: 'Interview',
  selected: 'Offer Pending',
  rejected: 'Not Selected',
  hired: 'Hired',
  withdrawn: 'Withdrawn',
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  const label = STATUS_LABELS[status?.toLowerCase()] ?? status;
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {label}
    </span>
  );
}

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 dark:bg-slate-600 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-semibold tabular-nums">{score}%</span>
    </div>
  );
}

// Parses the LLM summary which is stored as a multi-line string
function parseSummary(raw: string | null | undefined) {
  if (!raw) return null;
  const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
  const result: Record<string, string> = {};
  let summary = '';
  for (const line of lines) {
    if (line.startsWith('Strengths:')) result.strengths = line.replace('Strengths:', '').trim();
    else if (line.startsWith('Areas to improve:')) result.weaknesses = line.replace('Areas to improve:', '').trim();
    else if (line.startsWith('Recommendation:')) result.recommendation = line.replace('Recommendation:', '').trim();
    else if (!summary) summary = line;
  }
  result.summary = summary;
  return result;
}

function InterviewSummaryCard({ interview }: { interview: Interview }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseSummary(interview.session_summary);
  const isCompleted = interview.status === 'completed';
  const isNoShow = interview.status === 'no_show';
  const isScheduled = interview.status === 'scheduled';

  if (isNoShow) {
    return (
      <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300">
        You were marked as a no-show for this interview session.
      </div>
    );
  }

  if (isScheduled) {
    const { text: timeText, urgent } = (() => {
      const ms = new Date(interview.scheduled_at).getTime() - Date.now();
      if (ms <= 0) return { text: 'Started — join now', urgent: true };
      const min = Math.floor(ms / 60000);
      const hr = Math.floor(min / 60);
      const day = Math.floor(hr / 24);
      if (day >= 1) return { text: `in ${day}d ${hr % 24}h`, urgent: false };
      if (hr >= 1) return { text: `in ${hr}h ${min % 60}m`, urgent: hr < 2 };
      return { text: `in ${min}m`, urgent: true };
    })();

    return (
      <div className={`mt-3 rounded-lg border p-3 flex items-center justify-between gap-3 ${
        urgent
          ? 'border-violet-300 dark:border-violet-700 bg-violet-50 dark:bg-violet-950/20'
          : 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30'
      }`}>
        <div className="flex items-center gap-2 min-w-0">
          <svg className={`w-4 h-4 shrink-0 ${urgent ? 'text-violet-500' : 'text-gray-400 dark:text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div>
            <p className={`text-sm font-medium ${urgent ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-slate-300'}`}>
              AI Interview <span className="font-semibold">{timeText}</span>
            </p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-0.5">
              {formatDateTime(interview.scheduled_at)} · {interview.duration_minutes} min
            </p>
          </div>
        </div>
        <Link
          to={`/interview/room/${interview.id}`}
          className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
            urgent
              ? 'bg-violet-600 hover:bg-violet-700 text-white'
              : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-600'
          }`}
        >
          Join Interview
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    );
  }

  if (!isCompleted || !parsed) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <svg className="w-4 h-4 text-purple-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Interview processing…
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/20 p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between text-sm font-medium text-purple-800 dark:text-purple-300"
      >
        <span className="flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          AI Interview Completed
          {parsed.recommendation && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              parsed.recommendation === 'Hire'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300'
                : parsed.recommendation === 'No Hire'
                ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
            }`}>
              {parsed.recommendation}
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-slate-300">
          {parsed.summary && <p>{parsed.summary}</p>}
          {parsed.strengths && (
            <div>
              <span className="font-medium text-green-700 dark:text-green-400">Strengths: </span>
              {parsed.strengths}
            </div>
          )}
          {parsed.weaknesses && (
            <div>
              <span className="font-medium text-amber-700 dark:text-amber-400">Areas to improve: </span>
              {parsed.weaknesses}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InPersonCard({ scheduledAt, notes }: { scheduledAt: string; notes?: string | null }) {
  const dt = new Date(scheduledAt);
  const isPast = dt < new Date();
  return (
    <div className={`mt-3 rounded-lg border p-3 ${
      isPast
        ? 'border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30'
        : 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20'
    }`}>
      <div className="flex items-start gap-2">
        <svg className={`w-4 h-4 mt-0.5 flex-shrink-0 ${isPast ? 'text-gray-400' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <div className="text-sm">
          <p className={`font-medium ${isPast ? 'text-gray-600 dark:text-slate-400' : 'text-blue-800 dark:text-blue-300'}`}>
            {isPast ? 'In-person interview was' : 'In-person interview scheduled for'}{' '}
            <span className="font-semibold">{formatDateTime(scheduledAt)}</span>
          </p>
          {notes && <p className="mt-1 text-gray-600 dark:text-slate-400">{notes}</p>}
        </div>
      </div>
    </div>
  );
}

function OfferActions({
  app,
  onAccept,
  onDecline,
  isPending,
}: {
  app: Application;
  onAccept: () => void;
  onDecline: () => void;
  isPending: boolean;
}) {
  const [showConfirm, setShowConfirm] = useState<'accept' | 'decline' | null>(null);

  if (app.status === 'hired') {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20 p-3 text-sm text-green-700 dark:text-green-300">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        You accepted this offer. Welcome aboard!
      </div>
    );
  }

  if (app.status === 'withdrawn') {
    return (
      <div className="mt-3 rounded-lg border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/30 p-3 text-sm text-gray-500 dark:text-slate-400">
        You declined this offer.
      </div>
    );
  }

  if (!app.offer_sent_at) return null;

  return (
    <div className="mt-3 rounded-lg border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-950/20 p-3">
      <p className="text-sm font-medium text-emerald-800 dark:text-emerald-300 mb-3">
        You have received an offer letter for this position!
        <span className="ml-2 text-xs font-normal text-gray-500 dark:text-slate-400">
          Sent {formatDate(app.offer_sent_at)}
        </span>
      </p>

      {showConfirm ? (
        <div className="space-y-2">
          <p className="text-sm text-gray-700 dark:text-slate-300">
            {showConfirm === 'accept'
              ? 'Are you sure you want to accept this offer?'
              : 'Are you sure you want to decline this offer? This cannot be undone.'}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => { showConfirm === 'accept' ? onAccept() : onDecline(); setShowConfirm(null); }}
              disabled={isPending}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${
                showConfirm === 'accept' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isPending ? 'Processing...' : 'Confirm'}
            </button>
            <button
              onClick={() => setShowConfirm(null)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium border border-gray-300 dark:border-slate-600 hover:bg-gray-50 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowConfirm('accept')}
            className="px-4 py-1.5 rounded-lg text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
          >
            Accept Offer
          </button>
          <button
            onClick={() => setShowConfirm('decline')}
            className="px-4 py-1.5 rounded-lg text-sm font-medium border border-red-300 dark:border-red-700 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            Decline
          </button>
        </div>
      )}
    </div>
  );
}

export default function MyApplicationsPage() {
  const location = useLocation();
  const queryClient = useQueryClient();
  const successMessage = (location.state as { message?: string })?.message;
  const [offerMessage, setOfferMessage] = useState<{ id: string; type: 'success' | 'error'; text: string } | null>(null);

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: () => applicationsApi.mine(),
  });

  const { data: interviewsData } = useQuery({
    queryKey: ['interviews', 'mine'],
    queryFn: () => interviewsApi.mine(),
  });

  const offerMutation = useMutation({
    mutationFn: ({ id, response }: { id: string; response: 'accept' | 'decline' }) =>
      applicationsApi.respondOffer(id, response),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['applications', 'mine'] });
      setOfferMessage({
        id: vars.id,
        type: 'success',
        text: vars.response === 'accept' ? 'Offer accepted! Welcome aboard.' : 'Offer declined.',
      });
    },
    onError: (_, vars) => {
      setOfferMessage({ id: vars.id, type: 'error', text: 'Could not process your response. Please try again.' });
    },
  });

  const list = applications as Application[];
  const interviews = (interviewsData?.interviews ?? []) as Interview[];

  // Index interviews by application_id for fast lookup
  const interviewByApp = interviews.reduce<Record<string, Interview>>((acc, iv) => {
    // Prefer completed/no_show over scheduled for display
    const existing = acc[iv.application_id];
    if (!existing || iv.status === 'completed' || iv.status === 'no_show') {
      acc[iv.application_id] = iv;
    }
    return acc;
  }, {});

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 text-center">
        <p className="text-red-500 text-sm mb-3">Failed to load applications.</p>
        <Link to="/jobs" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline">Browse Jobs</Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Applications</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {list.length} application{list.length !== 1 ? 's' : ''} total
          </p>
        </div>
        <Link to="/jobs"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity w-fit shadow-sm">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
          </svg>
          Browse Jobs
        </Link>
      </div>

      {successMessage && (
        <div className="mb-5 rounded-xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-800 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 py-20 text-center">
          <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
          <p className="text-gray-500 dark:text-slate-400 text-sm mb-4">You haven&apos;t applied to any jobs yet.</p>
          <Link to="/jobs"
            className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
            Browse Open Positions
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((app) => {
            const interview = interviewByApp[app.id];
            const msg = offerMessage?.id === app.id ? offerMessage : null;
            const initials = (app.job_title || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);

            return (
              <div key={app.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 overflow-hidden">
                {/* Accent bar */}
                <div className={`h-0.5 w-full ${
                  app.status === 'hired'      ? 'bg-green-500'
                  : app.status === 'selected' ? 'bg-emerald-500'
                  : app.status === 'interview'? 'bg-violet-500'
                  : app.status === 'assessment'? 'bg-amber-500'
                  : app.status === 'rejected' ? 'bg-red-400'
                  : app.status === 'withdrawn'? 'bg-gray-400'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-500'
                }`} />

                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-400/20 to-violet-400/20 border border-indigo-200/30 dark:border-indigo-700/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-semibold text-gray-900 dark:text-slate-100 truncate">{app.job_title}</h2>
                        <StatusBadge status={app.status} />
                      </div>
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                        {app.job_location && `${app.job_location} · `}Applied {formatDate(app.applied_at)}
                      </p>
                    </div>
                    <div className="shrink-0 flex flex-wrap gap-3 justify-end">
                      {app.assessment_score != null && app.assessment_score !== undefined && (
                        <div className="text-right">
                          <span className={`text-lg font-bold tabular-nums ${app.assessment_score >= 70 ? 'text-emerald-500' : app.assessment_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {app.assessment_score}%
                          </span>
                          <p className="text-xs text-gray-400 dark:text-slate-500">Assessment</p>
                        </div>
                      )}
                      {app.interview_score != null && (
                        <div className="text-right">
                          <span className={`text-lg font-bold tabular-nums ${app.interview_score >= 70 ? 'text-emerald-500' : app.interview_score >= 50 ? 'text-amber-500' : 'text-red-500'}`}>
                            {app.interview_score}%
                          </span>
                          <p className="text-xs text-gray-400 dark:text-slate-500">Interview</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {app.job_has_assessment &&
                    app.assessment_id &&
                    (app.assessment_score == null || app.assessment_score === undefined) &&
                    !['rejected', 'withdrawn', 'hired', 'interview', 'selected'].includes(app.status) && (
                    <div className="mt-3">
                      <Link
                        to={`/assessment/attempt/${app.assessment_id}?application_id=${encodeURIComponent(app.id)}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
                      >
                        Complete assessment
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  )}

                  {/* Pipeline tracker */}
                  {!['rejected', 'withdrawn'].includes(app.status) && (
                    <PipelineTracker status={app.status} />
                  )}

                  {/* Rejected / Withdrawn banner */}
                  {(app.status === 'rejected' || app.status === 'withdrawn') && (
                    <div className={`mt-3 px-3 py-2 rounded-lg text-xs font-medium ${
                      app.status === 'rejected'
                        ? 'bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 border border-red-100 dark:border-red-800/50'
                        : 'bg-gray-50 dark:bg-slate-700/30 text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-700'
                    }`}>
                      {app.status === 'rejected' ? 'Application was not selected for this position.' : 'You withdrew from this application.'}
                    </div>
                  )}

                  {/* Interview details */}
                  {interview && <InterviewSummaryCard interview={interview} />}

                  {/* In-person date */}
                  {app.in_person_scheduled_at && (
                    <InPersonCard scheduledAt={app.in_person_scheduled_at} notes={app.in_person_notes} />
                  )}

                  {/* Offer message feedback */}
                  {msg && (
                    <div className={`mt-3 px-3 py-2 rounded-lg text-sm border ${
                      msg.type === 'success'
                        ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                        : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800'
                    }`}>
                      {msg.text}
                    </div>
                  )}

                  <OfferActions
                    app={app}
                    onAccept={() => offerMutation.mutate({ id: app.id, response: 'accept' })}
                    onDecline={() => offerMutation.mutate({ id: app.id, response: 'decline' })}
                    isPending={offerMutation.isPending && offerMutation.variables?.id === app.id}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
