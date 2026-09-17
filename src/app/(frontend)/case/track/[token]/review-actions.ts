'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { submitReview } from '@/db/queries/reviews'
import { hashTrackingToken } from '@/lib/tracking-token'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { reviewCopy } from '@/lib/copy'
import type { ReviewFormState } from '@/components/review-form'

/**
 * A patient's review of سنون, from their tracking link.
 *
 * **The case comes from the token, never from an id in the form.** The token is
 * the only thing that proves this is the patient's own case — the same rule the
 * contact answer and the day answer on this page already follow. An id off a
 * form would let anybody attach a one-star review to a stranger's case, and
 * since this is a `'use server'` export it is a public POST endpoint whether or
 * not it was written as one.
 *
 * Nothing about the student is recorded. The review is of سنون; who treated the
 * case is on the case, and no query joins the two outside the admin.
 */
export async function submitPatientReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const trackingToken = String(formData.get('trackingToken') ?? '')
  const rating = Number(formData.get('rating'))
  const comment = String(formData.get('comment') ?? '')

  if (!trackingToken) return { error: reviewCopy.failed }

  // Keyed by address, like every other patient-side write. This is here to stop
  // a script walking tokens rather than to police somebody's second thought.
  const limited = checkRateLimit(
    `patient-review:${clientIp(await headers())}`,
    RATE_LIMITS.patientAnswer,
  )
  if (!limited.ok) return { error: reviewCopy.failed }

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

  if (!record) return { error: reviewCopy.failed }

  const result = await submitReview({
    caseId: record.id,
    authorType: 'PATIENT',
    rating,
    comment,
  })

  if (!result.ok) {
    switch (result.reason) {
      case 'ALREADY_REVIEWED':
        return { error: reviewCopy.already }
      case 'NOT_ALLOWED':
        return { error: reviewCopy.notAllowed }
      case 'INVALID_RATING':
        return { error: reviewCopy.invalidRating }
      default:
        return { error: reviewCopy.failed }
    }
  }

  revalidatePath(`/case/track/${trackingToken}`)
  return { done: true }
}
