import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';

const SITE_URL = 'https://hire-base.vercel.app';

function ShareMenu({ job, isDark }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const jobUrl = `${SITE_URL}/jobs/${job.id}`;
  const text = encodeURIComponent(`We're hiring: ${job.title}! Apply now:`);

  const copyLink = () => {
    navigator.clipboard.writeText(jobUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${
          isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600' : 'border-gray-300 bg-white hover:bg-gray-50'
        }`}
        title="Share job"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 mt-2 w-48 rounded-lg border shadow-lg z-20 py-1 ${
            isDark ? 'border-slate-600 bg-slate-800' : 'border-gray-200 bg-white'
          }`}>
            <button onClick={() => {
                const details = `🚀 We're Hiring: ${job.title}\n\n📍 Location: ${job.location || 'Remote'}\n💼 Type: ${(job.job_type || '').replace('_', ' ')}\n💰 Salary: ${job.salary || 'Competitive'}\n\nApply now: ${jobUrl}\n\n#hiring #jobs #careers`;
                navigator.clipboard.writeText(details).then(() => {
                  window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(jobUrl)}`, '_blank');
                });
              }}
              className={`flex items-center gap-2 px-4 py-2 text-sm w-full hover:bg-blue-50 dark:hover:bg-slate-700 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
              LinkedIn (copies details)
            </button>
            <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(jobUrl)}&text=${text}`} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              Twitter / X
            </a>
            <a href={`https://wa.me/?text=${text}%20${encodeURIComponent(jobUrl)}`} target="_blank" rel="noopener noreferrer"
              className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              WhatsApp
            </a>
            <a href={`mailto:?subject=${encodeURIComponent(`Job Opportunity: ${job.title}`)}&body=${encodeURIComponent(`Hi,\n\nI'd like to share this job opportunity with you:\n\n${job.title}\nLocation: ${job.location || ''}\n\nApply here: ${jobUrl}\n\nBest regards`)}`}
              className={`flex items-center gap-2 px-4 py-2 text-sm hover:bg-blue-50 dark:hover:bg-slate-700 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              Email
            </a>
            <button onClick={copyLink}
              className={`flex items-center gap-2 px-4 py-2 text-sm w-full hover:bg-blue-50 dark:hover:bg-slate-700 ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>
              <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

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
                  <ShareMenu job={job} isDark={isDark} />
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
