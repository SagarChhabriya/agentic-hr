import { useState, useMemo } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, jobsApi } from '../../services/api';
import PageHeader from '../../components/PageHeader';
import TabFilter from '../../components/TabFilter';
import { formatDateKarachi } from '../../lib/datetimeKarachi';

function combined(c) {
  const scores = [c.assessment_score, c.interview_score].filter((s) => s != null);
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

function SortIcon({ dir }) {
  if (!dir) return <span className="ml-1 opacity-30">↕</span>;
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>;
}

export default function CandidatesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job') || undefined;

  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ col: 'applied_at', dir: 'desc' });

  const { data: candidates = [], isLoading, error } = useQuery({
    queryKey: ['applications', filter, jobId],
    queryFn: () => applicationsApi.list(filter, jobId),
  });

  // Fetch job name for the filter banner (only when jobId is present)
  const { data: jobData } = useQuery({
    queryKey: ['job', jobId],
    queryFn: () => jobsApi.get(jobId),
    enabled: !!jobId,
  });

  function toggleSort(col) {
    setSort((prev) =>
      prev.col === col ? { col, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { col, dir: 'desc' }
    );
  }

  const sortedCandidates = useMemo(() => {
    const list = filter === 'all' ? candidates : candidates.filter((c) => c.status === filter);
    return [...list].sort((a, b) => {
      let av, bv;
      if (sort.col === 'assessment_score') { av = a.assessment_score ?? -1; bv = b.assessment_score ?? -1; }
      else if (sort.col === 'interview_score') { av = a.interview_score ?? -1; bv = b.interview_score ?? -1; }
      else if (sort.col === 'combined') { av = combined(a) ?? -1; bv = combined(b) ?? -1; }
      else { av = a.applied_at ?? ''; bv = b.applied_at ?? ''; }
      if (av < bv) return sort.dir === 'asc' ? -1 : 1;
      if (av > bv) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    });
  }, [candidates, filter, sort]);

  const STATUS_COLORS = {
    applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    assessment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
    selected: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    hired: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    withdrawn: 'bg-gray-100 text-gray-600 dark:bg-gray-700/50 dark:text-gray-400',
  };
  const STATUS_LABELS = {
    applied: 'Applied', assessment: 'Assessment', interview: 'Interview',
    selected: 'Offer Sent', rejected: 'Rejected', hired: 'Hired', withdrawn: 'Withdrawn',
  };
  const getStatusColor = (status) => STATUS_COLORS[status] || STATUS_COLORS.applied;

  const tabs = ['all', 'applied', 'assessment', 'interview', 'selected', 'hired', 'withdrawn', 'rejected'].map((s) => ({
    value: s,
    label: STATUS_LABELS[s] ?? (s.charAt(0).toUpperCase() + s.slice(1)),
    count: s === 'all' ? candidates.length : candidates.filter((c) => c.status === s).length,
  }));

  if (error) {
    return (
      <div>
        <PageHeader title="Candidates" subtitle="View and manage all applicants" />
        <div className="rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20 p-4 text-sm text-red-600 dark:text-red-400">
          Failed to load candidates. {error?.message}
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Candidates"
        subtitle={jobId && jobData?.title ? `Filtered by job: ${jobData.title}` : 'View and manage all applicants'}
        badge={candidates.length}
      />

      {/* Job filter banner */}
      {jobId && (
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl mb-4 text-sm border ${
          isDark ? 'bg-indigo-900/20 border-indigo-800/50 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
        }`}>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
            <span>
              Showing candidates for <span className="font-semibold">{jobData?.title || 'this job'}</span>
            </span>
          </div>
          <button
            onClick={() => navigate('/recruiter/candidates')}
            className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors ${
              isDark ? 'border-indigo-700 hover:bg-indigo-900/40' : 'border-indigo-300 hover:bg-indigo-100'
            }`}
          >
            Clear filter ✕
          </button>
        </div>
      )}

      <TabFilter tabs={tabs} active={filter} onChange={setFilter} />

      {/* Candidates Table */}
      <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={`${isDark ? 'bg-slate-800 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}`}>
              <tr>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Candidate</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Job</th>
                <th className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Status</th>
                {[
                  { col: 'assessment_score', label: 'Assessment' },
                  { col: 'interview_score', label: 'Interview' },
                  { col: 'combined', label: 'Combined' },
                  { col: 'applied_at', label: 'Applied' },
                ].map(({ col, label }) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className={`px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide cursor-pointer select-none hover:opacity-80 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}
                  >
                    {label}<SortIcon dir={sort.col === col ? sort.dir : null} />
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className={`divide-y text-sm ${isDark ? 'divide-slate-700 bg-slate-800/50' : 'divide-gray-100 bg-white'}`}>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((__, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-3 rounded animate-pulse bg-gray-200 dark:bg-slate-700" style={{ width: `${50 + Math.random() * 40}%` }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedCandidates.length === 0 ? (
                <tr>
                  <td colSpan="8">
                    <div className="py-16 text-center">
                      <svg className="mx-auto w-10 h-10 text-gray-300 dark:text-slate-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-slate-400">No candidates found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                sortedCandidates.map((candidate) => (
                  <tr key={candidate.id} className={`group transition-colors ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className={`font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{candidate.name}</div>
                      <div className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{candidate.email}</div>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
                      {candidate.job_title}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}>
                        {STATUS_LABELS[candidate.status] ?? candidate.status}
                      </span>
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap tabular-nums ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {candidate.assessment_score != null ? `${candidate.assessment_score}%` : <span className="text-gray-300 dark:text-slate-600">N/A</span>}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap tabular-nums ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>
                      {candidate.interview_score != null ? `${candidate.interview_score}%` : <span className="text-gray-300 dark:text-slate-600">N/A</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {(() => {
                        const c = combined(candidate);
                        if (c == null) return <span className="text-gray-300 dark:text-slate-600">N/A</span>;
                        const color = c >= 70 ? 'text-emerald-600 dark:text-emerald-400' : c >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-500 dark:text-red-400';
                        return <span className={`font-semibold ${color}`}>{c}%</span>;
                      })()}
                    </td>
                    <td className={`px-4 py-3 whitespace-nowrap ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      {candidate.applied_at ? formatDateKarachi(candidate.applied_at) : 'N/A'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <Link
                        to={`/recruiter/candidates/${candidate.id}`}
                        className={`inline-flex items-center gap-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}
                      >
                        View
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

