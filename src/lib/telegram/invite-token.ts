import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

/**
 * Invite tokens for Telegram deep links.
 *
 * The same reasoning as patient tracking tokens: the link IS the credential, so
 * the database stores an HMAC and never the token. If the table leaked, nobody
 * could bind their own Telegram chat to somebody else's case — which would mean
 * receiving that patient's notifications.
 *
 * Keyed on TRACKING_TOKEN_SECRET with a distinct label, so a token minted for one
 * purpose can never be replayed as the other.
 */

const TOKEN_BYTES = 32
const LABEL = 'telegram-invite'

function secret(): string {
  const value = process.env.TRACKING_TOKEN_SECRET
  if (!value || value.length < 32) {
    throw new Error('TRACKING_TOKEN_SECRET is missing or too short (needs 32+ characters).')
  }
  return value
}

/** 43 characters of base64url — within Telegram's 64-character start parameter. */
export function generateInviteToken(): string {
  return randomBytes(TOKEN_BYTES).toString('base64url')
}

export function hashInviteToken(token: string): string {
  return createHmac('sha256', secret()).update(`${LABEL}:${token}`).digest('hex')
}

export function inviteTokenMatches(token: string, storedHash: string): boolean {
  const candidate = Buffer.from(hashInviteToken(token), 'hex')
  const stored = Buffer.from(storedHash, 'hex')
  if (candidate.length !== stored.length) return false
  return timingSafeEqual(candidate, stored)
}

/** Telegram only passes A-Za-z0-9_- and at most 64 characters. */
export function looksLikeInviteToken(value: string): boolean {
  return /^[A-Za-z0-9_-]{1,64}$/.test(value)
}
