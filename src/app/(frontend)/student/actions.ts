'use server'

import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { studentAuth } from '@/lib/copy'
import { isEmailConfigured } from '@/lib/email'
import { isGoogleConfigured } from '@/lib/oauth'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'

export type AuthFormState = {
  errors?: Partial<Record<'name' | 'email' | 'password', string>>
  formError?: string
  /**
   * Handed back so a rejected submission does not empty the form. The password
   * is deliberately absent: it is never echoed into HTML, so it is the one field
   * a student retypes.
   */
  values?: { name?: string; email?: string }
}

const NAME_MIN = 3
const PASSWORD_MIN = 8

/** Deliberately permissive: the verification link is what proves the address works. */
function looksLikeEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  // Checked before anything is written. Better Auth sends the verification email
  // as a background task, so a delivery failure never surfaces to the caller —
  // sign-up would look successful while leaving an account nobody can ever
  // verify or log into.
  if (!isEmailConfigured()) return { formError: studentAuth.errors.signUpClosed }

  // Better Auth rate-limits its own HTTP routes, but this is a server action
  // calling its API directly, which does not pass through them.
  const limited = checkRateLimit(`sign-up:${clientIp(await headers())}`, RATE_LIMITS.signUp)
  if (!limited.ok) {
    return {
      formError: studentAuth.errors.tooMany,
      values: { name: read(formData, 'name'), email: read(formData, 'email') },
    }
  }

  const name = read(formData, 'name')
  const email = read(formData, 'email').toLowerCase()
  // Not trimmed: a password may legitimately begin or end with a space.
  const password = String(formData.get('password') ?? '')

  const errors: AuthFormState['errors'] = {}
  const e = studentAuth.errors

  if (!name) errors.name = e.nameRequired
  else if (name.length < NAME_MIN) errors.name = e.nameTooShort

  if (!email) errors.email = e.emailRequired
  else if (!looksLikeEmail(email)) errors.email = e.emailInvalid

  if (!password) errors.password = e.passwordRequired
  else if (password.length < PASSWORD_MIN) errors.password = e.passwordTooShort

  if (Object.keys(errors).length > 0) return { errors, values: { name, email } }

  try {
    await auth.api.signUpEmail({ body: { name, email, password } })
  } catch (error) {
    if (error instanceof APIError) {
      // Note: an address that is already registered does NOT arrive here. Better
      // Auth accepts the request and quietly does nothing, so sign-up cannot be
      // used to discover who has an account. The check-email page tells a student
      // who already registered to log in instead, which covers the dead end
      // without turning this form into an enumeration oracle.
      return { formError: e.generic, values: { name, email } }
    }
    // Never log the body — it holds the password.
    console.error('Sign-up failed:', error instanceof Error ? error.message : 'unknown error')
    return { formError: e.generic, values: { name, email } }
  }

  // Sign-up does not create a session while email verification is required, so
  // sending them to /student would show a logged-out login screen with no
  // explanation of what just happened.
  redirect('/student/check-email')
}

export async function loginAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = read(formData, 'email').toLowerCase()
  const password = String(formData.get('password') ?? '')

  const errors: AuthFormState['errors'] = {}
  const e = studentAuth.errors
  if (!email) errors.email = e.emailRequired
  if (!password) errors.password = e.passwordRequired
  if (Object.keys(errors).length > 0) return { errors, values: { email } }

  // Keyed by address as well as by address-and-IP would be better against a
  // spray, but an address-keyed limit lets anyone lock a student out of their
  // own account by guessing at it. The IP is the safe key.
  const limited = checkRateLimit(`login:${clientIp(await headers())}`, RATE_LIMITS.login)
  if (!limited.ok) return { formError: e.tooMany, values: { email } }

  try {
    await auth.api.signInEmail({ body: { email, password } })
  } catch (error) {
    if (error instanceof APIError) {
      if (error.status === 'FORBIDDEN') return { formError: e.emailNotVerified, values: { email } }
      // Any other failure is reported as one message, so the form cannot be used
      // to discover which addresses are registered.
      return { formError: e.badCredentials, values: { email } }
    }
    console.error('Login failed:', error instanceof Error ? error.message : 'unknown error')
    return { formError: e.generic, values: { email } }
  }

  redirect('/student')
}

/**
 * "Continue with Google".
 *
 * Driven from the server rather than from Better Auth's browser client, which
 * would put the whole client into the bundle for one redirect. This is a plain
 * form posting to a server action: the visitor taps, the server asks Better Auth
 * where to send them, and they go. Nothing is downloaded to make it work.
 *
 * Two things it deliberately does not do:
 *
 * - It does not skip verification. Google answers "who is this?"; whether they
 *   may see a patient is `snoon.students.verification_status`, which an admin
 *   sets after reading an enrolment document. A student arriving this way lands
 *   on the same profile form as everyone else.
 * - It does not report why it failed in any detail. The reasons available here
 *   are configuration ones, and a visitor can act on none of them.
 */
export async function continueWithGoogleAction(): Promise<AuthFormState> {
  // A deployment without credentials should never render the button at all;
  // this is the second line, for a form posted at an endpoint that no longer
  // offers it.
  if (!isGoogleConfigured()) return { formError: studentAuth.errors.googleUnavailable }

  const limited = checkRateLimit(`social:${clientIp(await headers())}`, RATE_LIMITS.socialSignIn)
  if (!limited.ok) return { formError: studentAuth.errors.tooMany }

  let destination: string
  try {
    const result = await auth.api.signInSocial({
      body: {
        provider: 'google',
        // Where Google returns them once they have agreed. `/student` reads
        // their real status from the database and routes them on — to the
        // profile form if they are new, to the queue if they are verified.
        callbackURL: '/student',
        errorCallbackURL: '/student/login',
      },
    })
    if (!result.url) return { formError: studentAuth.errors.generic }
    destination = result.url
  } catch (error) {
    console.error(
      'Google sign-in could not start:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { formError: studentAuth.errors.generic }
  }

  // Outside the try: redirect() works by throwing, and catching it here would
  // turn a successful sign-in into a generic error.
  redirect(destination)
}

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect('/student/login')
}
