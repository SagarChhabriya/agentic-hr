export function SkeletonLine({ className = '' }) {
  return (
    <div className={`animate-pulse rounded bg-gray-200 dark:bg-slate-700 ${className}`} />
  );
}

export function SkeletonCard({ isDark }) {
  return (
    <div className={`rounded-xl border p-5 ${isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-100 bg-white'}`}>
      <div className="flex items-start justify-between mb-4">
        <SkeletonLine className="h-4 w-32" />
        <SkeletonLine className="h-5 w-16 rounded-full" />
      </div>
      <SkeletonLine className="h-3 w-48 mb-2" />
      <SkeletonLine className="h-3 w-36" />
    </div>
  );
}

export function SkeletonTableRows({ rows = 5, cols = 5 }) {
  return Array.from({ length: rows }).map((_, i) => (
    <tr key={i}>
      {Array.from({ length: cols }).map((__, j) => (
        <td key={j} className="px-4 py-3">
          <div className="animate-pulse h-3 rounded bg-gray-200 dark:bg-slate-700" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  ));
}
