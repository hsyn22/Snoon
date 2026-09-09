import { timingSafeEqual } from 'node:crypto'

/**
 * Compare two secrets without leaking, through timing, how much of them matched.
 *
 * Every shared secret presented over HTTP goes through this — the cron secret
 * and the Telegram webhook secret both. A plain `===` on a secret is a habit
 * worth not having, even where the attack is impractical: the next secret
 * compared that way might be one where it is not.
 *
 * Length is compared first because `timingSafeEqual` throws on a mismatch. The
 * length of a secret is not the part worth hiding.
 */
export function secureCompare(presented: string, expected: string): boolean {
  if (presented.length === 0 || expected.length === 0) return false

  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
