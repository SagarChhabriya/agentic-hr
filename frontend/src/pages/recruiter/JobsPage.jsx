import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';

export default function JobsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');
  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs', filter],
    queryFn: () => jobsApi.list(filter),
  });
  const filteredJobs = filter === 'all' ? jobs : jobs.filter((job) => job.status === filter);

  if (isLoading) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="flex justify-center items-center min-h-[200px]">Loading jobs...</div>
      </div>
    );
  }
  if (error) {
    const isNetworkError = error?.message?.toLowerCase().includes('network') || error?.code === 'ERR_NETWORK';
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="rounded-lg border p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400 font-medium">Failed to load jobs. {error?.message || 'Please try again.'}</p>
          {isNetworkError && (
            <p className="mt-3 text-sm text-red-600/90 dark:text-red-400/90">
              The app cannot reach the backend API ({apiUrl}). Ensure your backend is deployed and VITE_API_URL is set in Vercel.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Job Postings</h1>
          <p className="text-sm opacity-75">Manage all your job postings</p>
        </div>
        <Link
          to="/recruiter/jobs/new"
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            isDark
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          + Create New Job
        </Link>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'active', 'draft', 'closed'].map((status) => (
          <button
            key={status}
            onClick={() => setFilter(status)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === status
                ? isDark
                  ? 'bg-blue-600 text-white'
                  : 'bg-blue-600 text-white'
                : isDark
                  ? 'bg-slate-800 border border-slate-700 hover:bg-slate-700'
                  : 'bg-white border border-gray-300 hover:bg-gray-50'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Jobs List */}
      <div className="space-y-4">
        {filteredJobs.length === 0 ? (
          <div
            className={`rounded-lg border p-12 text-center ${
              isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
            }`}
          >
            <p className="text-lg opacity-75 mb-4">No jobs found</p>
            <Link
              to="/recruiter/jobs/new"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Create your first job posting
            </Link>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className={`rounded-lg border p-6 transition-all hover:shadow-lg ${
                isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-semibold">{job.title}</h2>
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        job.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                          : job.status === 'draft'
                          ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                      }`}
                    >
                      {job.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm opacity-75 mb-4">
                    <span>📍 {job.location}</span>
                    <span>💼 {job.job_type}</span>
                    {job.created_at && <span>📅 Posted: {new Date(job.created_at).toLocaleDateString()}</span>}
                    {job.application_deadline && <span>⏰ Deadline: {job.application_deadline}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      <span className="font-medium">{job.candidates_count ?? 0}</span> candidates
                    </span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/recruiter/jobs/${job.id}`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isDark
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    View Details
                  </Link>
                  <Link
                    to={`/recruiter/jobs/${job.id}/edit`}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      isDark
                        ? 'border-slate-600 bg-slate-700 hover:bg-slate-600'
                        : 'border-gray-300 bg-white hover:bg-gray-50'
                    }`}
                  >
                    Edit
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
