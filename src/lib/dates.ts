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
 *
 * **Every format here is Baghdad time, and that is not a detail.** A server has
 * no business deciding what day something happened on: Vercel's functions run in
 * UTC, so without `timeZone` a case submitted at 01:45 Baghdad was stamped with
 * *yesterday's* date — for three hours every night, every date in the product
 * was a day out. Haider hit it directly: he submitted several cases after
 * midnight, opened `/admin/cases`, and could not find them, because they were
 * sitting at the top of the list under 16 أيلول while his phone said the 17th.
 *
 * It is worse on `formatCaseDateTime`, which carries the **contact deadline** a
 * student reads: three hours wrong on the one number that decides whether they
 * still hold a case.
 *
 * So the zone is pinned on every formatter, not only on the appointment one,
 * and `BAGHDAD_ZONE` is the single place it is named.
 */

/**
 * Iraq abolished daylight saving in 2008, so this is a fixed +03:00 — but it is
 * written as a zone rather than an offset so the ICU database stays the source
 * of truth if that ever changes.
 */
const BAGHDAD_ZONE = 'Asia/Baghdad'

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
    timeZone: BAGHDAD_ZONE,
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
    timeZone: BAGHDAD_ZONE,
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
// Must agree with BAGHDAD_ZONE above: one is for parsing a wall clock, the
// other for printing an instant, and they describe the same country.

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
    timeZone: BAGHDAD_ZONE,
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
    timeZone: BAGHDAD_ZONE,
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
