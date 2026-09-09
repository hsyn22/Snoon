import { randomInt } from 'node:crypto'

/**
 * Alphabet for case reference codes.
 *
 * Excludes 0/O, 1/I/L and 5/S — a patient reads this over the phone or copies it
 * off a screen on a cracked display, and a code that cannot be misheard or
 * mistyped is worth more than a slightly shorter one. Uppercase only, so case
 * never matters when it is typed back in.
 */
const ALPHABET = '2346789ABCDEFGHJKMNPQRTUVWXYZ'

const CODE_LENGTH = 6
const PREFIX = 'SN-'

/**
 * A case reference code — `SN-4KP7QW`.
 *
 * This identifies a case; it does not grant access to one. Anyone holding a code
 * can quote it to an admin, but only the tracking token opens the case. That
 * separation is deliberate: the code is meant to be spoken aloud.
 */
export function generateReferenceCode(): string {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i += 1) {
    // randomInt is rejection-sampled, so no modulo bias across the alphabet.
    code += ALPHABET[randomInt(ALPHABET.length)]
  }
  return PREFIX + code
}

/**
 * Accepts what a human actually types: lowercase, missing prefix, stray spaces
 * or an Arabic-Indic digit pasted from another keyboard. Returns the canonical
 * form, or null if it could never be a code.
 */
export function normaliseReferenceCode(input: string): string | null {
  const arabicIndicDigits = '٠١٢٣٤٥٦٧٨٩'

  const westernised = [...input.trim().toUpperCase()]
    .map((char) => {
      const arabicIndex = arabicIndicDigits.indexOf(char)
      return arabicIndex === -1 ? char : String(arabicIndex)
    })
    .join('')

  // Strip the prefix BEFORE filtering to the alphabet. 'N' is itself a valid
  // code character, so filtering first would keep the prefix's N and read
  // "SN-4KP7Q" as the six characters "N4KP7Q". No code body can start with 'S'
  // (it is not in the alphabet), so removing a leading SN is always safe.
  const withoutPrefix = westernised.replace(/^S\s*N\s*[-\s]*/, '')

  const cleaned = [...withoutPrefix].filter((char) => ALPHABET.includes(char)).join('')

  return cleaned.length === CODE_LENGTH ? PREFIX + cleaned : null
}
