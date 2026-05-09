import { useState, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useQuery } from '@tanstack/react-query';
import { jobsApi, applicationsApi } from '../../services/api';

// ─── Tooltip ───────────────────────────────────────────────────────────────

function Tooltip({ children, tip }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);

  const handleMove = (e) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div ref={ref} className="relative inline-block w-full"
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)} onMouseMove={handleMove}>
      {children}
      {show && tip && (
        <div className="pointer-events-none absolute z-50 px-2.5 py-1.5 rounded-lg bg-gray-900 dark:bg-slate-700 text-white text-xs font-medium shadow-xl whitespace-nowrap"
          style={{ left: pos.x + 12, top: pos.y - 36 }}>
          {tip}
          <div className="absolute left-1 top-full w-2 h-2 bg-gray-900 dark:bg-slate-700 rotate-45 -mt-1" />
        </div>
      )}
    </div>
  );
}

// ─── Interactive Horizontal Bar ────────────────────────────────────────────

function HBar({ label, value, max, color, pct, sublabel }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hovered, setHovered] = useState(false);
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 3 : 0) : 0;

  return (
    <div className={`group rounded-lg px-3 py-2.5 transition-colors cursor-default ${hovered ? (isDark ? 'bg-slate-700/60' : 'bg-gray-50') : ''}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}>
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-medium ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{label}</span>
        <div className="flex items-center gap-2">
          {pct !== undefined && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold transition-all ${hovered ? (isDark ? 'bg-indigo-900/60 text-indigo-300' : 'bg-indigo-100 text-indigo-700') : (isDark ? 'text-slate-500' : 'text-gray-400')}`}>
              {pct}%
            </span>
          )}
          <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{value}</span>
        </div>
      </div>
      <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-700' : 'bg-gray-100'}`}>
        <div className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${width}%`, opacity: hovered ? 1 : 0.85 }} />
      </div>
      {sublabel && <p className={`text-xs mt-1 ${isDark ? 'text-slate-600' : 'text-gray-300'}`}>{sublabel}</p>}
    </div>
  );
}

// ─── Funnel Visualization ──────────────────────────────────────────────────

function FunnelViz({ steps, isDark }) {
  const [hovered, setHovered] = useState(null);
  const maxVal = Math.max(...steps.map((s) => s.value), 1);

  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const widthPct = Math.max((step.value / maxVal) * 100, step.value > 0 ? 8 : 2);
        const isHovered = hovered === i;
        return (
          <div key={step.label} className="group cursor-default" onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <div className={`relative flex items-center rounded-lg overflow-hidden transition-all duration-200 h-10 ${isDark ? 'bg-slate-700/40' : 'bg-gray-100'}`}
              style={{ borderLeft: `3px solid ${step.color}` }}>
              {/* Fill */}
              <div className="absolute inset-y-0 left-0 transition-all duration-500 rounded-r-lg"
                style={{ width: `${widthPct}%`, backgroundColor: step.color, opacity: isHovered ? 0.35 : 0.2 }} />
              {/* Label */}
              <div className="relative flex items-center justify-between w-full px-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ backgroundColor: step.color }}>
                    {i + 1}
                  </span>
                  <span className={`text-sm font-medium ${isDark ? 'text-slate-200' : 'text-gray-700'}`}>{step.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  {step.pct !== undefined && (
                    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full transition-all ${isHovered ? 'opacity-100' : 'opacity-60'}`}
                      style={{ backgroundColor: step.color + '33', color: step.color }}>
                      {step.pct}% of total
                    </span>
                  )}
                  <span className={`text-sm font-bold tabular-nums ${isDark ? 'text-slate-100' : 'text-gray-900'}`}>{step.value}</span>
                </div>
              </div>
            </div>
            {/* Drop arrow between steps */}
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center h-3">
                <div className={`w-px h-full transition-colors ${isHovered || hovered === i + 1 ? 'bg-indigo-400' : (isDark ? 'bg-slate-700' : 'bg-gray-200')}`} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Interactive Donut ────────────────────────────────────────────────────

function InteractiveDonut({ segments, size = 160 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [hovered, setHovered] = useState(null);
  const cx = size / 2, cy = size / 2;
  const r = size * 0.36;
  const strokeW = size * 0.14;
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={strokeW} />
        <text x={cx} y={cy + 5} textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} fontSize={11}>No data</text>
      </svg>
    </div>
  );

  const circumference = 2 * Math.PI * r;
  let cumOffset = 0;
  const arcs = segments.map((seg, i) => {
    const dash = (seg.value / total) * circumference;
    const gap = circumference - dash;
    const rotation = (cumOffset / circumference) * 360 - 90;
    cumOffset += dash;
    return { dash, gap, rotation, color: seg.color, label: seg.label, value: seg.value, i };
  });

  const hovSeg = hovered !== null ? segments[hovered] : null;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ overflow: 'visible' }}>
          {arcs.map((arc) => (
            <circle key={arc.i} cx={cx} cy={cy} r={r}
              fill="none" stroke={arc.color} strokeWidth={hovered === arc.i ? strokeW * 1.25 : strokeW}
              strokeDasharray={`${arc.dash} ${arc.gap}`}
              strokeDashoffset={0}
              transform={`rotate(${arc.rotation} ${cx} ${cy})`}
              style={{ transition: 'stroke-width 0.2s, opacity 0.2s', opacity: hovered !== null && hovered !== arc.i ? 0.4 : 1, cursor: 'pointer' }}
              onMouseEnter={() => setHovered(arc.i)} onMouseLeave={() => setHovered(null)}
            />
          ))}
          {/* Center text */}
          <text x={cx} y={cy - 8} textAnchor="middle" fill={isDark ? '#f1f5f9' : '#1e293b'} fontSize={size * 0.14} fontWeight="bold">
            {hovSeg ? hovSeg.value : total}
          </text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize={size * 0.085}>
            {hovSeg ? hovSeg.label : 'total'}
          </text>
          {hovSeg && (
            <text x={cx} y={cy + 24} textAnchor="middle" fill={hovSeg.color} fontSize={size * 0.085} fontWeight="600">
              {Math.round((hovSeg.value / total) * 100)}%
            </text>
          )}
        </svg>
      </div>
      {/* Legend */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 w-full">
        {segments.map((s, i) => (
          <div key={s.label} className={`flex items-center gap-1.5 cursor-default rounded px-1 py-0.5 transition-colors ${hovered === i ? (isDark ? 'bg-slate-700' : 'bg-gray-100') : ''}`}
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
            <span className={`text-xs truncate ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{s.label}</span>
            <span className={`text-xs font-bold ml-auto shrink-0 ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Score Gauge ──────────────────────────────────────────────────────────

function ScoreGauge({ score, size = 140 }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  if (score === null) return (
    <div className="flex items-center justify-center h-24">
      <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No interview scores yet</p>
    </div>
  );
  const cx = size / 2, cy = size * 0.62;
  const r = size * 0.38;
  const startAngle = -Math.PI;
  const endAngle = 0;
  const valueAngle = startAngle + (score / 100) * Math.PI;
  const arcPath = (a1, a2, ri) => {
    const x1 = cx + ri * Math.cos(a1), y1 = cy + ri * Math.sin(a1);
    const x2 = cx + ri * Math.cos(a2), y2 = cy + ri * Math.sin(a2);
    const large = Math.abs(a2 - a1) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${ri} ${ri} 0 ${large} 1 ${x2} ${y2}`;
  };
  const color = score >= 75 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
  const needleX = cx + r * 0.72 * Math.cos(valueAngle);
  const needleY = cy + r * 0.72 * Math.sin(valueAngle);

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.68} viewBox={`0 0 ${size} ${size * 0.68}`}>
        {/* Track */}
        <path d={arcPath(startAngle, endAngle, r)} fill="none"
          stroke={isDark ? '#334155' : '#e2e8f0'} strokeWidth={size * 0.1} strokeLinecap="round" />
        {/* Value arc */}
        <path d={arcPath(startAngle, valueAngle, r)} fill="none"
          stroke={color} strokeWidth={size * 0.1} strokeLinecap="round" />
        {/* Zone markers */}
        {[0, 50, 75, 100].map((v) => {
          const a = startAngle + (v / 100) * Math.PI;
          const xi = cx + (r - size * 0.07) * Math.cos(a);
          const yi = cy + (r - size * 0.07) * Math.sin(a);
          return <circle key={v} cx={xi} cy={yi} r={2} fill={isDark ? '#64748b' : '#94a3b8'} />;
        })}
        {/* Needle */}
        <line x1={cx} y1={cy} x2={needleX} y2={needleY}
          stroke={color} strokeWidth={2.5} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={5} fill={color} />
        {/* Score */}
        <text x={cx} y={cy - 16} textAnchor="middle" fill={color} fontSize={size * 0.2} fontWeight="bold">{score}</text>
        <text x={cx} y={cy - 2} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize={size * 0.09}>avg score</text>
        {/* Labels */}
        <text x={cx - r - 2} y={cy + 14} textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} fontSize={8}>0</text>
        <text x={cx + r + 2} y={cy + 14} textAnchor="middle" fill={isDark ? '#64748b' : '#94a3b8'} fontSize={8}>100</text>
      </svg>
      <div className="flex gap-3 mt-1">
        {[{ c: '#ef4444', l: '0–49' }, { c: '#f59e0b', l: '50–74' }, { c: '#22c55e', l: '75–100' }].map((z) => (
          <div key={z.l} className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: z.c }} />
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{z.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Column Chart (score distribution) ────────────────────────────────────

function ColumnChart({ bands, isDark }) {
  const [hovered, setHovered] = useState(null);
  const max = Math.max(...bands.map((b) => b.value), 1);
  return (
    <div className="flex items-end justify-around gap-2 h-32">
      {bands.map((b, i) => {
        const h = Math.max((b.value / max) * 100, b.value > 0 ? 8 : 2);
        const isHov = hovered === i;
        return (
          <div key={b.label} className="flex flex-col items-center gap-1 flex-1 cursor-default"
            onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)}>
            {isHov && (
              <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isDark ? 'bg-slate-700 text-slate-200' : 'bg-gray-100 text-gray-800'}`}>
                {b.value}
              </span>
            )}
            {!isHov && <span className="h-5" />}
            <div className="w-full rounded-t-md transition-all duration-300"
              style={{ height: `${h}%`, backgroundColor: b.color, opacity: isHov ? 1 : 0.75 }} />
            <span className={`text-xs text-center leading-tight ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>{b.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── Mini Area Sparkline ──────────────────────────────────────────────────

function AreaSparkline({ data, color = '#6366f1', isDark }) {
  if (!data || data.length < 2) return (
    <div className="flex items-center justify-center h-16">
      <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Not enough data</p>
    </div>
  );
  const W = 300, H = 60, pad = 4;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pts = data.map((d, i) => {
    const x = pad + (i / (data.length - 1)) * (W - pad * 2);
    const y = H - pad - ((d.value / max) * (H - pad * 2));
    return [x, y];
  });
  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const areaPath = `${linePath} L ${pts[pts.length - 1][0]} ${H} L ${pts[0][0]} ${H} Z`;

  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ height: 64 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={p[0]} cy={p[1]} r={3} fill={color}
          className="transition-all" />
      ))}
    </svg>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function groupByMonth(items, dateField = 'created_at') {
  const now = new Date();
  const result = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    result.push({ label: MONTHS[d.getMonth()], key, value: 0 });
  }
  items.forEach((item) => {
    const raw = item[dateField];
    if (!raw) return;
    const d = new Date(raw);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const slot = result.find((r) => r.key === key);
    if (slot) slot.value++;
  });
  return result;
}

// ─── Main ─────────────────────────────────────────────────────────────────

export default function RecruiterAnalyticsPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [timeFilter, setTimeFilter] = useState('all');

  const { data: jobs = [], isLoading: jobsLoading } = useQuery({ queryKey: ['jobs-all'], queryFn: () => jobsApi.list() });
  const { data: rawApps = [], isLoading: appsLoading } = useQuery({ queryKey: ['applications-all'], queryFn: () => applicationsApi.list() });

  const isLoading = jobsLoading || appsLoading;

  // Time filter
  const applications = rawApps.filter((a) => {
    if (timeFilter === 'all') return true;
    const created = new Date(a.created_at || a.applied_at || 0);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (timeFilter === '7d' ? 7 : 30));
    return created >= cutoff;
  });

  const conv = (n, d) => d > 0 ? Math.round((n / d) * 100) : 0;

  const statusCounts = {
    applied:    applications.filter((a) => a.status === 'applied').length,
    assessment: applications.filter((a) => ['assessment_sent','assessment_completed'].includes(a.status)).length,
    interview:  applications.filter((a) => ['interview_scheduled','interview_completed'].includes(a.status)).length,
    offer:      applications.filter((a) => ['offer_sent','offer_accepted'].includes(a.status)).length,
    hired:      applications.filter((a) => a.status === 'hired').length,
    rejected:   applications.filter((a) => ['rejected','withdrawn'].includes(a.status)).length,
  };
  const totalApps = applications.length;
  const scoredApps = applications.filter((a) => a.interview_score != null);
  const avgScore = scoredApps.length > 0
    ? Math.round(scoredApps.reduce((s, a) => s + (a.interview_score || 0), 0) / scoredApps.length)
    : null;

  // Applications over time
  const appsOverTime = groupByMonth(applications, 'created_at');

  // Top jobs
  const jobAppsMap = {};
  applications.forEach((app) => {
    const jid = app.job_id; if (!jid) return;
    const job = jobs.find((j) => j.id === jid);
    if (!jobAppsMap[jid]) jobAppsMap[jid] = { title: job?.title || 'Unknown', count: 0, hired: 0 };
    jobAppsMap[jid].count++;
    if (app.status === 'hired') jobAppsMap[jid].hired++;
  });
  const topJobs = Object.values(jobAppsMap).sort((a, b) => b.count - a.count).slice(0, 6);

  const donutSegments = [
    { label: 'Applied',    value: statusCounts.applied,    color: '#6366f1' },
    { label: 'Assessment', value: statusCounts.assessment, color: '#8b5cf6' },
    { label: 'Interview',  value: statusCounts.interview,  color: '#06b6d4' },
    { label: 'Offer',      value: statusCounts.offer,      color: '#10b981' },
    { label: 'Hired',      value: statusCounts.hired,      color: '#22c55e' },
    { label: 'Rejected',   value: statusCounts.rejected,   color: '#ef4444' },
  ].filter((s) => s.value > 0);

  const funnelSteps = [
    { label: 'Applications', value: totalApps,               color: '#6366f1', pct: 100 },
    { label: 'Assessment',   value: statusCounts.assessment, color: '#8b5cf6', pct: conv(statusCounts.assessment, totalApps) },
    { label: 'Interview',    value: statusCounts.interview,  color: '#06b6d4', pct: conv(statusCounts.interview, totalApps) },
    { label: 'Offer Sent',   value: statusCounts.offer,      color: '#10b981', pct: conv(statusCounts.offer, totalApps) },
    { label: 'Hired',        value: statusCounts.hired,      color: '#22c55e', pct: conv(statusCounts.hired, totalApps) },
  ];

  const scoreBands = [
    { label: '90–100', value: scoredApps.filter((a) => a.interview_score >= 90).length, color: '#22c55e' },
    { label: '75–89',  value: scoredApps.filter((a) => a.interview_score >= 75 && a.interview_score < 90).length, color: '#10b981' },
    { label: '50–74',  value: scoredApps.filter((a) => a.interview_score >= 50 && a.interview_score < 75).length, color: '#f59e0b' },
    { label: '<50',    value: scoredApps.filter((a) => a.interview_score < 50).length, color: '#ef4444' },
  ];

  const jobsByStatus = [
    { label: 'Active', value: jobs.filter((j) => j.status === 'active').length, color: 'bg-emerald-500' },
    { label: 'Draft',  value: jobs.filter((j) => j.status === 'draft').length,  color: 'bg-amber-400'  },
    { label: 'Closed', value: jobs.filter((j) => j.status === 'closed').length, color: 'bg-slate-400'  },
  ];

  const cardCls = `rounded-xl border ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white shadow-sm'}`;
  const headingCls = `text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-gray-500'}`;

  const stats = [
    { label: 'Total Jobs',      value: jobs.length,                       sub: `${jobs.filter((j) => j.status === 'active').length} active`,  color: '#6366f1', bg: isDark ? 'bg-indigo-900/20' : 'bg-indigo-50',  icon: 'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Applications',    value: totalApps,                         sub: `${statusCounts.applied} pending`,                             color: '#8b5cf6', bg: isDark ? 'bg-violet-900/20' : 'bg-violet-50',  icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z' },
    { label: 'Hired',           value: statusCounts.hired,                sub: `${conv(statusCounts.hired, totalApps)}% hire rate`,           color: '#22c55e', bg: isDark ? 'bg-emerald-900/20' : 'bg-emerald-50', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
    { label: 'Avg Score',       value: avgScore !== null ? `${avgScore}` : 'N/A', sub: `${scoredApps.length} interviews scored`,              color: '#f59e0b', bg: isDark ? 'bg-amber-900/20' : 'bg-amber-50',   icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  ];

  if (isLoading) return (
    <div className="flex justify-center py-20">
      <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className={isDark ? 'text-slate-100' : 'text-gray-900'}>

      {/* Header + time filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold">Analytics</h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>Interactive hiring pipeline insights.</p>
        </div>
        <div className={`inline-flex rounded-lg border p-0.5 gap-0.5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-gray-50'}`}>
          {[['all', 'All time'], ['30d', 'Last 30d'], ['7d', 'Last 7d']].map(([val, lbl]) => (
            <button key={val} onClick={() => setTimeFilter(val)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${timeFilter === val
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-800'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className={`rounded-xl border p-4 transition-all hover:shadow-md group cursor-default ${isDark ? 'border-slate-700 bg-slate-800 hover:border-slate-600' : 'border-gray-200 bg-white shadow-sm hover:shadow-md'}`}>
            <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center mb-3`}>
              <svg className="w-5 h-5" style={{ color: s.color }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon}/>
              </svg>
            </div>
            <p className="text-2xl font-bold mb-0.5 tabular-nums" style={{ color: s.color }}>{s.value}</p>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-300' : 'text-gray-700'}`}>{s.label}</p>
            <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Row 1: Funnel + Donut */}
      <div className="grid lg:grid-cols-5 gap-5 mb-5">
        <div className={`lg:col-span-3 ${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-4">
            <p className={headingCls}>Hiring Funnel</p>
            <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>Hover to explore</span>
          </div>
          {totalApps > 0 ? (
            <FunnelViz steps={funnelSteps} isDark={isDark} />
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className={`text-sm ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No applications yet</p>
            </div>
          )}
        </div>

        <div className={`lg:col-span-2 ${cardCls} p-5`}>
          <p className={`${headingCls} mb-4`}>Status Breakdown</p>
          <InteractiveDonut segments={donutSegments} size={150} />
        </div>
      </div>

      {/* Row 2: Applications over time + Score gauge */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className={`lg:col-span-2 ${cardCls} p-5`}>
          <div className="flex items-center justify-between mb-1">
            <p className={headingCls}>Applications Over Time</p>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-900/40 text-indigo-300' : 'bg-indigo-50 text-indigo-600'}`}>
              Last 6 months
            </span>
          </div>
          <div className="flex items-end justify-between mb-1 mt-3">
            {appsOverTime.map((m) => (
              <Tooltip key={m.key} tip={`${m.label}: ${m.value} application${m.value !== 1 ? 's' : ''}`}>
                <div className="flex flex-col items-center gap-1 flex-1 cursor-default group">
                  <span className={`text-xs font-bold tabular-nums opacity-0 group-hover:opacity-100 transition-opacity ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`}>
                    {m.value}
                  </span>
                  <div className="w-full px-1">
                    <div className={`w-full rounded-t transition-all duration-500 group-hover:opacity-100 ${isDark ? 'bg-indigo-500/70 group-hover:bg-indigo-400' : 'bg-indigo-400/60 group-hover:bg-indigo-500'}`}
                      style={{ height: `${Math.max((m.value / Math.max(...appsOverTime.map((x) => x.value), 1)) * 80, m.value > 0 ? 6 : 2)}px` }} />
                  </div>
                  <span className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{m.label}</span>
                </div>
              </Tooltip>
            ))}
          </div>
          <div className={`mt-3 pt-3 border-t ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <AreaSparkline data={appsOverTime} color="#6366f1" isDark={isDark} />
          </div>
        </div>

        <div className={`${cardCls} p-5`}>
          <p className={`${headingCls} mb-4`}>Interview Score</p>
          <ScoreGauge score={avgScore} size={150} />
          {avgScore !== null && (
            <div className={`mt-3 pt-3 border-t text-center ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
                Based on <span className="font-semibold">{scoredApps.length}</span> interview{scoredApps.length !== 1 ? 's' : ''}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Row 3: Score dist + Jobs by status + Top jobs */}
      <div className="grid lg:grid-cols-3 gap-5 mb-5">
        <div className={`${cardCls} p-5`}>
          <p className={`${headingCls} mb-4`}>Score Distribution</p>
          {scoredApps.length > 0 ? (
            <ColumnChart bands={scoreBands} isDark={isDark} />
          ) : (
            <div className="flex items-center justify-center h-32">
              <p className={`text-xs ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No scored interviews yet</p>
            </div>
          )}
        </div>

        <div className={`${cardCls} p-5`}>
          <p className={`${headingCls} mb-2`}>Jobs by Status</p>
          <div className="space-y-1 mt-2">
            {jobsByStatus.map((j) => (
              <HBar key={j.label} label={j.label} value={j.value}
                max={Math.max(...jobsByStatus.map((x) => x.value), 1)}
                color={j.color} />
            ))}
          </div>
          {jobs.length === 0 && <p className={`text-xs mt-2 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>No jobs yet</p>}
        </div>

        <div className={`${cardCls} p-5`}>
          <p className={`${headingCls} mb-1`}>Rejection Rate</p>
          <div className="flex flex-col items-center justify-center h-32 gap-3">
            <div className="relative w-24 h-24">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke={isDark ? '#334155' : '#f1f5f9'} strokeWidth="3.5" />
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#ef4444" strokeWidth="3.5"
                  strokeDasharray={`${conv(statusCounts.rejected, totalApps)} ${100 - conv(statusCounts.rejected, totalApps)}`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-red-500">{conv(statusCounts.rejected, totalApps)}%</span>
              </div>
            </div>
            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-gray-500'}`}>
              {statusCounts.rejected} of {totalApps} applications
            </p>
          </div>
        </div>
      </div>

      {/* Row 4: Top jobs table */}
      {topJobs.length > 0 && (
        <div className={`${cardCls} p-5`}>
          <p className={`${headingCls} mb-4`}>Top Jobs by Applications</p>
          <div className="space-y-2">
            {topJobs.map((j, i) => (
              <HBar key={j.title} label={`${i + 1}. ${j.title.slice(0, 30)}${j.title.length > 30 ? '…' : ''}`}
                value={j.count} max={topJobs[0].count}
                color="bg-gradient-to-r from-indigo-500 to-violet-500"
                sublabel={j.hired > 0 ? `${j.hired} hired` : undefined} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
