/**
 * Rate limiting for the public endpoints.
 *
 * Everything a patient can reach is unauthenticated by design — no account is
 * the whole point — which leaves the case form open to anyone with a script.
 * Nothing dramatic has to happen for that to hurt: a few thousand submissions
 * fills the disk with photographs and buries the real cases students are meant
 * to see.
 *
 * Deliberately in memory. A shared store (Redis) would survive restarts and
 * cover several instances, and is worth adding the day سنون runs on more than
 * one — but a limiter that costs nothing to run and holds for a single server is
 * worth far more today than a correct one that is not built. What it must not do
 * is grow without bound, so windows are dropped as they expire.
 *
 * The IP comes from the proxy's `x-forwarded-for`, which a client can forge when
 * nothing sits in front of the app. Behind Dokploy or Vercel it is set by the
 * proxy and is trustworthy; running the app directly on a public port is not a
 * supported deployment.
 */

export type RateLimitRule = {
  /** How many attempts are allowed in the window. */
  limit: number
  windowMs: number
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number }

type Window = { count: number; resetAt: number }

const windows = new Map<string, Window>()

/** Dropped lazily: a sweep on every call is cheaper than a timer that keeps a
 *  serverless instance alive, and the map only grows with distinct callers. */
function sweep(now: number): void {
  if (windows.size < 5000) return
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key)
  }
}

/**
 * Count one attempt against `key`.
 *
 * Counts the attempt whether or not it succeeds. Limiting only failures would
 * let a caller who is succeeding — which is exactly the case that fills the
 * disk — run without limit.
 */
export function checkRateLimit(key: string, rule: RateLimitRule): RateLimitResult {
  const now = Date.now()
  sweep(now)

  const existing = windows.get(key)

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + rule.windowMs })
    return { ok: true }
  }

  existing.count += 1
  if (existing.count > rule.limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000) }
  }

  return { ok: true }
}

/** Test seam, and the only way to clear state without restarting. */
export function resetRateLimits(): void {
  windows.clear()
}

/**
 * The caller's address, as far as it can be known.
 *
 * `x-forwarded-for` is a list; the first entry is the original client and the
 * rest are proxies. Falls back to a single bucket rather than to "no limit" —
 * if the address cannot be read, everyone shares one window, which throttles
 * legitimate traffic but never leaves the endpoint open.
 */
export function clientIp(headers: { get: (name: string) => string | null }): string {
  const forwarded = headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }

  return headers.get('x-real-ip')?.trim() || 'unknown'
}

/**
 * The rules, in one place so they can be read as a policy rather than found in
 * five files.
 *
 * Sized for a person on a phone, not for a load test: someone submitting a
 * second case for a relative is normal, twenty in an hour from one address is
 * not. Sign-up and login are also covered because Better Auth's own limiter
 * guards its HTTP routes, and these are server actions calling its API directly.
 */
export const RATE_LIMITS = {
  caseSubmission: { limit: 5, windowMs: 60 * 60 * 1000 },
  signUp: { limit: 5, windowMs: 60 * 60 * 1000 },
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  telegramInvite: { limit: 10, windowMs: 60 * 60 * 1000 },
  patientAnswer: { limit: 30, windowMs: 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitRule>
