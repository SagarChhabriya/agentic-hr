import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';

export default function JobsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [filter, setFilter] = useState('all'); // all, active, draft, closed

  // Mock data - replace with API calls
  const jobs = [
    {
      id: 1,
      title: 'Senior Frontend Engineer',
      status: 'active',
      candidates: 42,
      postedDate: '2024-01-15',
      deadline: '2024-02-15',
      location: 'Remote',
      type: 'Full-time',
    },
    {
      id: 2,
      title: 'Backend Developer',
      status: 'active',
      candidates: 28,
      postedDate: '2024-01-20',
      deadline: '2024-02-20',
      location: 'New York, NY',
      type: 'Full-time',
    },
    {
      id: 3,
      title: 'Product Manager',
      status: 'draft',
      candidates: 0,
      postedDate: null,
      deadline: null,
      location: 'San Francisco, CA',
      type: 'Full-time',
    },
    {
      id: 4,
      title: 'UX Designer',
      status: 'closed',
      candidates: 15,
      postedDate: '2023-12-01',
      deadline: '2024-01-01',
      location: 'Remote',
      type: 'Contract',
    },
  ];

  const filteredJobs =
    filter === 'all' ? jobs : jobs.filter((job) => job.status === filter);

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
                    <span>💼 {job.type}</span>
                    {job.postedDate && <span>📅 Posted: {job.postedDate}</span>}
                    {job.deadline && <span>⏰ Deadline: {job.deadline}</span>}
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm">
                      <span className="font-medium">{job.candidates}</span> candidates
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
