import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { applicationsApi, interviewsApi } from '../../services/api';

type Application = {
  id: string;
  job_id: string;
  job_title: string;
  job_location: string;
  status: string;
  applied_at: string;
  interview_score?: number | null;
  offer_sent_at?: string | null;
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

  if (isNoShow) {
    return (
      <div className="mt-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 p-3 text-sm text-red-700 dark:text-red-300">
        You were marked as a no-show for this interview session.
      </div>
    );
  }

  if (!isCompleted || !parsed) {
    return (
      <div className="mt-3 flex items-center gap-2 text-sm text-gray-500 dark:text-slate-400">
        <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        Interview scheduled for {formatDateTime(interview.scheduled_at)} ({interview.duration_minutes} min)
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
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-gray-600 dark:text-slate-400">Loading applications...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4">
        <div className="rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30 p-6 text-red-700 dark:text-red-300">
          Failed to load applications.
        </div>
        <Link to="/jobs" className="mt-4 inline-block text-blue-600 dark:text-blue-400 hover:underline">
          Browse Jobs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-slate-100">My Applications</h1>
        <Link
          to="/jobs"
          className="inline-flex items-center px-4 py-2 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors w-fit"
        >
          Browse Jobs
        </Link>
      </div>

      {successMessage && (
        <div className="mb-6 rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30 p-4 text-emerald-800 dark:text-emerald-200">
          {successMessage}
        </div>
      )}

      {list.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-12 text-center">
          <p className="text-gray-600 dark:text-slate-400 mb-6">You haven&apos;t applied to any jobs yet.</p>
          <Link
            to="/jobs"
            className="inline-flex items-center px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Browse Jobs
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {list.map((app) => {
            const interview = interviewByApp[app.id];
            const msg = offerMessage?.id === app.id ? offerMessage : null;

            return (
              <div
                key={app.id}
                className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 transition-colors"
              >
                {/* Header row */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="font-semibold text-gray-900 dark:text-slate-100 truncate">
                      {app.job_title}
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
                      {app.job_location || '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <StatusBadge status={app.status} />
                    <span className="text-sm text-gray-500 dark:text-slate-400">
                      Applied {formatDate(app.applied_at)}
                    </span>
                  </div>
                </div>

                {/* Interview score (if available) */}
                {app.interview_score != null && (
                  <div className="mt-3 max-w-xs">
                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">Interview score</p>
                    <ScoreBar score={app.interview_score} />
                  </div>
                )}

                {/* Interview details / summary */}
                {interview && <InterviewSummaryCard interview={interview} />}

                {/* Offer actions */}
                {msg && (
                  <div className={`mt-3 p-3 rounded-lg text-sm ${
                    msg.type === 'success'
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                      : 'bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800'
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
            );
          })}
        </div>
      )}
    </div>
  );
}
