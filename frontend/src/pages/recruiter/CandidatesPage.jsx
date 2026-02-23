import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi } from '../../services/api';

export default function CandidatesPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all');
  const { data: candidates = [], isLoading, error } = useQuery({
    queryKey: ['applications', filter],
    queryFn: () => applicationsApi.list(filter),
  });
  const filteredCandidates = filter === 'all' ? candidates : candidates.filter((c) => c.status === filter);

  const getStatusColor = (status) => {
    const colors = {
      applied: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      assessment: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      interview: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      selected: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      rejected: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    };
    return colors[status] || colors.applied;
  };

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
        {['all', 'applied', 'assessment', 'interview', 'selected', 'rejected'].map((status) => (
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

      {/* Candidates Table */}
      <div className={`rounded-lg border overflow-hidden ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead
              className={isDark ? 'bg-slate-900 border-b border-slate-700' : 'bg-gray-50 border-b border-gray-200'}
            >
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Candidate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Job
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Assessment Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Interview Score
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Applied Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {filteredCandidates.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center">
                    <p className="text-lg opacity-75">No candidates found</p>
                  </td>
                </tr>
              ) : (
                filteredCandidates.map((candidate) => (
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
                        className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                          candidate.status
                        )}`}
                      >
                        {candidate.status}
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
