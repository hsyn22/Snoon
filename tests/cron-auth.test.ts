import { describe, expect, it } from 'vitest'
import { isAuthorisedCronRequest } from '@/lib/cron-auth'

const SECRET = 'a-long-enough-cron-secret-0123456789'

/** Minimal stand-in for the Headers object the route receives. */
function headers(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null }
}

describe('isAuthorisedCronRequest', () => {
  it('accepts the secret in the plain header', () => {
    expect(isAuthorisedCronRequest(headers({ 'x-cron-secret': SECRET }), SECRET)).toBe(true)
  })

  it('accepts it as a Bearer token, which is how Vercel cron sends it', () => {
    expect(
      isAuthorisedCronRequest(headers({ authorization: `Bearer ${SECRET}` }), SECRET),
    ).toBe(true)
  })

  it('accepts a differently-cased Bearer prefix', () => {
    expect(
      isAuthorisedCronRequest(headers({ authorization: `bearer ${SECRET}` }), SECRET),
    ).toBe(true)
  })

  describe('fails closed', () => {
    it('refuses everything when no secret is configured', () => {
      // A deployment that forgot the variable should have a job that does not
      // run — never an endpoint anyone can trigger.
      expect(isAuthorisedCronRequest(headers({ 'x-cron-secret': 'anything' }), undefined)).toBe(
        false,
      )
      expect(isAuthorisedCronRequest(headers({}), undefined)).toBe(false)
    })

    it('refuses when the configured secret is too short to be real', () => {
      expect(isAuthorisedCronRequest(headers({ 'x-cron-secret': 'short' }), 'short')).toBe(false)
    })

    it('refuses an empty presented value even against a valid secret', () => {
      expect(isAuthorisedCronRequest(headers({ 'x-cron-secret': '' }), SECRET)).toBe(false)
      expect(isAuthorisedCronRequest(headers({ authorization: 'Bearer ' }), SECRET)).toBe(false)
    })
  })

  it.each([
    ['no header at all', {}],
    ['a wrong secret', { 'x-cron-secret': 'completely-different-value-here' }],
    ['a prefix of the real secret', { 'x-cron-secret': SECRET.slice(0, 10) }],
    ['the real secret with a character appended', { 'x-cron-secret': `${SECRET}x` }],
    ['the real secret with whitespace', { 'x-cron-secret': ` ${SECRET}` }],
  ])('refuses %s', (_label, values) => {
    expect(isAuthorisedCronRequest(headers(values), SECRET)).toBe(false)
  })

  it('prefers the Authorization header when both are present', () => {
    expect(
      isAuthorisedCronRequest(
        headers({ authorization: `Bearer ${SECRET}`, 'x-cron-secret': 'wrong' }),
        SECRET,
      ),
    ).toBe(true)
  })
})
