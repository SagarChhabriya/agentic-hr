/**
 * Consistent page header used across all recruiter pages.
 * Props:
 *   title       — main heading
 *   subtitle    — secondary line
 *   actions     — JSX rendered on the right (buttons, links etc.)
 *   badge       — small pill shown next to the title (e.g. count)
 */
export default function PageHeader({ title, subtitle, actions, badge }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
      <div className="flex items-center gap-3 min-w-0">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
            {badge != null && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{subtitle}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
