import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Patients have no account — a friction that would directly cost the people this
 * platform exists to serve — so a submitted case comes back with a long random
 * token in a bookmarkable link. That token is the only thing that opens the case.
 *
 * What is stored is an HMAC of the token, never the token itself. If the cases
 * table leaks, the hashes in it do not open anything. The trade is that rotating
 * TRACKING_TOKEN_SECRET invalidates every outstanding link at once, which is the
 * correct behaviour for a compromised secret and a deliberate act otherwise.
 */

const TOKEN_BYTES = 32

function secret(): string {
  const value = process.env.TRACKING_TOKEN_SECRET
  if (!value || value.length < 32) {
    throw new Error('TRACKING_TOKEN_SECRET is missing or too short (needs 32+ characters).')
  }
  return value
}

/** A fresh token. Shown to the patient once, in the link; never stored as-is. */
export function generateTrackingToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

/** The value that goes in the database. */
export function hashTrackingToken(token: string): string {
  return createHmac('sha256', secret()).update(token).digest('hex')
}

/**
 * Compare a presented token against a stored hash without leaking, through
 * timing, how much of it matched.
 */
export function trackingTokenMatches(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashTrackingToken(token), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}
