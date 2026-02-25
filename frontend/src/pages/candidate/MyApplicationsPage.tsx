import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { applicationsApi } from '../../services/api';

type Application = {
  id: string;
  job_id: string;
  job_title: string;
  job_location: string;
  status: string;
  applied_at: string;
};

const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  assessment: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
  interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  rejected: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
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

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status?.toLowerCase()] ?? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${cls}`}>
      {status || 'applied'}
    </span>
  );
}

export default function MyApplicationsPage() {
  const location = useLocation();
  const successMessage = (location.state as { message?: string })?.message;

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: () => applicationsApi.mine(),
  });

  const list = applications as Application[];

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
          {list.map((app) => (
            <div
              key={app.id}
              className="rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 p-5 hover:border-gray-300 dark:hover:border-slate-600 transition-colors"
            >
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
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
