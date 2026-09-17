import { and, count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases, claims, reviews } from '@/db/schema'
import { isUniqueViolation } from '@/db/unique-violation'
import { isValidRating } from '@/lib/reviews/scale'

/**
 * Reviews of سنون, written by both sides and read by nobody but an admin.
 *
 * **The scope is the platform, never the person.** Haider's framing:
 * "التقييمات للان فقط للادمن، و يكون بشكل عام عن الخدمة و سنون". That is what
 * keeps this clear of the MVP exclusion on `ratings or reviews of students` — a
 * student is not rated here, is not ranked here, and their standing remains
 * `verification_status` and nothing else.
 *
 * So the invariant to defend is a negative one: **no student-facing or
 * patient-facing query may ever read this table.** Nothing sorts a queue by it,
 * nothing shows an average beside a case, nothing tells a student what anybody
 * said. The moment one does, a feedback box has become a reputation system and
 * with it a reason for students to compete over patients — which this product
 * refuses in three separate places.
 */

export type ReviewAuthor = 'PATIENT' | 'STUDENT'

export type SubmitReviewResult =
  | { ok: true }
  /** This side has already reviewed this case. */
  | { ok: false; reason: 'ALREADY_REVIEWED' }
  /** The case is not finished, or not this person's to review. */
  | { ok: false; reason: 'NOT_ALLOWED' }
  | { ok: false; reason: 'INVALID_RATING' }

/** A case is worth reviewing once it is over, however it ended. */
const REVIEWABLE = ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'] as const

/**
 * Whether a case has reached a state where asking for a review is reasonable.
 *
 * Asking mid-treatment would be asking somebody to rate a thing that has not
 * happened, and — worse on the student's side — would put a review box in front
 * of a patient whose student is still expected to ring them.
 */
export function isReviewable(status: string): boolean {
  return (REVIEWABLE as readonly string[]).includes(status)
}

/**
 * Record a review.
 *
 * The caller has already established *who* is asking — a patient through their
 * tracking token, a student through their session and a closed claim on the
 * case. This re-checks the case is actually finished, because a caller that has
 * proved identity has not thereby proved timing.
 */
export async function submitReview(input: {
  caseId: string
  authorType: ReviewAuthor
  studentId?: string | null
  rating: number
  comment?: string | null
}): Promise<SubmitReviewResult> {
  // The same predicate the form is built from, so the two cannot disagree.
  if (!isValidRating(input.rating)) return { ok: false, reason: 'INVALID_RATING' }

  const [record] = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.id, input.caseId))
    .limit(1)

  if (!record || !isReviewable(record.status)) return { ok: false, reason: 'NOT_ALLOWED' }

  try {
    await db.insert(reviews).values({
      caseId: input.caseId,
      authorType: input.authorType,
      // Never set for a patient: a patient has no account, and recording one
      // would mean keeping an identifier for somebody whose details سنون erases
      // at ninety days.
      studentId: input.authorType === 'STUDENT' ? (input.studentId ?? null) : null,
      rating: input.rating,
      comment: input.comment?.trim() ? input.comment.trim() : null,
    })
  } catch (error) {
    // The unique index is what makes "one per side per case" true rather than a
    // race between a read and a write.
    if (isUniqueViolation(error)) return { ok: false, reason: 'ALREADY_REVIEWED' }
    throw error
  }

  return { ok: true }
}

/** Whether this side has already reviewed this case — for hiding the form. */
export async function hasReviewed(caseId: string, authorType: ReviewAuthor): Promise<boolean> {
  const [row] = await db
    .select({ id: reviews.id })
    .from(reviews)
    .where(and(eq(reviews.caseId, caseId), eq(reviews.authorType, authorType)))
    .limit(1)

  return Boolean(row)
}

/** Whether this student held this case and is therefore entitled to review it. */
export async function studentHeldCase(caseId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: claims.id })
    .from(claims)
    .where(and(eq(claims.caseId, caseId), eq(claims.studentId, studentId)))
    .limit(1)

  return Boolean(row)
}

export type AdminReview = {
  id: string
  caseId: string
  referenceCode: string
  authorType: ReviewAuthor
  rating: number
  comment: string | null
  createdAt: Date
}

/**
 * Every review, newest first, for the admin.
 *
 * No patient name and no phone number: not in the projection, so the page
 * cannot leak one however it is rendered. The reference code is what lets an
 * admin look the case up if a comment needs following, which is the same route
 * `/admin/cases` already takes.
 */
export async function listReviewsForAdmin(limit = 200): Promise<AdminReview[]> {
  return db
    .select({
      id: reviews.id,
      caseId: reviews.caseId,
      referenceCode: cases.referenceCode,
      authorType: reviews.authorType,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(cases, eq(cases.id, reviews.caseId))
    .orderBy(desc(reviews.createdAt))
    .limit(limit)
}

export type ReviewSummary = {
  total: number
  average: number | null
  /** How many of each score, so an admin sees the shape and not only the mean. */
  distribution: Record<number, number>
}

/**
 * The summary an admin reads first.
 *
 * The average alone hides the thing worth knowing: two fives and two ones
 * average the same as four threes and mean something completely different. The
 * distribution is what says whether سنون is working for everybody or working
 * for half of them.
 */
export async function summariseReviews(authorType?: ReviewAuthor): Promise<ReviewSummary> {
  const where = authorType ? eq(reviews.authorType, authorType) : undefined

  const rows = await db
    .select({ rating: reviews.rating, total: count() })
    .from(reviews)
    .where(where)
    .groupBy(reviews.rating)

  const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  let total = 0
  let weighted = 0
  for (const row of rows) {
    const n = Number(row.total)
    distribution[row.rating] = n
    total += n
    weighted += n * row.rating
  }

  return { total, average: total === 0 ? null : weighted / total, distribution }
}
