import 'server-only'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { isGoogleConfigured } from '@/lib/oauth'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'

/**
 * Starting a Google sign-in, shared by the student side and the patient side.
 *
 * Both audiences use the same provider and the same Better Auth user table —
 * being a student is a row in `snoon.students`, being a patient is having cases,
 * and one person could reasonably be both. What differs is only where they land
 * afterwards.
 *
 * **`callbackURL` is never taken from a form.** It is passed in by the calling
 * action as a literal, so the set of places a sign-in can land is fixed in the
 * source. A destination a client could set is an open redirect, and an open
 * redirect on an auth route is how a phishing page borrows your domain.
 */

export type SocialStart = { ok: true; url: string } | { ok: false; reason: 'UNAVAILABLE' | 'RATE_LIMITED' | 'FAILED' }

export async function startGoogleSignIn(callbackURL: '/student' | '/case/mine'): Promise<SocialStart> {
  // A deployment without credentials should never render the button; this is the
  // second line, for a form posted at an endpoint that no longer offers it.
  if (!isGoogleConfigured()) return { ok: false, reason: 'UNAVAILABLE' }

  const limited = checkRateLimit(`social:${clientIp(await headers())}`, RATE_LIMITS.socialSignIn)
  if (!limited.ok) return { ok: false, reason: 'RATE_LIMITED' }

  try {
    const result = await auth.api.signInSocial({
      body: { provider: 'google', callbackURL, errorCallbackURL: callbackURL },
    })
    if (!result.url) return { ok: false, reason: 'FAILED' }
    return { ok: true, url: result.url }
  } catch (error) {
    console.error(
      'Google sign-in could not start:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { ok: false, reason: 'FAILED' }
  }
}
