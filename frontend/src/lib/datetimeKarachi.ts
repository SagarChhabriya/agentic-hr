/** All user-visible times use Asia/Karachi (PKT, UTC+5). API returns UTC ISO strings with Z. */

export const KARACHI_TZ = 'Asia/Karachi';

/** Product convention: datetime-local values represent wall clock in Asia/Karachi. */
export function datetimeLocalToKarachiIso(datetimeLocal: string): string {
  if (!datetimeLocal || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(datetimeLocal)) {
    return datetimeLocal;
  }
  return `${datetimeLocal}:00+05:00`;
}

export function formatDateTimeKarachi(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleString('en-GB', {
    timeZone: KARACHI_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDateKarachi(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString('en-GB', {
    timeZone: KARACHI_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Job application_deadline as YYYY-MM-DD — calendar day in Karachi */
export function formatJobDeadlineDateKarachi(dateStr: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return formatDateKarachi(dateStr);
  }
  const d = new Date(`${dateStr}T12:00:00.000Z`);
  return d.toLocaleDateString('en-GB', {
    timeZone: KARACHI_TZ,
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Edit prefilled <input type="datetime-local" /> for Asia/Karachi wall clock */
export function utcIsoToDatetimeLocalKarachi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: KARACHI_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value;
  const m = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  const h = parts.find((p) => p.type === 'hour')?.value;
  const min = parts.find((p) => p.type === 'minute')?.value;
  if (!y || !m || !day || h == null || min == null) return '';
  return `${y}-${m}-${day}T${h.padStart(2, '0')}:${min.padStart(2, '0')}`;
}

export function formatTimeKarachi(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleTimeString('en-GB', {
    timeZone: KARACHI_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/** Minimum datetime-local for Karachi "now" */
export function minDatetimeLocalKarachiNow(): string {
  return utcIsoToDatetimeLocalKarachi(new Date().toISOString());
}
