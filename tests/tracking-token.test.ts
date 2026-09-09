import { beforeAll, describe, expect, it } from 'vitest'

const SECRET = 'test-secret-that-is-long-enough-to-pass-0123456789'

beforeAll(() => {
  process.env.TRACKING_TOKEN_SECRET = SECRET
})

const { generateTrackingToken, hashTrackingToken, trackingTokenMatches } = await import(
  '../src/lib/tracking-token'
)

describe('generateTrackingToken', () => {
  it('is long and URL-safe', () => {
    const token = generateTrackingToken()
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    // 32 random bytes in base64url.
    expect(token.length).toBeGreaterThanOrEqual(42)
  })

  it('never repeats', () => {
    const tokens = new Set(Array.from({ length: 1000 }, () => generateTrackingToken()))
    expect(tokens.size).toBe(1000)
  })
})

describe('hashTrackingToken', () => {
  it('is stable for the same token', () => {
    const token = generateTrackingToken()
    expect(hashTrackingToken(token)).toBe(hashTrackingToken(token))
  })

  it('does not contain the token — a leaked table opens nothing', () => {
    const token = generateTrackingToken()
    expect(hashTrackingToken(token)).not.toContain(token)
  })

  it('differs for different tokens', () => {
    expect(hashTrackingToken('a')).not.toBe(hashTrackingToken('b'))
  })

  it('refuses to run without a secret long enough to be real', () => {
    const original = process.env.TRACKING_TOKEN_SECRET
    try {
      process.env.TRACKING_TOKEN_SECRET = 'short'
      expect(() => hashTrackingToken('x')).toThrow(/TRACKING_TOKEN_SECRET/)
      delete process.env.TRACKING_TOKEN_SECRET
      expect(() => hashTrackingToken('x')).toThrow(/TRACKING_TOKEN_SECRET/)
    } finally {
      process.env.TRACKING_TOKEN_SECRET = original
    }
  })
})

describe('trackingTokenMatches', () => {
  it('accepts the token it was made from', () => {
    const token = generateTrackingToken()
    expect(trackingTokenMatches(token, hashTrackingToken(token))).toBe(true)
  })

  it('rejects any other token', () => {
    const stored = hashTrackingToken(generateTrackingToken())
    expect(trackingTokenMatches(generateTrackingToken(), stored)).toBe(false)
  })

  it('rejects a malformed stored hash instead of throwing', () => {
    expect(trackingTokenMatches(generateTrackingToken(), 'not-a-hash')).toBe(false)
  })
})
