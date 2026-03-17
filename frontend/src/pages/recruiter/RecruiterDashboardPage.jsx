import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { useUser } from '@clerk/clerk-react';
import { dashboardApi } from '../../services/api';
import { JobsIcon, CandidatesIcon, AssessmentIcon, InterviewIcon, CheckIcon, RocketIcon } from '../../components/icons/IconComponents';

const PIPELINE_STAGES = [
  { key: 'applied', label: 'Applied', color: 'bg-blue-500' },
  { key: 'assessment', label: 'Assessment', color: 'bg-amber-500' },
  { key: 'interview', label: 'Interview', color: 'bg-purple-500' },
  { key: 'selected', label: 'Offer Sent', color: 'bg-emerald-500' },
  { key: 'hired', label: 'Hired', color: 'bg-green-600' },
];

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

export default function RecruiterDashboardPage() {
  const { theme } = useTheme();
  const { user } = useUser();
  const isDark = theme === 'dark';

  const { data, isLoading, error } = useQuery({
    queryKey: ['recruiter-dashboard'],
    queryFn: dashboardApi.recruiter,
    refetchInterval: 30000,
  });

  const stats = data?.stats || {
    totalJobs: 0,
    activeJobs: 0,
    totalCandidates: 0,
    pendingAssessments: 0,
    scheduledInterviews: 0,
    completedReviews: 0,
  };
  const pipeline = data?.pipeline || {};
  const todaysInterviews = data?.todaysInterviews || [];
  const recentJobs = data?.recentJobs || [];
  const recentCandidates = data?.recentCandidates || [];

  const maxPipelineCount = Math.max(1, ...PIPELINE_STAGES.map((s) => pipeline[s.key] || 0));

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
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

      {isLoading && (
        <div className="flex justify-center py-12 opacity-60">Loading dashboard data...</div>
      )}

      {error && (
        <div className={`rounded-lg border p-4 mb-6 ${isDark ? 'border-red-800 bg-red-900/20' : 'border-red-200 bg-red-50'}`}>
          <p className="text-red-600 dark:text-red-400 text-sm">
            Failed to load dashboard data. {error?.message || 'Please try again.'}
          </p>
        </div>
      )}

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
          title="Completed Reviews"
          value={stats.completedReviews}
          subtitle="Selected / Rejected"
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

      {/* Quick Actions */}
      <div className={`mb-8 rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <p className="text-sm opacity-75 mb-4">Get started by creating a job posting or managing your existing content</p>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/recruiter/jobs/new"
            className="px-6 py-3 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
          >
            + Create New Job
          </Link>
          <Link
            to="/recruiter/jobs"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            View All Jobs
          </Link>
          <Link
            to="/recruiter/questions"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            Manage Questions
          </Link>
          <Link
            to="/recruiter/assessments"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors hover:shadow-md ${
              isDark ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100' : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            Manage Assessments
          </Link>
        </div>
      </div>

      {/* Hiring Pipeline */}
      <div className={`mb-8 rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
        <h2 className="text-xl font-semibold mb-5">Hiring Pipeline</h2>
        <div className="grid grid-cols-5 gap-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const count = pipeline[stage.key] || 0;
            const barHeight = maxPipelineCount > 0 ? Math.max(8, Math.round((count / maxPipelineCount) * 80)) : 8;
            return (
              <div key={stage.key} className="flex flex-col items-center gap-2">
                <span className="text-lg font-bold">{count}</span>
                <div className="w-full flex flex-col items-center gap-1">
                  <div
                    className={`w-full rounded-t-md transition-all ${stage.color} opacity-90`}
                    style={{ height: `${barHeight}px` }}
                  />
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <svg className="w-3 h-3 text-gray-400 dark:text-slate-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10.293 15.707a1 1 0 010-1.414L14.586 10l-4.293-4.293a1 1 0 111.414-1.414l5 5a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
                <span className="text-xs text-center opacity-75 font-medium">{stage.label}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-slate-400">
          {pipeline['rejected'] != null && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-red-400 mr-1" />
              Rejected: {pipeline['rejected']}
            </span>
          )}
          {pipeline['withdrawn'] != null && (
            <span>
              <span className="inline-block w-2 h-2 rounded-full bg-gray-400 mr-1" />
              Withdrawn: {pipeline['withdrawn']}
            </span>
          )}
        </div>
      </div>

      {/* Today's Interviews */}
      {todaysInterviews.length > 0 && (
        <div className={`mb-8 rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Today&apos;s Interviews
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                {todaysInterviews.length}
              </span>
            </h2>
          </div>
          <div className="space-y-3">
            {todaysInterviews.map((iv) => (
              <Link
                key={iv.id}
                to={`/recruiter/candidates/${iv.application_id}`}
                className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:border-purple-300 dark:hover:border-purple-700 ${
                  isDark ? 'border-slate-700 bg-slate-900 hover:bg-slate-800' : 'border-gray-200 bg-gray-50 hover:bg-white'
                }`}
              >
                <div>
                  <p className="font-medium text-sm">{iv.candidate_name}</p>
                  <p className="text-xs opacity-75 mt-0.5">{iv.job_title}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">{formatTime(iv.scheduled_at)}</p>
                  <p className="text-xs opacity-60 capitalize">{iv.status}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Recent Jobs */}
        <div className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Jobs</h2>
            <Link to="/recruiter/jobs" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentJobs.length === 0 ? (
              <p className="text-sm opacity-60 py-4 text-center">No jobs yet. Create your first job posting!</p>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job.id}
                  className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
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
              ))
            )}
          </div>
        </div>

        {/* Recent Candidates */}
        <div className={`rounded-lg border p-6 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Candidates</h2>
            <Link to="/recruiter/candidates" className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {recentCandidates.length === 0 ? (
              <p className="text-sm opacity-60 py-4 text-center">No applications yet.</p>
            ) : (
              recentCandidates.map((candidate) => (
                <div
                  key={candidate.id}
                  className={`p-4 rounded-lg border ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium mb-1">{candidate.name}</h3>
                      <p className="text-sm opacity-75">{candidate.job}</p>
                      <p className="text-xs opacity-60 mt-1">Status: {candidate.status}</p>
                    </div>
                    {candidate.score !== null && candidate.score !== undefined && (
                      <div className="text-right">
                        <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                          {candidate.score}%
                        </div>
                        <div className="text-xs opacity-75">Score</div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
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
        <div className={`p-3 rounded-lg ${isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
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
