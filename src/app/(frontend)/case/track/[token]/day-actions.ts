'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { acceptDay, declineDay } from '@/db/queries/day-requests'
import { notifyStudentOfDayAnswer } from '@/lib/notifications/day-requests'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { hashTrackingToken } from '@/lib/tracking-token'

export type DayAnswerState = { done?: 'YES' | 'NO'; error?: boolean }

/**
 * The patient answering a day question from their tracking link.
 *
 * The case is found by the tracking token, never by an id in the form: the token
 * is what proves this is the patient's own case, and a case id here would let
 * anyone hand a stranger's case to a student.
 */
export async function answerDayAction(
  _previous: DayAnswerState,
  formData: FormData,
): Promise<DayAnswerState> {
  const trackingToken = String(formData.get('trackingToken') ?? '')
  const day = String(formData.get('day') ?? '')
  const answer = String(formData.get('answer') ?? '')

  if (!trackingToken || !day || (answer !== 'YES' && answer !== 'NO')) return { error: true }

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

  if (answer === 'NO') {
    await declineDay(record.id, day)
    revalidatePath(`/case/track/${trackingToken}`)
    return { done: 'NO' }
  }

  const result = await acceptDay(record.id, day)
  if (!result.ok) return { error: true }

  // After the claim, and best-effort: a message that fails must not undo a
  // claim the patient just granted.
  await notifyStudentOfDayAnswer(result.studentId, result.referenceCode, day)

  revalidatePath(`/case/track/${trackingToken}`)
  return { done: 'YES' }
}
