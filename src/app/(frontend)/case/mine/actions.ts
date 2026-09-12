'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { startGoogleSignIn } from '@/lib/auth-social'
import { patientAccount, studentAuth } from '@/lib/copy'

export type PatientAuthState = { error?: string }

/**
 * "Continue with Google", for a patient.
 *
 * The same provider and the same user table the student side uses — being a
 * student is a row in `snoon.students`, being a patient is having cases, and one
 * person could reasonably be both. Only the destination differs, and it is a
 * literal here rather than anything a form could set.
 *
 * Nothing in the patient flow may ever require this. A case is submitted, a link
 * is issued, and that is the whole product; an account is somewhere to find your
 * cases again if you would rather not depend on a link.
 */
export async function patientSignInAction(): Promise<PatientAuthState> {
  const result = await startGoogleSignIn('/case/mine')

  if (!result.ok) {
    return {
      error:
        result.reason === 'RATE_LIMITED'
          ? studentAuth.errors.tooMany
          : patientAccount.errors.generic,
    }
  }

  redirect(result.url)
}

export async function patientSignOutAction(): Promise<void> {
  await auth.api.signOut({ headers: await headers() })
  redirect('/')
}
