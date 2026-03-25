import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useQuery } from '@tanstack/react-query';
import { useTheme } from '../../contexts/ThemeContext';
import { applicationsApi, interviewsApi } from '../../services/api';
import { showToast } from '../../components/Toast';
import {
  isAssessmentPendingAndOpen,
  canJoinAiInterview,
  canJoinAiInterviewNow,
  isOfferResponseOpen,
} from '../../lib/candidateDeadlines';
import { formatDateKarachi, formatDateTimeKarachi } from '../../lib/datetimeKarachi';

const PIPELINE_STAGES = [
  { key: 'applied',    label: 'Applied',    color: 'bg-sky-500' },
  { key: 'assessment', label: 'Assessment', color: 'bg-amber-500' },
  { key: 'interview',  label: 'Interview',  color: 'bg-violet-500' },
  { key: 'selected',   label: 'Offer',      color: 'bg-emerald-500' },
  { key: 'hired',      label: 'Hired',      color: 'bg-green-600' },
];

const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied', assessment: 'Assessment', interview: 'Interview',
  selected: 'Offer Sent', hired: 'Hired', rejected: 'Not Selected', withdrawn: 'Withdrawn',
};

const STATUS_COLORS: Record<string, string> = {
  applied:    'bg-sky-50 text-sky-700 dark:bg-sky-900/20 dark:text-sky-400',
  assessment: 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400',
  interview:  'bg-violet-50 text-violet-700 dark:bg-violet-900/20 dark:text-violet-400',
  selected:   'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400',
  hired:      'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  rejected:   'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400',
  withdrawn:  'bg-gray-100 text-gray-500 dark:bg-slate-700 dark:text-slate-400',
};

function useGreeting() {
  const [greeting, setGreeting] = useState('');
  useEffect(() => {
    function compute() {
      const h = new Date().getHours();
      setGreeting(h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening');
    }
    compute();
    const id = setInterval(compute, 60_000);
    return () => clearInterval(id);
  }, []);
  return greeting;
}

function formatTimeUntil(iso: string): { text: string; urgent: boolean } {
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return { text: 'Started — join now', urgent: true };
  const sec = Math.floor(ms / 1000);
  const min = Math.floor(sec / 60);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day >= 1) return { text: `in ${day}d ${hr % 24}h`, urgent: false };
  if (hr >= 1) return { text: `in ${hr}h ${min % 60}m`, urgent: hr < 2 };
  return { text: `in ${min}m ${sec % 60}s`, urgent: true };
}

export default function CandidateDashboardPage() {
  const { user } = useUser();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const greeting = useGreeting();

  const { data: applications = [], isLoading, error } = useQuery({
    queryKey: ['applications', 'mine'],
    queryFn: applicationsApi.mine,
  });

  const { data: myInterviewsData } = useQuery({
    queryKey: ['interviews', 'mine'],
    queryFn: interviewsApi.mine,
  });

  // Live countdown tick every second
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const apps = applications as any[];
  const interviews: any[] = (myInterviewsData as any)?.interviews ?? [];

  const total = apps.length;
  const inProgress = apps.filter((a: any) => ['applied', 'assessment'].includes(a.status)).length;
  const interviewCount = apps.filter((a: any) => a.status === 'interview').length;
  const hired = apps.filter((a: any) => a.status === 'hired').length;

  const pipeline = PIPELINE_STAGES.reduce<Record<string, number>>((acc, s) => {
    acc[s.key] = apps.filter((a: any) => a.status === s.key).length;
    return acc;
  }, {});

  /** Scheduled AI interviews before the 30-minute join window has expired */
  const upcomingInterviews = interviews.filter((iv: any) => canJoinAiInterview(iv));
  /** Assessment required, within 24h window, not yet completed */
  const pendingAssessments = apps.filter((a: any) => isAssessmentPendingAndOpen(a));
  const pendingOffers = apps.filter(
    (a: any) => a.status === 'selected' && a.offer_sent_at && isOfferResponseOpen(a)
  );
  const inPersonScheduled = apps.filter((a: any) => a.in_person_scheduled_at);
  const recentApps = apps.slice(0, 6);

  const cardBg = isDark ? 'border-slate-700 bg-slate-800/80' : 'border-gray-200 bg-white shadow-sm';

  const STAT_CARDS = [
    {
      label: 'Total Applied', value: total, accent: 'border-l-sky-500',
      iconBg: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>,
    },
    {
      label: 'In Progress', value: inProgress, accent: 'border-l-amber-500',
      iconBg: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>,
    },
    {
      label: 'Interviews', value: interviewCount, accent: 'border-l-violet-500',
      iconBg: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>,
    },
    {
      label: hired > 0 ? 'Hired!' : 'Hired', value: hired, accent: 'border-l-emerald-500',
      iconBg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-red-500 text-sm">
        Failed to load dashboard. Please try again.
      </div>
    );
  }

  return (
    <div className={`max-w-5xl mx-auto px-4 py-8 ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {user?.firstName || user?.fullName || 'there'}
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Track your job search progress
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/jobs"
            onClick={() => showToast('Opening job search', 'info')}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity shadow-sm">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
            </svg>
            Browse Jobs
          </Link>
          <Link to="/candidate/profile"
            onClick={() => showToast('Opening profile', 'info')}
            className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            Profile
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {STAT_CARDS.map((s, i) => (
          <div key={i} className={`rounded-xl border-l-4 ${s.accent} p-4 hover:shadow-md transition-shadow ${isDark ? 'border-t border-r border-b border-slate-700 bg-slate-800/80' : 'border-t border-r border-b border-gray-100 bg-white shadow-sm'}`}>
            <div className="flex items-start justify-between">
              <div className={`p-2 rounded-lg ${s.iconBg}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">{s.icon}</svg>
              </div>
              <span className="text-2xl font-bold tabular-nums">{s.value}</span>
            </div>
            <p className={`mt-3 text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Pending job assessments — same urgency pattern as interview */}
      {pendingAssessments.length > 0 && (
        <div className="mb-6 space-y-3">
          {pendingAssessments.map((a: any) => (
            <div
              key={a.id}
              className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                isDark ? 'border-amber-700 bg-amber-900/20' : 'border-amber-200 bg-amber-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    isDark ? 'bg-amber-600' : 'bg-amber-500'
                  }`}
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                    />
                  </svg>
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>
                    {a.job_title}
                  </p>
                  <p
                    className={`text-xs mt-0.5 font-medium ${
                      isDark ? 'text-amber-300' : 'text-amber-800'
                    }`}
                  >
                    Assessment required — complete to move forward
                  </p>
                </div>
              </div>
              <Link
                to={`/assessment/attempt/${a.assessment_id}?application_id=${encodeURIComponent(a.id)}`}
                onClick={() => showToast('Opening assessment', 'info')}
                className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-amber-600 hover:bg-amber-700 text-white transition-colors"
              >
                Start
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming AI interviews — urgent banner */}
      {upcomingInterviews.length > 0 && (
        <div className="mb-6 space-y-3">
          {upcomingInterviews.map((iv: any) => {
            const { text, urgent } = formatTimeUntil(iv.scheduled_at);
            return (
              <div key={iv.id} className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
                urgent
                  ? isDark ? 'border-violet-700 bg-violet-900/20' : 'border-violet-200 bg-violet-50'
                  : cardBg
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${urgent ? 'bg-violet-500' : isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
                    <svg className={`w-5 h-5 ${urgent ? 'text-white' : isDark ? 'text-slate-300' : 'text-gray-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.868V15.13a1 1 0 01-1.447.9L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                    </svg>
                  </div>
                  <div>
                    <p className={`text-sm font-semibold ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{iv.job_title}</p>
                    <p className={`text-xs mt-0.5 font-medium ${urgent ? 'text-violet-600 dark:text-violet-400' : isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                      AI Interview · {text}
                    </p>
                  </div>
                </div>
                {canJoinAiInterviewNow(iv) ? (
                  <Link
                    to={`/interview/room/${iv.id}`}
                    onClick={() => showToast('Opening interview room', 'info')}
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                  >
                    Join
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ) : (
                  <span
                    className="shrink-0 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 dark:bg-slate-700/50 text-gray-500 dark:text-slate-400 cursor-not-allowed border border-gray-200 dark:border-slate-600"
                    title="Opens at the scheduled time (30-minute window after start)."
                  >
                    Not yet open
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pending offer callout */}
      {pendingOffers.length > 0 && (
        <div className={`mb-6 rounded-xl border p-4 ${isDark ? 'border-emerald-700/50 bg-emerald-900/10' : 'border-emerald-200 bg-emerald-50'}`}>
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <h3 className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">
              You have {pendingOffers.length} pending offer{pendingOffers.length > 1 ? 's' : ''}!
            </h3>
          </div>
          {pendingOffers.map((app: any) => (
            <div key={app.id} className="flex items-center justify-between py-1">
              <p className={`text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>{app.job_title}</p>
              <Link to="/candidate/applications"
                onClick={() => showToast('Opening My Applications', 'info')}
                className="text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:underline">
                Respond →
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* In-person interviews */}
      {inPersonScheduled.length > 0 && (
        <div className={`mb-6 rounded-xl border p-5 ${isDark ? 'border-blue-800/40 bg-blue-900/10' : 'border-blue-200 bg-blue-50'}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
            In-Person Interviews
          </h2>
          <div className="space-y-2">
            {inPersonScheduled.map((app: any) => {
              const isPast = new Date(app.in_person_scheduled_at) < new Date();
              return (
                <div key={app.id} className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm font-medium ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{app.job_title}</p>
                    <p className={`text-xs mt-0.5 ${isPast ? 'opacity-50' : isDark ? 'text-blue-300' : 'text-blue-700'}`}>
                      {isPast ? 'Was ' : ''}{formatDateTimeKarachi(app.in_person_scheduled_at)}
                    </p>
                    {app.in_person_notes && <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{app.in_person_notes}</p>}
                  </div>
                  {!isPast && <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">Upcoming</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pipeline overview */}
      {total > 0 && (
        <div className={`rounded-xl border p-5 mb-6 ${cardBg}`}>
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
            Your Pipeline
          </h2>
          <div className="flex items-start gap-1 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map((stage, idx) => {
              const count = pipeline[stage.key] || 0;
              return (
                <div key={stage.key} className="flex items-center gap-1 shrink-0">
                  <div className={`text-center min-w-[64px] transition-opacity ${count === 0 ? 'opacity-30' : ''}`}>
                    <div className={`w-11 h-11 rounded-full mx-auto flex items-center justify-center mb-1.5 ${count > 0 ? stage.color : isDark ? 'bg-slate-700' : 'bg-gray-200'}`}>
                      <span className="text-white text-sm font-bold">{count}</span>
                    </div>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{stage.label}</p>
                  </div>
                  {idx < PIPELINE_STAGES.length - 1 && (
                    <svg className={`w-4 h-4 shrink-0 mb-3 ${isDark ? 'text-slate-600' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                    </svg>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom grid: recent apps + quick actions */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Applications */}
        <div className={`lg:col-span-2 rounded-xl border ${cardBg}`}>
          <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <h2 className="text-sm font-semibold">Recent Applications</h2>
            <Link to="/candidate/applications"
              onClick={() => showToast('Opening My Applications', 'info')}
              className={`text-xs font-medium ${isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-600 hover:text-indigo-700'}`}>
              View all →
            </Link>
          </div>
          <div className={`divide-y ${isDark ? 'divide-slate-700' : 'divide-gray-100'}`}>
            {recentApps.length === 0 ? (
              <div className="py-12 text-center">
                <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No applications yet</p>
                <Link to="/jobs" onClick={() => showToast('Opening job search', 'info')} className={`text-xs font-medium mt-1 block ${isDark ? 'text-indigo-400' : 'text-indigo-600'} hover:underline`}>
                  Find your first job →
                </Link>
              </div>
            ) : (
              recentApps.map((app: any) => (
                <div key={app.id} className={`flex items-center gap-3 px-5 py-3.5 transition-colors ${isDark ? 'hover:bg-slate-700/50' : 'hover:bg-gray-50'}`}>
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500/20 to-violet-500/20 border border-indigo-300/20 flex items-center justify-center shrink-0">
                    <span className={`text-xs font-semibold ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                      {(app.job_title || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{app.job_title}</p>
                    <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>
                      {formatDateKarachi(app.applied_at)}
                    </p>
                  </div>
                  <span className={`shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[app.status] || 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-slate-400'}`}>
                    {STATUS_LABELS[app.status] ?? app.status}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="space-y-4">
          <div className={`rounded-xl border p-5 ${cardBg}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Link to="/jobs"
                onClick={() => showToast('Opening job search', 'info')}
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-indigo-500 to-violet-600 text-white hover:opacity-90 transition-opacity">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z"/>
                </svg>
                Browse Jobs
              </Link>
              {[
                { to: '/candidate/applications', label: 'My Applications', toast: 'Opening My Applications' },
                { to: '/candidate/profile', label: 'Edit Profile', toast: 'Opening profile' },
              ].map(a => (
                <Link key={a.to} to={a.to}
                  onClick={() => showToast(a.toast, 'info')}
                  className={`flex items-center justify-center w-full px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${isDark ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                  {a.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Tips card */}
          <div className={`rounded-xl border p-5 ${isDark ? 'border-indigo-800/40 bg-indigo-900/10' : 'border-indigo-100 bg-indigo-50/50'}`}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide mb-3 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>Tips</h2>
            <ul className={`space-y-2 text-xs ${isDark ? 'text-slate-400' : 'text-gray-600'}`}>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 mt-0.5 shrink-0">→</span>
                Keep your profile complete and resume updated to stand out.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 mt-0.5 shrink-0">→</span>
                Prepare for AI interviews with clear, structured answers.
              </li>
              <li className="flex items-start gap-1.5">
                <span className="text-indigo-500 mt-0.5 shrink-0">→</span>
                Check your email for assessment invitations.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
