import { Link } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '@clerk/clerk-react';
import { JobsIcon, CandidatesIcon, AssessmentIcon, InterviewIcon, CheckIcon, RocketIcon } from '../../components/icons/IconComponents';

export default function RecruiterDashboardPage() {
  const { theme } = useTheme();
  const { user } = useUser();
  const isDark = theme === 'dark';
  
  // Check both metadata locations for role
  const userRole = user?.publicMetadata?.role || user?.unsafeMetadata?.role;

  // Mock data - replace with actual API calls
  const stats = {
    totalJobs: 12,
    activeJobs: 8,
    totalCandidates: 156,
    pendingAssessments: 23,
    scheduledInterviews: 7,
    completedInterviews: 45,
  };

  const recentJobs = [
    { id: 1, title: 'Senior Frontend Engineer', candidates: 42, status: 'active' },
    { id: 2, title: 'Backend Developer', candidates: 28, status: 'active' },
    { id: 3, title: 'Product Manager', candidates: 15, status: 'draft' },
  ];

  const recentCandidates = [
    { id: 1, name: 'John Doe', job: 'Senior Frontend Engineer', status: 'Assessment', score: 85 },
    { id: 2, name: 'Jane Smith', job: 'Backend Developer', status: 'Interview', score: 92 },
    { id: 3, name: 'Bob Johnson', job: 'Product Manager', status: 'Applied', score: null },
  ];

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              Welcome back, {user?.firstName || user?.fullName || 'Recruiter'}!
            </h1>
            <p className="text-sm opacity-75">Here's an overview of your hiring pipeline</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm opacity-75">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Last updated: {new Date().toLocaleDateString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <StatCard
          title="Total Jobs"
          value={stats.totalJobs}
          subtitle={`${stats.activeJobs} active`}
          icon={<JobsIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Total Candidates"
          value={stats.totalCandidates}
          subtitle="Across all jobs"
          icon={<CandidatesIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Pending Assessments"
          value={stats.pendingAssessments}
          subtitle="Awaiting completion"
          icon={<AssessmentIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Scheduled Interviews"
          value={stats.scheduledInterviews}
          subtitle="Upcoming sessions"
          icon={<InterviewIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Completed Interviews"
          value={stats.completedInterviews}
          subtitle="Ready for review"
          icon={<CheckIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Active Jobs"
          value={stats.activeJobs}
          subtitle="Currently hiring"
          icon={<RocketIcon className="w-8 h-8" />}
          isDark={isDark}
        />
      </div>

      {/* Quick Actions - Prominent Section */}
      <div className={`mb-8 rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <p className="text-sm opacity-75 mb-4">Get started by creating a job posting or managing your existing content</p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/recruiter/jobs/new"
            className={`px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg ${
              isDark
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            + Create New Job
          </Link>
          <Link
            to="/recruiter/jobs"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark
                ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            View All Jobs
          </Link>
          <Link
            to="/recruiter/questions"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark
                ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            Manage Questions
          </Link>
          <Link
            to="/recruiter/assessments"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark
                ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            Manage Assessments
          </Link>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <div className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Jobs</h2>
            <Link
              to="/recruiter/jobs"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentJobs.map((job) => (
              <div
                key={job.id}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{job.title}</h3>
                    <p className="text-sm opacity-75">{job.candidates} candidates</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      job.status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Candidates</h2>
            <Link
              to="/recruiter/candidates"
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentCandidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{candidate.name}</h3>
                    <p className="text-sm opacity-75">{candidate.job}</p>
                    <p className="text-xs opacity-60 mt-1">Status: {candidate.status}</p>
                  </div>
                  {candidate.score !== null && (
                    <div className="text-right">
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {candidate.score}%
                      </div>
                      <div className="text-xs opacity-75">Score</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon, isDark }) {
  return (
    <div
      className={`rounded-lg border p-6 transition-all hover:shadow-lg hover:scale-105 ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${
          isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
        }`}>
          {icon}
        </div>
        <div className="text-right">
          <div className={`text-3xl font-bold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
            {value}
          </div>
        </div>
      </div>
      <h3 className={`font-semibold mb-1 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
        {title}
      </h3>
      <p className={`text-sm ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>{subtitle}</p>
    </div>
  );
}
