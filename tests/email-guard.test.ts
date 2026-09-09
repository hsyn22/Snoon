import { eq } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

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
