'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { confirmContactByPatient, reportNoContactByPatient } from '@/lib/cases/contact'
import { hashTrackingToken } from '@/lib/tracking-token'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'

export type ConfirmState = { done?: 'YES' | 'NO'; error?: boolean }

/**
 * The patient answering "did a student contact you?" from their tracking link.
 *
 * The same question the bot asks, for everyone who never opted into Telegram —
 * which must always be a supported path, because Telegram is optional.
 *
 * The case is found by the tracking token, never by an id in the form: the token
 * is what proves this is the patient's own case.
 */
export async function answerContactAction(
  _previous: ConfirmState,
  formData: FormData,
): Promise<ConfirmState> {
  const trackingToken = String(formData.get('trackingToken') ?? '')
  const answer = String(formData.get('answer') ?? '')
  if (!trackingToken || (answer !== 'YES' && answer !== 'NO')) return { error: true }

  // Generous: a patient tapping twice, or answering for a second case, is
  // ordinary. This is here to stop a script walking tokens, not to police taps.
  const limited = checkRateLimit(
    `patient-answer:${clientIp(await headers())}`,
    RATE_LIMITS.patientAnswer,
  )
  if (!limited.ok) return { error: true }

  const [record] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(
      and(
        eq(cases.trackingTokenHash, hashTrackingToken(trackingToken)),
        isNull(cases.trackingTokenRevokedAt),
      ),
    )
    .limit(1)

  if (!record) return { error: true }

  if (answer === 'YES') {
    const result = await confirmContactByPatient(record.id)
    if (!result.ok && result.reason === 'NOT_FOUND') return { error: true }
  } else {
    await reportNoContactByPatient(record.id)
  }

  revalidatePath(`/case/track/${trackingToken}`)
  return { done: answer }
}
