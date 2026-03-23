import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi } from '../../services/api';

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
  const [filter, setFilter] = useState('all');
  const [sort, setSort] = useState({ col: 'applied_at', dir: 'desc' });

  const { data: candidates = [], isLoading, error } = useQuery({
    queryKey: ['applications', filter],
    queryFn: () => applicationsApi.list(filter),
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

  if (isLoading) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="flex justify-center items-center min-h-[200px]">Loading candidates...</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        <div className="rounded-lg border p-6 border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800">
          <p className="text-red-600 dark:text-red-400">Failed to load candidates.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Candidates</h1>
        <p className="text-sm opacity-75">View and manage all candidate applications</p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {['all', 'applied', 'assessment', 'interview', 'selected', 'hired', 'withdrawn', 'rejected'].map((status) => (
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
            {STATUS_LABELS[status] ?? (status.charAt(0).toUpperCase() + status.slice(1))}
          </button>
        ))}
      </div>

      {/* Candidates Table */}
      <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className={isDark ? 'bg-slate-900 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}
            >
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Candidate</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Job</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                {[
                  { col: 'assessment_score', label: 'Assessment' },
                  { col: 'interview_score', label: 'Interview' },
                  { col: 'combined', label: 'Combined' },
                  { col: 'applied_at', label: 'Applied' },
                ].map(({ col, label }) => (
                  <th
                    key={col}
                    onClick={() => toggleSort(col)}
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider cursor-pointer select-none hover:opacity-80"
                  >
                    {label}<SortIcon dir={sort.col === col ? sort.dir : null} />
                  </th>
                ))}
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {sortedCandidates.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center">
                    <p className="text-lg opacity-75">No candidates found</p>
                  </td>
                </tr>
              ) : (
                sortedCandidates.map((candidate) => (
                  <tr
                    key={candidate.id}
                    className={isDark ? 'hover:bg-slate-900' : 'hover:bg-gray-50'}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium">{candidate.name}</div>
                        <div className="text-sm opacity-75">{candidate.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm">{candidate.job_title}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(candidate.status)}`}
                      >
                        {STATUS_LABELS[candidate.status] ?? candidate.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.assessment_score != null ? (
                        <span className="font-medium">{candidate.assessment_score}%</span>
                      ) : (
                        <span className="text-sm opacity-60">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {candidate.interview_score != null ? (
                        <span className="font-medium">{candidate.interview_score}%</span>
                      ) : (
                        <span className="text-sm opacity-60">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {(() => {
                        const c = combined(candidate);
                        if (c == null) return <span className="text-sm opacity-60">-</span>;
                        const color = c >= 70 ? 'text-emerald-600 dark:text-emerald-400' : c >= 50 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400';
                        return <span className={`font-bold ${color}`}>{c}%</span>;
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {candidate.applied_at ? new Date(candidate.applied_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link
                        to={`/recruiter/candidates/${candidate.id}`}
                        className="text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        View Details
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
