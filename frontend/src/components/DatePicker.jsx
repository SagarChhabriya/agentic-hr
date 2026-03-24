import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

/**
 * DatePicker — styled date input
 * Props:
 *   value: string  (YYYY-MM-DD or '')
 *   onChange: (value: string) => void
 *   placeholder?: string
 *   className?: string
 *   min?: string  (YYYY-MM-DD)
 */
export default function DatePicker({ value, onChange, placeholder = 'Select date', className = '', min = '' }) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const today = new Date();
  const parsed = value ? new Date(value + 'T00:00:00') : null;

  const [viewYear, setViewYear] = useState(parsed ? parsed.getFullYear() : today.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed ? parsed.getMonth() : today.getMonth());

  useEffect(() => {
    if (parsed) { setViewYear(parsed.getFullYear()); setViewMonth(parsed.getMonth()); }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const minDate = min ? new Date(min + 'T00:00:00') : null;

  const selectDay = (day) => {
    const d = new Date(viewYear, viewMonth, day);
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1); }
    else setViewMonth((m) => m + 1);
  };

  const displayValue = parsed
    ? parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    : '';

  const totalDays  = daysInMonth(viewYear, viewMonth);
  const startPad   = firstDayOfMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [...Array(startPad).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const isSelected = (day: number) => {
    if (!parsed || !day) return false;
    return parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth && parsed.getDate() === day;
  };
  const isDisabled = (day: number) => {
    if (!minDate || !day) return false;
    const d = new Date(viewYear, viewMonth, day);
    return d < minDate;
  };
  const isToday = (day: number) => {
    if (!day) return false;
    return today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === day;
  };

  const baseCls = `w-full rounded-lg border px-3 py-2.5 text-sm flex items-center justify-between cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
    isDark
      ? 'border-slate-600 bg-slate-900 text-slate-100'
      : 'border-gray-300 bg-white text-gray-900'
  } ${className}`;

  const dropdownCls = `absolute z-50 mt-1 rounded-xl border shadow-xl ${
    isDark ? 'border-slate-700 bg-slate-800' : 'border-gray-200 bg-white'
  }`;

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className={baseCls}>
        <span className={displayValue ? '' : isDark ? 'text-slate-500' : 'text-gray-400'}>
          {displayValue || placeholder}
        </span>
        <svg className={`w-4 h-4 shrink-0 ${isDark ? 'text-slate-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      </button>

      {open && (
        <div className={`${dropdownCls} w-72 p-3`} style={{ top: '100%', left: 0 }}>
          {/* Month/year navigation */}
          <div className="flex items-center justify-between mb-3">
            <button type="button" onClick={prevMonth}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <p className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-gray-800'}`}>
              {MONTHS[viewMonth]} {viewYear}
            </p>
            <button type="button" onClick={nextMonth}
              className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-300' : 'hover:bg-gray-100 text-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
              </svg>
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-1">
            {DAYS.map((d) => (
              <div key={d} className={`text-center text-xs font-semibold py-1 ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />;
              const sel = isSelected(day);
              const dis = isDisabled(day);
              const tod = isToday(day);
              return (
                <button key={day} type="button" onClick={() => !dis && selectDay(day)} disabled={dis}
                  className={`w-full aspect-square rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    sel
                      ? 'bg-indigo-600 text-white font-bold'
                      : dis
                        ? isDark ? 'text-slate-700 cursor-not-allowed' : 'text-gray-300 cursor-not-allowed'
                        : tod
                          ? isDark ? 'border border-indigo-500 text-indigo-400' : 'border border-indigo-400 text-indigo-600'
                          : isDark ? 'text-slate-300 hover:bg-slate-700' : 'text-gray-700 hover:bg-gray-100'
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className={`mt-3 pt-3 border-t flex items-center justify-between ${isDark ? 'border-slate-700' : 'border-gray-100'}`}>
            <button type="button" onClick={() => { onChange(''); setOpen(false); }}
              className={`text-xs px-2 py-1 rounded transition-colors ${isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-400 hover:text-gray-600'}`}>
              Clear
            </button>
            <button type="button" onClick={() => {
              setViewYear(today.getFullYear()); setViewMonth(today.getMonth());
              selectDay(today.getDate());
            }}
              className="text-xs px-2 py-1 rounded text-indigo-500 hover:text-indigo-600 font-medium">
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
