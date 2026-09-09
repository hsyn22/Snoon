'use server'

import { APIError } from 'better-auth/api'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { studentAuth } from '@/lib/copy'

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

export async function logoutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect('/student/login')
}
