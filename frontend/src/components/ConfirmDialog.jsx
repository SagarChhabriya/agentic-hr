import { useTheme } from '../contexts/ThemeContext';

/**
 * In-app confirmation modal (replaces window.confirm).
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  if (!open) return null;

  const confirmBtn = danger
    ? 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500/40'
    : 'bg-indigo-600 hover:bg-indigo-700 text-white focus:ring-indigo-500/40';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/50 cursor-default"
        onClick={onCancel}
        aria-label="Close dialog"
      />
      <div
        className={`relative max-w-md w-full rounded-xl border shadow-xl p-6 text-left ${
          isDark ? 'bg-slate-800 border-slate-700 text-slate-100' : 'bg-white border-gray-200 text-gray-900'
        }`}
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold">
          {title}
        </h2>
        {message && (
          <p className={`mt-2 text-sm ${isDark ? 'text-slate-300' : 'text-gray-600'}`}>{message}</p>
        )}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
              isDark ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 ${confirmBtn}`}
          >
            {pending ? 'Please wait…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
