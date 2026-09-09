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
