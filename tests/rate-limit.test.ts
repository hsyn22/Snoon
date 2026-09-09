import { beforeEach, describe, expect, it, vi } from 'vitest'
import { checkRateLimit, clientIp, RATE_LIMITS, resetRateLimits } from '@/lib/rate-limit'

/**
 * The limiter standing in front of every public endpoint.
 *
 * Nothing a patient touches requires an account — that is the point of the
 * product — so this is the only thing between the case form and a script.
 */
describe('rate limiting', () => {
  beforeEach(() => {
    resetRateLimits()
    vi.useRealTimers()
  })

  const rule = { limit: 3, windowMs: 60_000 }

  it('allows up to the limit and then refuses', () => {
    expect(checkRateLimit('a', rule).ok).toBe(true)
    expect(checkRateLimit('a', rule).ok).toBe(true)
    expect(checkRateLimit('a', rule).ok).toBe(true)

    const fourth = checkRateLimit('a', rule)
    expect(fourth.ok).toBe(false)
    if (!fourth.ok) expect(fourth.retryAfterSeconds).toBeGreaterThan(0)
  })

  it('counts each key separately', () => {
    for (let i = 0; i < 3; i += 1) checkRateLimit('a', rule)
    expect(checkRateLimit('a', rule).ok).toBe(false)
    // One caller being throttled must not throttle everyone else.
    expect(checkRateLimit('b', rule).ok).toBe(true)
  })

  it('lets the caller back in once the window passes', () => {
    vi.useFakeTimers()
    for (let i = 0; i < 4; i += 1) checkRateLimit('a', rule)
    expect(checkRateLimit('a', rule).ok).toBe(false)

    vi.advanceTimersByTime(60_001)
    expect(checkRateLimit('a', rule).ok).toBe(true)
    vi.useRealTimers()
  })

  it('counts successful attempts too', () => {
    // Limiting only failures would leave the case that actually fills the disk —
    // a script submitting cases that all succeed — completely unlimited.
    const results = Array.from({ length: 5 }, () => checkRateLimit('a', rule).ok)
    expect(results).toEqual([true, true, true, false, false])
  })

  describe('reading the caller address', () => {
    const withHeaders = (values: Record<string, string>) => ({
      get: (name: string) => values[name] ?? null,
    })

    it('takes the first entry of x-forwarded-for', () => {
      // The rest of the list is proxies; the first is the client.
      expect(clientIp(withHeaders({ 'x-forwarded-for': '2.2.2.2, 10.0.0.1' }))).toBe('2.2.2.2')
    })

    it('falls back to x-real-ip', () => {
      expect(clientIp(withHeaders({ 'x-real-ip': '3.3.3.3' }))).toBe('3.3.3.3')
    })

    it('falls back to one shared bucket rather than to no limit', () => {
      // If the address cannot be read, everyone shares a window. That throttles
      // legitimate traffic, which is recoverable; leaving the endpoint open is
      // not.
      expect(clientIp(withHeaders({}))).toBe('unknown')
    })
  })

  it('has a rule for every public endpoint that writes', () => {
    for (const [name, limit] of Object.entries(RATE_LIMITS)) {
      expect(limit.limit, name).toBeGreaterThan(0)
      expect(limit.windowMs, name).toBeGreaterThan(0)
    }
    expect(Object.keys(RATE_LIMITS).sort()).toEqual(
      ['caseSubmission', 'login', 'patientAnswer', 'signUp', 'telegramInvite'].sort(),
    )
  })
})
