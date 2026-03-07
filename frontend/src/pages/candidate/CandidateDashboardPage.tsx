import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, interviewsApi } from '../../services/api';
import { JobsIcon, AssessmentIcon, InterviewIcon, CheckIcon } from '../../components/icons/IconComponents';

export default function CandidateDashboardPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: applicationsApi.mine,
  });

  const { data: myInterviewsData } = useQuery({
    queryKey: ['interviews', 'mine'],
    queryFn: interviewsApi.mine,
  });

  const total = applications.length;
  const pending = applications.filter((a) => a.status === 'applied' || a.status === 'assessment').length;
  const interviews = applications.filter((a) => a.status === 'interview').length;
  const selected = applications.filter((a) => a.status === 'selected').length;

  const upcomingInterviews: Array<{
    id: string;
    application_id: string;
    job_title: string;
    scheduled_at: string;
    duration_minutes: number;
    status: string;
  }> = (myInterviewsData as any)?.interviews ?? [];

  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const recentApplications = applications.slice(0, 5);

  function formatTimeUntil(scheduledAtIso: string): string {
    const target = new Date(scheduledAtIso).getTime();
    const now = Date.now();
    const ms = target - now;
    if (ms <= 0) return 'Started — join now';
    const sec = Math.floor(ms / 1000);
    const min = Math.floor(sec / 60);
    const hr = Math.floor(min / 60);
    const day = Math.floor(hr / 24);
    if (day >= 1) return `${day} day${day !== 1 ? 's' : ''} remaining`;
    if (hr >= 1) return `${hr} hour${hr !== 1 ? 's' : ''} remaining`;
    if (min >= 1) return `${min} minute${min !== 1 ? 's' : ''} remaining`;
    return `${sec} second${sec !== 1 ? 's' : ''} remaining`;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[40vh]">
        <div className="text-lg text-gray-600 dark:text-slate-400">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-4 py-8">
        <div className="max-w-4xl mx-auto text-center text-red-600 dark:text-red-400">
          Failed to load applications. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className={`px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.firstName || user?.fullName || 'Candidate'}!
        </h1>
        <p className="text-sm opacity-75">Track your applications and job search progress</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Applications"
          value={total}
          subtitle="All time"
          icon={<JobsIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Pending"
          value={pending}
          subtitle="Awaiting review"
          icon={<AssessmentIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Interviews"
          value={interviews}
          subtitle="Scheduled"
          icon={<InterviewIcon className="w-8 h-8" />}
          isDark={isDark}
        />
        <StatCard
          title="Selected"
          value={selected}
          subtitle="Offers received"
          icon={<CheckIcon className="w-8 h-8" />}
          isDark={isDark}
        />
      </div>

      <div
        className={`mb-8 rounded-lg border p-6 ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'
        }`}
      >
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="flex flex-wrap gap-4">
          <Link
            to="/jobs"
            className="px-6 py-3 rounded-lg font-medium bg-blue-600 hover:bg-blue-700 text-white transition-colors"
          >
            Browse Jobs
          </Link>
          <Link
            to="/candidate/profile"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors ${
              isDark
                ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            My Profile
          </Link>
          <Link
            to="/candidate/applications"
            className={`px-6 py-3 rounded-lg font-medium border transition-colors ${
              isDark
                ? 'border-slate-600 bg-slate-700 hover:bg-slate-600 text-slate-100'
                : 'border-gray-300 bg-white hover:bg-gray-50 text-gray-900'
            }`}
          >
            My Applications
          </Link>
        </div>
      </div>

      {/* Upcoming AI Interviews */}
      <div
        className={`mb-8 rounded-lg border p-6 ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <InterviewIcon className="w-5 h-5" />
            Upcoming AI Interviews
          </h2>
          <span className="text-xs px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
            Candidate side
          </span>
        </div>
        {upcomingInterviews.length === 0 ? (
          <p className="text-sm opacity-75">
            You don&apos;t have any AI interviews scheduled yet. When a recruiter schedules one, it will
            appear here and you&apos;ll also get an email with the join link.
          </p>
        ) : (
          <div className="space-y-3">
            {upcomingInterviews.map((iv) => {
              let when = iv.scheduled_at;
              try {
                when = new Date(iv.scheduled_at).toLocaleString();
              } catch {}
              const timeLeft = formatTimeUntil(iv.scheduled_at);
              return (
                <div
                  key={iv.id}
                  className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 rounded-lg border ${
                    isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div>
                    <p className="font-medium">{iv.job_title}</p>
                    <p className="text-xs opacity-75">
                      Scheduled at {when} · {iv.duration_minutes} min
                    </p>
                    <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mt-1">
                      {timeLeft}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium capitalize ${
                        iv.status === 'scheduled'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {iv.status}
                    </span>
                    <Link
                      to={`/interview/room/${iv.id}`}
                      className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white"
                    >
                      Join / Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div
        className={`rounded-lg border p-6 ${
          isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Applications</h2>
          <Link
            to="/candidate/applications"
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all
          </Link>
        </div>
        {recentApplications.length === 0 ? (
          <p className="text-gray-600 dark:text-slate-400 py-4">
            No applications yet. <Link to="/jobs" className="text-blue-600 dark:text-blue-400 hover:underline">Browse jobs</Link> to get started.
          </p>
        ) : (
          <div className="space-y-4">
            {recentApplications.map((app) => (
              <div
                key={app.id}
                className={`p-4 rounded-lg border ${
                  isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium mb-1">{app.job_title}</h3>
                    <p className="text-sm opacity-75">
                      {app.job_location && `${app.job_location} · `}
                      Applied {new Date(app.applied_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      app.status === 'selected'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                        : app.status === 'interview'
                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
                        : app.status === 'rejected'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {app.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  subtitle,
  icon,
  isDark,
}: {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ReactNode;
  isDark: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-6 transition-all hover:shadow-lg ${
        isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-lg ${
            isDark ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'
          }`}
        >
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
