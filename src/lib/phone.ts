/**
 * Iraqi mobile numbers.
 *
 * A patient may type theirs as 07xx…, +9647xx…, 009647xx…, with spaces or
 * dashes, or with Arabic-Indic digits pasted from another keyboard. All of those
 * are the same number and all of them must work — this is the field that decides
 * whether a student can reach them at all.
 *
 * Nothing in this module logs its input. Phone numbers never appear in logs or
 * error messages.
 */

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩'
const EXTENDED_ARABIC_INDIC = '۰۱۲۳۴۵۶۷۸۹'

/** Iraqi mobile prefixes, without the leading 0. */
const MOBILE_PREFIXES = ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79']

/** Converts any Arabic-Indic digits to Western ones and drops formatting. */
function toWesternDigits(input: string): string {
  return [...input]
    .map((char) => {
      const arabic = ARABIC_INDIC.indexOf(char)
      if (arabic !== -1) return String(arabic)
      const extended = EXTENDED_ARABIC_INDIC.indexOf(char)
      if (extended !== -1) return String(extended)
      return char
    })
    .join('')
}

/**
 * Returns the canonical `07XXXXXXXXX` form, or null if it is not a valid Iraqi
 * mobile number. Landlines are rejected: a student needs to reach a person, and
 * a landline in Iraq usually will not.
 */
export function normalisePhone(input: string): string | null {
  let digits = toWesternDigits(input).replace(/[^\d+]/g, '')

  if (digits.startsWith('+964')) digits = digits.slice(4)
  else if (digits.startsWith('00964')) digits = digits.slice(5)
  else if (digits.startsWith('964') && digits.length === 13) digits = digits.slice(3)

  digits = digits.replace(/\D/g, '')

  // At this point we want either 7XXXXXXXXX (10) or 07XXXXXXXXX (11).
  if (digits.length === 10 && digits.startsWith('7')) digits = `0${digits}`
  if (digits.length !== 11 || !digits.startsWith('07')) return null

  const prefix = digits.slice(1, 3)
  if (!MOBILE_PREFIXES.includes(prefix)) return null

  return digits
}

/** Groups the canonical form for display: 0770 123 4567. Never used in logs. */
export function formatPhoneForDisplay(canonical: string): string {
  if (canonical.length !== 11) return canonical
  return `${canonical.slice(0, 4)} ${canonical.slice(4, 7)} ${canonical.slice(7)}`
}
