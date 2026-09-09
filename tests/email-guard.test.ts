import { eq } from 'drizzle-orm'
import { afterAll, afterEach, describe, expect, it } from 'vitest'

/**
 * Sign-up must refuse when email cannot be delivered.
 *
 * Better Auth sends its verification email as a background task, so a failure
 * inside the sender never reaches the caller: without this guard sign-up looks
 * successful, the account row is written, no message goes out, and the student
 * is left with an account they can never verify or log into. This test exists
 * because that is exactly what happened before the guard was added.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('sign-up with no email provider', async () => {
  if (!hasDatabase) return

  const { auth } = await import('@/lib/auth')
  const { db } = await import('@/db')
  const { user } = await import('@/db/auth-schema')
  const { signUpAction } = await import('@/app/(frontend)/student/actions')
  const { studentAuth } = await import('@/lib/copy')
  const { isEmailConfigured } = await import('@/lib/email')

  const emails: string[] = []
  const originalEnv = process.env.NODE_ENV

  afterAll(async () => {
    // @ts-expect-error - restoring the value the suite forced
    process.env.NODE_ENV = originalEnv
    for (const email of emails) await db.delete(user).where(eq(user.email, email))
  })

  function forceProduction() {
    // @ts-expect-error - the guard keys off NODE_ENV
    process.env.NODE_ENV = 'production'
  }

  function restore() {
    // @ts-expect-error - restore
    process.env.NODE_ENV = originalEnv
  }

  it('reports email as unconfigured in production', () => {
    forceProduction()
    expect(isEmailConfigured()).toBe(false)
    restore()
    expect(isEmailConfigured()).toBe(true)
  })

  it('refuses the sign-up instead of creating an unverifiable account', async () => {
    forceProduction()
    const email = `closed${Date.now()}@example.com`
    emails.push(email)

    const form = new FormData()
    form.set('name', 'اسم الطالب')
    form.set('email', email)
    form.set('password', 'a-proper-password-123')

    const result = await signUpAction({}, form)
    restore()

    expect(result.formError).toBe(studentAuth.errors.signUpClosed)

    const rows = await db.select({ id: user.id }).from(user).where(eq(user.email, email))
    expect(rows, 'no account may be created when it could never be verified').toEqual([])
  })

  it('still lets sign-up through when email works', async () => {
    const email = `open${Date.now()}@example.com`
    emails.push(email)

    const result = await auth.api.signUpEmail({
      body: { name: 'اسم', email, password: 'a-proper-password-123' },
    })
    expect(result.user.email).toBe(email)
  })
})

/**
 * The provider itself. No database needed — this is about configuration, and it
 * is the piece that decides whether student registration is open at all.
 */
describe('the Resend provider', () => {
  const keys = ['RESEND_API_KEY', 'EMAIL_FROM'] as const
  const saved = Object.fromEntries(keys.map((key) => [key, process.env[key]]))

  function restoreEnv() {
    for (const key of keys) {
      if (saved[key] === undefined) delete process.env[key]
      else process.env[key] = saved[key]
    }
  }

  afterEach(restoreEnv)

  it('counts as configured only when the key and the from address are both set', async () => {
    const { isEmailConfigured } = await import('@/lib/email')
    const originalEnv = process.env.NODE_ENV

    // @ts-expect-error - the guard keys off NODE_ENV
    process.env.NODE_ENV = 'production'

    delete process.env.RESEND_API_KEY
    delete process.env.EMAIL_FROM
    expect(isEmailConfigured()).toBe(false)

    // A key with no from address cannot send; a from address with no key is a
    // deployment that believes it can send and cannot. Neither counts.
    process.env.RESEND_API_KEY = 're_test_key'
    expect(isEmailConfigured()).toBe(false)

    delete process.env.RESEND_API_KEY
    process.env.EMAIL_FROM = 'سنون <no-reply@example.com>'
    expect(isEmailConfigured()).toBe(false)

    process.env.RESEND_API_KEY = 're_test_key'
    expect(isEmailConfigured()).toBe(true)

    // @ts-expect-error - restore
    process.env.NODE_ENV = originalEnv
  })

  it('posts the message to Resend and never puts the address in an error', async () => {
    const { sendEmail, EmailSendError } = await import('@/lib/email')

    process.env.RESEND_API_KEY = 're_test_key'
    process.env.EMAIL_FROM = 'سنون <no-reply@example.com>'

    const calls: { url: string; body: unknown; auth: string | undefined }[] = []
    const originalFetch = globalThis.fetch

    globalThis.fetch = (async (url: string, init: RequestInit) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init.body)),
        auth: new Headers(init.headers).get('authorization') ?? undefined,
      })
      return new Response('', { status: 200 })
    }) as unknown as typeof fetch

    await sendEmail({ to: 'student@example.com', subject: 'تفعيل', text: 'رابط' })

    expect(calls).toHaveLength(1)
    expect(calls[0]!.url).toBe('https://api.resend.com/emails')
    expect(calls[0]!.auth).toBe('Bearer re_test_key')
    expect(calls[0]!.body).toEqual({
      from: 'سنون <no-reply@example.com>',
      to: ['student@example.com'],
      subject: 'تفعيل',
      text: 'رابط',
    })

    globalThis.fetch = (async () =>
      new Response('domain not verified', { status: 403 })) as unknown as typeof fetch

    await expect(
      sendEmail({ to: 'student@example.com', subject: 'تفعيل', text: 'رابط' }),
    ).rejects.toThrow(EmailSendError)

    // An address is a person, and this string reaches the log.
    await sendEmail({ to: 'student@example.com', subject: 'x', text: 'y' }).catch(
      (error: Error) => {
        expect(error.message).not.toContain('student@example.com')
      },
    )

    globalThis.fetch = originalFetch
  })
})
