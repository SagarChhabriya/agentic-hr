/**
 * Horizontal tab-style filter bar.
 * Props:
 *   tabs    — [{ value, label, count? }]
 *   active  — current active value
 *   onChange — (value) => void
 */
export default function TabFilter({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-0.5 border-b border-gray-200 dark:border-slate-700 mb-6 overflow-x-auto">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          onClick={() => onChange(tab.value)}
          className={`relative px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors
            ${active === tab.value
              ? 'text-indigo-600 dark:text-indigo-400 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-600 dark:after:bg-indigo-400'
              : 'text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-slate-100'
            }`}
        >
          {tab.label}
          {tab.count != null && (
            <span className={`ml-1.5 text-xs tabular-nums ${
              active === tab.value
                ? 'text-indigo-500 dark:text-indigo-400'
                : 'text-gray-400 dark:text-slate-500'
            }`}>
              {tab.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
