import { afterEach, describe, expect, it } from 'vitest'

/**
 * "Continue with Google" — configuration, and what it is and is not allowed to
 * change.
 *
 * This one is worth testing carefully because it touches authentication and
 * because it arrives with an attractive and wrong idea attached: that signing in
 * with Google means a student is verified. It does not. Google answers "who owns
 * this address?"; whether somebody may see a patient's phone number is
 * `snoon.students.verification_status`, which only an admin sets.
 */

const KEYS = ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'] as const

describe('whether Google sign-in is available at all', () => {
  const saved = Object.fromEntries(KEYS.map((key) => [key, process.env[key]]))

  afterEach(() => {
    for (const key of KEYS) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  })

  it('counts as configured only when the id and the secret are both set', async () => {
    const { isGoogleConfigured, googleCredentials } = await import('@/lib/oauth')

    delete process.env.GOOGLE_CLIENT_ID
    delete process.env.GOOGLE_CLIENT_SECRET
    expect(isGoogleConfigured()).toBe(false)

    // An id with no secret cannot complete the token exchange, and a secret with
    // no id is a deployment that believes it is configured. Neither counts —
    // the same trap the email guard exists to close.
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    expect(isGoogleConfigured()).toBe(false)

    delete process.env.GOOGLE_CLIENT_ID
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret'
    expect(isGoogleConfigured()).toBe(false)

    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    expect(isGoogleConfigured()).toBe(true)
    expect(googleCredentials()).toEqual({
      clientId: 'test-client-id.apps.googleusercontent.com',
      clientSecret: 'test-secret',
    })
  })

  it('returns null rather than a half-filled credential object', async () => {
    const { googleCredentials } = await import('@/lib/oauth')

    delete process.env.GOOGLE_CLIENT_SECRET
    process.env.GOOGLE_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'

    // A caller spreading a partial object into the provider config would
    // register Google with an undefined secret, which fails at the token
    // exchange — long after the button has been shown to a student.
    expect(googleCredentials()).toBeNull()
  })
})

/**
 * The privacy rule, at the boundary where Google hands us a profile.
 *
 * Google returns a link to the user's profile photograph, and Better Auth stores
 * it on the user row unless told otherwise. سنون has no use for it — the product
 * deliberately shows no faces — and data minimisation says a field needs a
 * reason, not merely an opportunity.
 */
describe('what we keep from a Google profile', () => {
  it('keeps the name, the address and the verified flag, and drops the picture', async () => {
    const { googleProvider } = await import('@/lib/oauth')

    const providers = googleProvider({
      clientId: 'test-client-id.apps.googleusercontent.com',
      clientSecret: 'test-secret',
    })

    const mapper = providers?.google.mapProfileToUser
    expect(mapper, 'the profile mapper must be registered').toBeTypeOf('function')

    const mapped = mapper!({
      name: 'اسم الطالب',
      email: 'student@example.com',
      email_verified: true,
      picture: 'https://lh3.googleusercontent.com/a/a-face',
    })

    expect(mapped).toEqual({
      name: 'اسم الطالب',
      email: 'student@example.com',
      emailVerified: true,
    })
    expect(mapped, 'a profile photograph is a face, and سنون stores none').not.toHaveProperty(
      'image',
    )
  })

  it('takes emailVerified from Google rather than assuming it', async () => {
    const { googleProvider } = await import('@/lib/oauth')

    const mapper = googleProvider({ clientId: 'id', clientSecret: 'secret' })!.google
      .mapProfileToUser

    // Google can return an account whose address it has not verified. Marking
    // such a user verified would let them past a gate email sign-up enforces.
    expect(
      mapper({ name: 'x', email: 'x@example.com', email_verified: false }).emailVerified,
    ).toBe(false)
  })

  it('registers no social provider when there are no credentials', async () => {
    const { googleProvider } = await import('@/lib/oauth')

    // A provider registered with undefined credentials would render a button
    // that fails at the Google screen instead of one that is simply absent.
    expect(googleProvider(null)).toBeUndefined()
  })
})

/**
 * The thing most likely to be got wrong later.
 *
 * Signing in is not being verified. If someone ever "simplifies" this by
 * trusting Google's verified address as proof of enrolment, the access-control
 * table in CLAUDE.md is broken and a stranger sees a patient's phone number.
 */
describe('what Google sign-in does not grant', () => {
  it('leaves email verification as the only thing a provider can settle', async () => {
    const { googleProvider } = await import('@/lib/oauth')

    const mapped = googleProvider({ clientId: 'id', clientSecret: 'secret' })!.google
      .mapProfileToUser({ name: 'اسم', email: 'student@example.com', email_verified: true })

    // Nothing a provider returns may set an academic status. Verification lives
    // in snoon.students and is an admin's decision after reading a document.
    expect(Object.keys(mapped).sort()).toEqual(['email', 'emailVerified', 'name'])
  })
})
