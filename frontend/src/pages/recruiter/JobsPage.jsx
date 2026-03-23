import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';
import { showToast } from '../../components/Toast';
import PageHeader from '../../components/PageHeader';
import TabFilter from '../../components/TabFilter';
import { SkeletonCard } from '../../components/Skeleton';

const SITE_URL = 'https://hire-base.vercel.app';

const STATUS_CONFIG = {
  active: { label: 'Active',  cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  draft:  { label: 'Draft',   cls: 'bg-gray-100  text-gray-600  dark:bg-slate-700        dark:text-slate-300'   },
  closed: { label: 'Closed',  cls: 'bg-red-50    text-red-600   dark:bg-red-900/30        dark:text-red-400'    },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.draft;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cfg.cls}`}>
      {cfg.label}
    </span>
  );
}

function ShareMenu({ job, isDark }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const jobUrl = `${SITE_URL}/jobs/${job.id}`;

  const copyLink = () => {
    navigator.clipboard.writeText(jobUrl).then(() => {
      setCopied(true);
      showToast('Link copied!', 'success', 2000);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const items = [
    {
      label: 'LinkedIn', icon: (
        <svg className="w-3.5 h-3.5 text-[#0077B5]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
        </svg>
      ),
      action: () => {
        const descSnippet = (job.description || '').slice(0, 700).replace(/\n+/g, ' ').trim();
        const reqLines = (job.requirements || '')
          .split('\n')
          .map((l) => l.replace(/^[\s\u2022\u25CF\u25AA\u25B8\u25BA\u25C6\u00B7\u2023\u2013\u2014\-*✓►]+/, '').trim())
          .filter(Boolean)
          .slice(0, 8)
          .map((l) => `• ${l}`)
          .join('\n');
        const summary = [
          descSnippet,
          reqLines ? `Requirements:\n${reqLines}` : '',
          `\nLocation: ${job.location || 'Remote'} | Type: ${(job.job_type || '').replace('_', ' ')} | Salary: ${job.salary || 'Competitive'}`,
          (job.required_skills || []).length > 0 ? `Skills: ${job.required_skills.join(', ')}` : '',
          `\nApply: ${jobUrl}`,
          `#hiring #jobs #${(job.title || '').replace(/\s+/g, '')}`,
        ].filter(Boolean).join('\n\n');
        const liUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(jobUrl)}&title=${encodeURIComponent(`We're Hiring: ${job.title}`)}&summary=${encodeURIComponent(summary)}&source=${encodeURIComponent('Hirebase')}`;
        // Open popup synchronously (must be in the direct click handler, not inside async .then)
        window.open(liUrl, 'linkedin_share', 'width=620,height=620,left=200,top=100,resizable=yes,scrollbars=yes');
        // Clipboard write is async — fire after popup is already launched
        navigator.clipboard.writeText(summary).catch(() => {});
        showToast('Post text copied to clipboard — paste it into the LinkedIn post body!', 'info', 6000);
      },
    },
    {
      label: 'Twitter / X', icon: (
        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
      href: `https://twitter.com/intent/tweet?url=${encodeURIComponent(jobUrl)}&text=${encodeURIComponent(`We're hiring: ${job.title}! Apply now:`)}`,
    },
    {
      label: 'WhatsApp', icon: (
        <svg className="w-3.5 h-3.5 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
      ),
      href: `https://wa.me/?text=${encodeURIComponent(`We're hiring: ${job.title}! Apply now: ${jobUrl}`)}`,
    },
    { label: 'Copy link', icon: null, action: copyLink },
  ];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
        title="Share"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className={`absolute right-0 mt-1 w-40 rounded-lg border shadow-lg z-20 py-1 text-sm ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
            {items.map((item) =>
              item.href ? (
                <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-1.5 ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {item.icon}
                  {item.label}
                </a>
              ) : (
                <button key={item.label}
                  onClick={() => { setOpen(false); item.action(); }}
                  className={`flex items-center gap-2.5 px-3 py-1.5 w-full text-left ${isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-50'}`}>
                  {item.icon ?? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                  {copied && item.label === 'Copy link' ? 'Copied!' : item.label}
                </button>
              )
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function JobsPage() {
  const { theme } = useTheme();
  const queryClient = useQueryClient();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');

  const { data: jobs = [], isLoading, error } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => jobsApi.list(),
  });

  const publishMutation = useMutation({
    mutationFn: (jobId) => jobsApi.update(jobId, { status: 'active' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      showToast('Job published successfully!', 'success');
    },
    onError: () => showToast('Failed to publish job.', 'error'),
  });

  const filteredJobs = filter === 'all' ? jobs : jobs.filter((j) => j.status === filter);

  const counts = {
    all: jobs.length,
    active: jobs.filter((j) => j.status === 'active').length,
    draft: jobs.filter((j) => j.status === 'draft').length,
    closed: jobs.filter((j) => j.status === 'closed').length,
  };

  const tabs = [
    { value: 'all',    label: 'All',    count: counts.all    },
    { value: 'active', label: 'Active', count: counts.active },
    { value: 'draft',  label: 'Draft',  count: counts.draft  },
    { value: 'closed', label: 'Closed', count: counts.closed },
  ];

  const inputBase = `rounded-lg border px-3 py-2 text-sm outline-none transition-colors focus:ring-2 focus:ring-indigo-500/30 ${
    isDark ? 'border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-500'
           : 'border-gray-200 bg-white text-gray-900 placeholder-gray-400'
  }`;

  return (
    <div>
      <PageHeader
        title="Jobs"
        subtitle="Manage your job postings"
        badge={jobs.length}
        actions={
          <Link
            to="/recruiter/jobs/new"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            New Job
          </Link>
        }
      />

      <TabFilter tabs={tabs} active={filter} onChange={setFilter} />

      {/* Error */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4 mb-6 text-sm text-red-600 dark:text-red-400">
          Failed to load jobs. {error?.message}
        </div>
      )}

      {/* Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <table className="w-full text-sm">
          <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}`}>
            <tr>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Role
              </th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Location
              </th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Type
              </th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Candidates
              </th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Status
              </th>
              <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Deadline
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className={`divide-y ${isDark ? 'divide-slate-700 bg-slate-800/50' : 'divide-gray-100 bg-white'}`}>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}>
                  {Array.from({ length: 7 }).map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 rounded animate-pulse bg-gray-200 dark:bg-slate-700" style={{ width: j === 0 ? '60%' : '80%' }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredJobs.length === 0 ? (
              <tr>
                <td colSpan="7">
                  <div className="py-16 text-center">
                    <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-slate-400 mb-3">
                      {filter === 'all' ? 'No job postings yet' : `No ${filter} jobs`}
                    </p>
                    <Link to="/recruiter/jobs/new"
                      className="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline">
                      Create your first job →
                    </Link>
                  </div>
                </td>
              </tr>
            ) : (
              filteredJobs.map((job) => (
                <tr key={job.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                  <td className="px-4 py-3">
                    <Link to={`/recruiter/jobs/${job.id}`}
                      className={`font-medium hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                      {job.title}
                    </Link>
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {job.location || '—'}
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                    {(job.job_type || '').replace(/_/g, ' ')}
                  </td>
                  <td className={`px-4 py-3 tabular-nums ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                    {job.candidates_count ?? 0}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                  </td>
                  <td className={`px-4 py-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                    {job.application_deadline
                      ? new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {job.status === 'draft' && (
                        <button
                          onClick={() => publishMutation.mutate(job.id)}
                          disabled={publishMutation.isPending}
                          className="px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 transition-colors"
                        >
                          Publish
                        </button>
                      )}
                      <ShareMenu job={job} isDark={isDark} />
                      <Link to={`/recruiter/jobs/${job.id}/edit`}
                        className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                        title="Edit">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </Link>
                      <Link to={`/recruiter/jobs/${job.id}`}
                        className={`p-1.5 rounded-md transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-700' : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100'}`}
                        title="View">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
