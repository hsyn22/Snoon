'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { studentHeldCase, submitReview } from '@/db/queries/reviews'
import { reviewCopy } from '@/lib/copy'
import type { ReviewFormState } from '@/components/review-form'

/**
 * A student's review of سنون, from a case they held.
 *
 * Two things have to be true and both are checked here rather than assumed from
 * the page that rendered the form. Every export from a `'use server'` file is a
 * public POST endpoint, and the case id comes off the form:
 *
 * - **Who is asking** comes from the session, never from the form.
 * - **They actually held this case.** `studentHeldCase` looks for any claim,
 *   including closed ones — the review is written after the case is over, so
 *   requiring an *active* claim would mean nobody could ever leave one.
 *
 * Without the second check, any verified student could review any case. That is
 * a small harm on its own and a precedent that is not worth setting on a table
 * an admin reads to decide things.
 *
 * The student id is stored, unlike the patient's, because a student has an
 * account already and nothing is being kept that سنون does not keep anyway. It
 * is never shown next to the review outside the admin, and no query ranks
 * anybody by it.
 */
export async function submitStudentReviewAction(
  _previous: ReviewFormState,
  formData: FormData,
): Promise<ReviewFormState> {
  const caseId = String(formData.get('caseId') ?? '')
  const rating = Number(formData.get('rating'))
  const comment = String(formData.get('comment') ?? '')

  if (!caseId) return { error: reviewCopy.failed }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) redirect('/student')

  if (!(await studentHeldCase(caseId, student.id))) return { error: reviewCopy.failed }

  const result = await submitReview({
    caseId,
    authorType: 'STUDENT',
    studentId: student.id,
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

  revalidatePath(`/student/case/${caseId}`)
  return { done: true }
}
