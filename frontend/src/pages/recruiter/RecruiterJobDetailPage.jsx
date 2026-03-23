import { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { jobsApi } from '../../services/api';
import { showToast } from '../../components/Toast';

const SITE_URL = 'https://hire-base.vercel.app';

export default function RecruiterJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: job, isLoading, error } = useQuery({
    queryKey: ['job', id],
    queryFn: () => jobsApi.get(id),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => jobsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      navigate('/recruiter/jobs');
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status) => jobsApi.update(id, { status }),
    onSuccess: (_, status) => {
      queryClient.invalidateQueries({ queryKey: ['job', id] });
      if (status === 'active') showToast('Job published successfully! Candidates can now apply.', 'success');
      else if (status === 'closed') showToast('Job closed. No new applications will be accepted.', 'info');
    },
    onError: () => showToast('Failed to update job status. Please try again.', 'error'),
  });

  const copyLink = () => {
    navigator.clipboard.writeText(`${SITE_URL}/jobs/${id}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const META_ITEMS = job ? [
    job.location && { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, label: job.location },
    job.job_type && { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>, label: job.job_type.replace(/_/g, ' ') },
    job.salary && { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>, label: job.salary },
    job.application_deadline && { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>, label: `Deadline: ${new Date(job.application_deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` },
    { icon: <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>, label: `${job.candidates_count ?? 0} candidates` },
  ].filter(Boolean) : [];

  const STATUS_STYLES = {
    active: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800',
    draft:  'bg-amber-50  text-amber-700  border-amber-200  dark:bg-amber-900/20  dark:text-amber-400  dark:border-amber-800',
    closed: 'bg-red-50    text-red-700    border-red-200    dark:bg-red-900/20    dark:text-red-400    dark:border-red-800',
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 mb-3 text-sm">Job not found or failed to load.</p>
        <Link to="/recruiter/jobs" className="text-sm text-indigo-500 hover:underline">← Back to jobs</Link>
      </div>
    );
  }

  const jobUrl = `${SITE_URL}/jobs/${id}`;
  const shareText = encodeURIComponent(`We're hiring: ${job.title}! Apply now:`);

  return (
    <div className={`max-w-4xl mx-auto ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <Link to="/recruiter/jobs"
        className={`inline-flex items-center gap-1 text-xs mb-5 ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Jobs
      </Link>

      {/* Header card */}
      <div className={`rounded-xl border mb-5 overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        {/* Accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-indigo-500 to-violet-600" />

        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{job.title}</h1>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${STATUS_STYLES[job.status] || STATUS_STYLES.draft}`}>
                  {job.status}
                </span>
              </div>
              {/* Metadata chips */}
              <div className="flex flex-wrap gap-2">
                {META_ITEMS.map((item, i) => (
                  <span key={i} className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${
                    isDark ? 'bg-slate-700/60 text-slate-300' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {item.icon}
                    {item.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <Link to={`/recruiter/jobs/${id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit
            </Link>
            {job.status === 'draft' && (
              <button onClick={() => statusMutation.mutate('active')} disabled={statusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Publish
              </button>
            )}
            {job.status === 'active' && (
              <button onClick={() => statusMutation.mutate('closed')} disabled={statusMutation.isPending}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
                Close Job
              </button>
            )}
            <Link to={`/recruiter/candidates?job=${id}`}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              View Candidates
            </Link>
            <button onClick={() => { if (window.confirm('Delete this job?')) deleteMutation.mutate(); }}
              disabled={deleteMutation.isPending}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${isDark ? 'border-red-800 text-red-400 hover:bg-red-900/20' : 'border-red-200 text-red-600 hover:bg-red-50'}`}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Share */}
      <div className={`rounded-xl border p-5 mb-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <h2 className={`text-sm font-semibold mb-3 ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>Share This Job</h2>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => {
              const descSnippet = (job.description || '').slice(0, 700).replace(/\n+/g, ' ').trim();
              // Strip existing leading bullet chars so we don't double-up (e.g. "• • line")
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
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#0077B5] text-white hover:opacity-90">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            LinkedIn
          </button>
          <a href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(jobUrl)}&text=${shareText}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-black text-white hover:opacity-90">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            Twitter / X
          </a>
          <a href={`https://wa.me/?text=${shareText}%20${encodeURIComponent(jobUrl)}`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-[#25D366] text-white hover:opacity-90">
            WhatsApp
          </a>
          <a
            href={(() => {
              const subject = `Job Opportunity: ${job.title} at Hirebase`;
              const descSnippet = (job.description || '').slice(0, 400).trim();
              const reqLines = (job.requirements || '').split('\n').filter(Boolean).slice(0, 6).join('\n');
              const body = [
                `Hi,`,
                ``,
                `I'd like to share an exciting job opportunity with you:`,
                ``,
                `Position: ${job.title}`,
                `Location: ${job.location || 'Remote'}`,
                `Type: ${(job.job_type || '').replace('_', ' ')}`,
                job.salary ? `Salary: ${job.salary}` : '',
                job.experience_required ? `Experience: ${job.experience_required}` : '',
                ``,
                descSnippet ? `About the Role:\n${descSnippet}` : '',
                reqLines ? `\nKey Requirements:\n${reqLines}` : '',
                ``,
                `Apply here: ${jobUrl}`,
                ``,
                `Best regards`,
              ].filter((l) => l !== undefined && l !== null).join('\n');
              return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
            })()}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Email
          </a>
          <button onClick={copyLink}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border ${isDark ? 'border-slate-600 hover:bg-slate-700' : 'border-gray-300 hover:bg-gray-50'}`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Body — two-column layout on wide screens */}
      <div className="space-y-5">
        {/* Description */}
        {job.description && (
          <section className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Job Description</h2>
            <div className={`text-sm leading-7 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
              {job.description}
            </div>
          </section>
        )}

        {/* Requirements */}
        {job.requirements && (() => {
          const reqItems = job.requirements
            .split('\n')
            .map((l) => l.replace(/^[\s\u2022\u25CF\u25AA\u25B8\u25BA\u25C6\u00B7\u2023\u2013\u2014\-*✓►]+/, '').trim())
            .filter(Boolean);
          return (
            <section className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
              <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Requirements</h2>
              {reqItems.length > 0 ? (
                <ul className="space-y-2">
                  {reqItems.map((item, i) => (
                    <li key={i} className={`flex items-start gap-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      <svg className="w-4 h-4 mt-0.5 shrink-0 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className={`text-sm leading-7 whitespace-pre-wrap ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{job.requirements}</div>
              )}
            </section>
          );
        })()}

        {/* Skills */}
        {job.required_skills?.length > 0 && (
          <section className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
            <h2 className={`text-sm font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Required Skills</h2>
            <div className="flex flex-wrap gap-2">
              {job.required_skills.map((skill) => (
                <span key={skill} className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  isDark ? 'bg-indigo-900/30 text-indigo-300 border-indigo-700/50' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                }`}>
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
