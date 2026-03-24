import { useTheme } from '../../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi, dashboardApi } from '../../services/api';

// ─── Mini chart helpers ────────────────────────────────────────────────────

function BarChart({ data, colorFn, maxVal }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const max = maxVal ?? Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="space-y-2">
      {data.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <p className={`text-xs w-28 shrink-0 text-right ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{item.label}</p>
          <div className={`flex-1 h-6 rounded-md overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
            <div
              className={`h-full rounded-md flex items-center pl-2 transition-all ${colorFn ? colorFn(item) : 'bg-indigo-500'}`}
              style={{ width: `${Math.max((item.value / max) * 100, item.value > 0 ? 4 : 0)}%` }}
            >
              {item.value > 0 && <span className="text-white text-xs font-bold">{item.value}</span>}
            </div>
          </div>
          {item.value === 0 && <span className={`text-xs ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>0</span>}
        </div>
      ))}
    </div>
  );
}

function DonutChart({ segments, size = 120 }) {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={size * 0.12} />
    </svg>
  );

  let cumAngle = -Math.PI / 2;
  const arcs = segments.map((seg) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumAngle);
    const y1 = cy + r * Math.sin(cumAngle);
    cumAngle += angle;
    const x2 = cx + r * Math.cos(cumAngle);
    const y2 = cy + r * Math.sin(cumAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { path: `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`, color: seg.color, value: seg.value };
  });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {arcs.map((arc, i) => <path key={i} d={arc.path} fill={arc.color} />)}
      <circle cx={cx} cy={cy} r={r * 0.62} fill="transparent" />
      <text x={cx} y={cy - 4} textAnchor="middle" className="fill-current" fontSize={size * 0.18} fontWeight="bold">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" className="fill-current opacity-50" fontSize={size * 0.1}>total</text>
    </svg>
  );
}

function FunnelStep({ label, value, max, color, pct }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{label}</p>
          <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{value}</span>
        </div>
        <div className={`h-3 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
          <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${Math.max(value > 0 ? 4 : 0, (value / max) * 100)}%` }} />
        </div>
        {pct !== undefined && (
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{pct}% conversion</p>
        )}
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────

export default function RecruiterAnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const { data: dashData, isLoading: dashLoading } = useQuery({
    queryKey: ['dashboard-recruiter'],
    queryFn: dashboardApi.recruiter,
  });
  const { data: jobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ['jobs-all'],
    queryFn: () => jobsApi.list(),
  });
  const { data: applications = [], isLoading: appsLoading } = useQuery({
    queryKey: ['applications-all'],
    queryFn: () => applicationsApi.list(),
  });

  const isLoading = dashLoading || jobsLoading || appsLoading;

  const cardCls = `rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;
  const headingCls = `text-xs font-semibold uppercase tracking-wide mb-4 ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  // ── Derived stats ──────────────────────────────────────────────────────

  // Jobs by status
  const jobsByStatus = [
    { label: 'Active', value: jobs.filter((j) => j.status === 'active').length, color: 'bg-emerald-500' },
    { label: 'Draft', value: jobs.filter((j) => j.status === 'draft').length, color: 'bg-amber-400' },
    { label: 'Closed', value: jobs.filter((j) => j.status === 'closed').length, color: 'bg-gray-400' },
  ];

  // Applications pipeline funnel
  const statusCounts = {
    applied:    applications.filter((a) => a.status === 'applied').length,
    assessment: applications.filter((a) => a.status === 'assessment_sent' || a.status === 'assessment_completed').length,
    interview:  applications.filter((a) => a.status === 'interview_scheduled' || a.status === 'interview_completed').length,
    offer:      applications.filter((a) => a.status === 'offer_sent' || a.status === 'offer_accepted').length,
    hired:      applications.filter((a) => a.status === 'hired').length,
    rejected:   applications.filter((a) => a.status === 'rejected' || a.status === 'withdrawn').length,
  };
  const totalApps = applications.length;
  const funnelMax = Math.max(totalApps, 1);

  const conv = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : 0;

  // Top jobs by applications
  const jobAppsMap: Record<string, { title: string; count: number }> = {};
  applications.forEach((app) => {
    const jid = app.job_id;
    if (!jid) return;
    const job = jobs.find((j) => j.id === jid);
    if (!jobAppsMap[jid]) jobAppsMap[jid] = { title: job?.title || 'Unknown', count: 0 };
    jobAppsMap[jid].count++;
  });
  const topJobs = Object.values(jobAppsMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const topJobsMax = Math.max(...topJobs.map((j) => j.count), 1);

  // Application status donut
  const donutSegments = [
    { label: 'Applied', value: statusCounts.applied, color: '#6366f1' },
    { label: 'Assessment', value: statusCounts.assessment, color: '#8b5cf6' },
    { label: 'Interview', value: statusCounts.interview, color: '#06b6d4' },
    { label: 'Offer', value: statusCounts.offer, color: '#10b981' },
    { label: 'Hired', value: statusCounts.hired, color: '#22c55e' },
    { label: 'Rejected', value: statusCounts.rejected, color: '#ef4444' },
  ].filter((s) => s.value > 0);

  // Avg interview score
  const scoredApps = applications.filter((a) => a.interview_score != null);
  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((s, a) => s + (a.interview_score || 0), 0) / scoredApps.length)
    : null;

  // Stat cards
  const stats = [
    { label: 'Total Jobs', value: jobs.length, sub: `${jobs.filter((j) => j.status === 'active').length} active`, color: 'text-indigo-500', bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50' },
    { label: 'Total Applications', value: totalApps, sub: `${statusCounts.applied} pending review`, color: 'text-violet-500', bg: isDark ? 'bg-violet-900/20' : 'bg-violet-50' },
    { label: 'Hired', value: statusCounts.hired, sub: `${conv(statusCounts.hired, totalApps)}% hire rate`, color: 'text-emerald-500', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50' },
    { label: 'Avg Interview Score', value: avgScore !== null ? `${avgScore}` : '—', sub: `from ${scoredApps.length} interviews`, color: 'text-amber-500', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={isDark ? 'text-slate-100' : 'text-gray-900'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold">Analytics</h1>
        <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Overview of your hiring pipeline and performance.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <span className={`text-lg font-bold ${s.color}`}>
                {s.label === 'Total Jobs' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
                  </svg>
                )}
                {s.label === 'Total Applications' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                )}
                {s.label === 'Hired' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                )}
                {s.label === 'Avg Interview Score' && (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
                  </svg>
                )}
              </span>
            </div>
            <p className={`text-2xl font-bold mb-0.5 ${s.color}`}>{s.value}</p>
            <p className={`text-xs font-medium ${isDark ? 'text-slate-500' : 'text-gray-500'}`}>{s.label}</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-600' : 'text-gray-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Main grid */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">

        {/* Hiring Funnel */}
        <div className={`lg:col-span-2 ${cardCls}`}>
          <p className={headingCls}>Hiring Funnel</p>
          <div className="space-y-3">
            <FunnelStep label="Applied" value={totalApps} max={funnelMax} color="bg-indigo-500" />
            <FunnelStep label="Assessment" value={statusCounts.assessment} max={funnelMax} color="bg-violet-500"
              pct={conv(statusCounts.assessment, totalApps)} />
            <FunnelStep label="Interview" value={statusCounts.interview} max={funnelMax} color="bg-cyan-500"
              pct={conv(statusCounts.interview, totalApps)} />
            <FunnelStep label="Offer" value={statusCounts.offer} max={funnelMax} color="bg-emerald-500"
              pct={conv(statusCounts.offer, totalApps)} />
            <FunnelStep label="Hired" value={statusCounts.hired} max={funnelMax} color="bg-green-500"
              pct={conv(statusCounts.hired, totalApps)} />
          </div>
          {totalApps === 0 && (
            <p className={`text-xs mt-4 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No applications yet.</p>
          )}
        </div>

        {/* Application status donut */}
        <div className={cardCls}>
          <p className={headingCls}>Status Breakdown</p>
          <div className="flex flex-col items-center gap-4">
            <DonutChart segments={donutSegments} size={130} />
            <div className="w-full space-y-1.5">
              {donutSegments.map((s) => (
                <div key={s.label} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className={`text-xs ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{s.label}</span>
                  </div>
                  <span className={`text-xs font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{s.value}</span>
                </div>
              ))}
              {donutSegments.length === 0 && (
                <p className={`text-xs text-center ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No data yet</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">

        {/* Jobs by status */}
        <div className={cardCls}>
          <p className={headingCls}>Jobs by Status</p>
          <BarChart
            data={jobsByStatus}
            maxVal={Math.max(...jobsByStatus.map((j) => j.value), 1)}
            colorFn={(item) => item.color}
          />
          {jobs.length === 0 && (
            <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No jobs yet.</p>
          )}
        </div>

        {/* Top jobs by applications */}
        <div className={cardCls}>
          <p className={headingCls}>Top Jobs by Applications</p>
          {topJobs.length > 0 ? (
            <BarChart
              data={topJobs.map((j) => ({ label: j.title.slice(0, 18) + (j.title.length > 18 ? '…' : ''), value: j.count }))}
              maxVal={topJobsMax}
              colorFn={() => 'bg-indigo-500'}
            />
          ) : (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No application data yet.</p>
          )}
        </div>

        {/* Rejection & withdrawal */}
        <div className={cardCls}>
          <p className={headingCls}>Rejected & Withdrawn</p>
          <div className="flex items-center gap-6">
            <div>
              <p className={`text-4xl font-bold text-red-500`}>{statusCounts.rejected}</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Rejected / Withdrawn</p>
            </div>
            <div className={`flex-1 h-px ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`} />
            <div className="text-right">
              <p className={`text-2xl font-bold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{conv(statusCounts.rejected, totalApps)}%</p>
              <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>of total applications</p>
            </div>
          </div>
        </div>

        {/* Score distribution */}
        <div className={cardCls}>
          <p className={headingCls}>Interview Score Distribution</p>
          {scoredApps.length > 0 ? (() => {
            const bands = [
              { label: '90–100', value: scoredApps.filter((a) => a.interview_score >= 90).length, color: 'bg-emerald-500' },
              { label: '75–89', value: scoredApps.filter((a) => a.interview_score >= 75 && a.interview_score < 90).length, color: 'bg-green-500' },
              { label: '50–74', value: scoredApps.filter((a) => a.interview_score >= 50 && a.interview_score < 75).length, color: 'bg-amber-500' },
              { label: 'Below 50', value: scoredApps.filter((a) => a.interview_score < 50).length, color: 'bg-red-400' },
            ];
            return <BarChart data={bands} maxVal={Math.max(...bands.map((b) => b.value), 1)} colorFn={(item) => item.color} />;
          })() : (
            <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No scored interviews yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
