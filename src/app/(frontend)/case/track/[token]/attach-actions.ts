'use server'

import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { attachCaseToPatient } from '@/db/queries/patient-cases'
import { auth } from '@/lib/auth'
import { patientAccount } from '@/lib/copy'

export type AttachState = { error?: string; done?: boolean }

/**
 * "Keep this case in my account", from the tracking page.
 *
 * The tracking token in the URL is the proof that this case is theirs — the same
 * credential the page already runs on. The account id comes from the session.
 * Neither comes from the form: a case id a client could set would let anyone
 * file a stranger's case into their own account.
 */
export async function attachCaseAction(
  _previous: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const trackingToken = String(formData.get('trackingToken') ?? '')
  if (!trackingToken) return { error: patientAccount.errors.generic }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return { error: patientAccount.errors.signInFirst }

  const result = await attachCaseToPatient({ trackingToken, authUserId: session.user.id })
  if (!result.ok) return { error: patientAccount.errors.generic }

  revalidatePath(`/case/track/${trackingToken}`)
  return { done: true }
}
