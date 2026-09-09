/**
 * Date formatting for Arabic screens.
 *
 * Numeric formats such as `dateStyle: 'medium'` come out of Intl with invisible
 * RIGHT-TO-LEFT MARKs (U+200F) between the segments. Those marks re-order the
 * date when it sits inside an explicitly LTR span — "09/09/2026" renders as
 * "092026/09/". Spelling the month out avoids the problem entirely: the string
 * is then unambiguously Arabic, needs no direction override, and cannot be
 * misread as day/month or month/day.
 *
 * Digits stay Western per the Arabic conventions in CLAUDE.md.
 */

/** Defensive: strip bidi control characters in case ICU data changes shape. */
function stripBidiControls(value: string): string {
  return value.replace(/[‎‏؜‪-‮⁦-⁩]/g, '')
}

/** "9 أيلول 2026" — safe to place directly in RTL text, no direction wrapper needed. */
export function formatCaseDate(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ar-IQ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    numberingSystem: 'latn',
  }).format(date)

  return stripBidiControls(formatted)
}

/**
 * "11 أيلول 2026 في 1:15 م" — a moment, not a day.
 *
 * Used for the contact deadline. The window is 48 hours, so a date alone is
 * ambiguous by most of a day in either direction, and the student needs to know
 * whether they still have tonight.
 */
export function formatCaseDateTime(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ar-IQ', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    numberingSystem: 'latn',
  }).format(date)

  return stripBidiControls(formatted)
}


/**
 * Iraq's fixed offset from UTC.
 *
 * Iraq abolished daylight saving in 2008, so this is +03:00 year-round and a
 * literal offset is safe. If that ever changes this becomes a zone lookup, not
 * an arithmetic fix.
 */
const BAGHDAD_OFFSET = '+03:00'

/**
 * Turn a `datetime-local` value into an instant, read as Baghdad time.
 *
 * `<input type="datetime-local">` submits a wall-clock string with no zone, so
 * the server must decide what zone it means. Trusting the browser's zone would
 * let a student whose phone is set to another country book an appointment hours
 * away from the time they typed — the patient would show up alone.
 *
 * Returns null for anything that is not a well-formed local date-time.
 */
export function parseBaghdadDateTime(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null

  const instant = new Date(`${value}:00${BAGHDAD_OFFSET}`)
  return Number.isNaN(instant.getTime()) ? null : instant
}

/** "الأحد 13 أيلول 2026 في 10:30 ص" — an appointment, shown in Baghdad time. */
export function formatAppointment(date: Date): string {
  const formatted = new Intl.DateTimeFormat('ar-IQ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'Asia/Baghdad',
    numberingSystem: 'latn',
  }).format(date)

  return stripBidiControls(formatted)
}


/**
 * A Date as a `datetime-local` value in Baghdad wall clock — "2026-09-13T10:30".
 *
 * Used to pre-fill the reschedule field. Built from formatted parts rather than
 * from the Date's own getters, which would give the server's zone.
 */
export function toBaghdadInputValue(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Baghdad',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '00'

  return `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`
}
