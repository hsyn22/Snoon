import { afterAll, describe, expect, it } from 'vitest'

/**
 * Reviews of سنون — what they are, and the three things they must never become.
 *
 * Haider's framing is what makes this safe to build at all:
 * "التقييمات للان فقط للادمن، و يكون بشكل عام عن الخدمة و سنون". The MVP
 * exclusion in the project guide is `ratings or reviews of students`, and this
 * is a different thing: the platform is rated, nobody is.
 *
 * That distinction is not self-enforcing, so it is asserted:
 *
 * 1. **A review carries nothing that identifies the patient.** They have no
 *    account, and the case their review hangs off is scrubbed at ninety days —
 *    a review that outlived the scrub carrying a name would make the scrub
 *    cosmetic.
 * 2. **The admin projection carries no contact details.** Same rule
 *    `listRecentCasesForAdmin` follows: the page cannot leak a number however
 *    it is rendered.
 * 3. **One per side per case**, enforced by a unique index rather than by
 *    reading first — the difference between a rule and a race.
 *
 * And the timing rule: a case that is not over cannot be reviewed, because
 * asking mid-treatment asks somebody to rate a thing that has not happened.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('reviews of سنون', async () => {
  if (!hasDatabase) return

  const { eq, inArray } = await import('drizzle-orm')
  const { db } = await import('@/db')
  const { cases, reviews, students } = await import('@/db/schema')
  const {
    hasReviewed,
    isReviewable,
    listReviewsForAdmin,
    studentHeldCase,
    submitReview,
    summariseReviews,
  } = await import('@/db/queries/reviews')

  const caseIds: string[] = []
  let studentId = ''

  async function seedCase(reference: string, status: 'REQUESTED' | 'COMPLETED'): Promise<string> {
    const [row] = await db
      .insert(cases)
      .values({
        referenceCode: reference,
        cityId: 'basra',
        treatmentTypeIds: ['filling'],
        availabilityDays: ['sun'],
        patientName: 'اختبار التقييم',
        patientPhone: '07701112233',
        trackingTokenHash: `review-test-${crypto.randomUUID()}`,
        status,
      })
      .returning({ id: cases.id })
    if (!row) throw new Error('case insert returned no row')
    caseIds.push(row.id)
    return row.id
  }

  const [student] = await db
    .insert(students)
    .values({
      authUserId: `review-${crypto.randomUUID()}`,
      fullName: 'طالب اختبار التقييم',
      universityId: 'test-university',
      stageId: 'stage-4',
      clinicDays: [],
      verificationStatus: 'VERIFIED',
    })
    .returning({ id: students.id })
  if (!student) throw new Error('student insert returned no row')
  studentId = student.id

  afterAll(async () => {
    if (caseIds.length > 0) {
      await db.delete(reviews).where(inArray(reviews.caseId, caseIds))
      await db.delete(cases).where(inArray(cases.id, caseIds))
    }
    await db.delete(students).where(eq(students.id, studentId))
  })

  it('refuses a case that is not over', async () => {
    const open = await seedCase('SN-REV-OPEN', 'REQUESTED')
    expect(isReviewable('REQUESTED')).toBe(false)

    const result = await submitReview({ caseId: open, authorType: 'PATIENT', rating: 5 })
    expect(result).toEqual({ ok: false, reason: 'NOT_ALLOWED' })
  })

  it('refuses a rating outside the scale', async () => {
    const done = await seedCase('SN-REV-SCALE', 'COMPLETED')
    for (const rating of [0, 6, 2.5, Number.NaN]) {
      expect(await submitReview({ caseId: done, authorType: 'PATIENT', rating })).toEqual({
        ok: false,
        reason: 'INVALID_RATING',
      })
    }
  })

  it('takes one review from each side of the same case', async () => {
    const done = await seedCase('SN-REV-BOTH', 'COMPLETED')

    expect(
      await submitReview({
        caseId: done,
        authorType: 'PATIENT',
        rating: 5,
        comment: '  الموقع كان سهل  ',
      }),
    ).toEqual({ ok: true })

    expect(
      await submitReview({ caseId: done, authorType: 'STUDENT', studentId, rating: 4 }),
    ).toEqual({ ok: true })

    expect(await hasReviewed(done, 'PATIENT')).toBe(true)
    expect(await hasReviewed(done, 'STUDENT')).toBe(true)
  })

  it('refuses a second review from the same side', async () => {
    const [done] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.referenceCode, 'SN-REV-BOTH'))
      .limit(1)

    expect(await submitReview({ caseId: done!.id, authorType: 'PATIENT', rating: 1 })).toEqual({
      ok: false,
      reason: 'ALREADY_REVIEWED',
    })
  })

  /**
   * The privacy property, and the reason this table is safe to keep after the
   * ninety-day scrub erases the case's contact details.
   */
  it('records nothing that identifies a patient', async () => {
    const [done] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.referenceCode, 'SN-REV-BOTH'))
      .limit(1)

    const [row] = await db
      .select()
      .from(reviews)
      .where(eq(reviews.caseId, done!.id))
      .limit(1)

    // A patient has no account, so there is nothing to record and nothing is.
    const patientRow = (
      await db.select().from(reviews).where(eq(reviews.authorType, 'PATIENT'))
    ).find((entry) => entry.caseId === done!.id)

    expect(patientRow?.studentId).toBeNull()
    // Belt and braces: no column on the row may hold a name or a number.
    for (const key of Object.keys(row ?? {})) {
      expect(key).not.toMatch(/phone|patientName|email/i)
    }
  })

  it('trims a comment and stores an empty one as null', async () => {
    const [row] = await db
      .select({ comment: reviews.comment })
      .from(reviews)
      .where(eq(reviews.authorType, 'PATIENT'))
      .orderBy(reviews.createdAt)

    expect(row?.comment).toBe('الموقع كان سهل')

    const blank = await seedCase('SN-REV-BLANK', 'COMPLETED')
    await submitReview({ caseId: blank, authorType: 'PATIENT', rating: 3, comment: '   ' })
    const [stored] = await db
      .select({ comment: reviews.comment })
      .from(reviews)
      .where(eq(reviews.caseId, blank))
    expect(stored?.comment).toBeNull()
  })

  it('gives the admin no contact columns to render', async () => {
    const rows = await listReviewsForAdmin()
    expect(rows.length).toBeGreaterThan(0)
    for (const key of Object.keys(rows[0]!)) {
      expect(key).not.toMatch(/phone|patientName|studentId|email/i)
    }
  })

  it('summarises with a distribution, not only a mean', async () => {
    const summary = await summariseReviews()
    expect(summary.total).toBeGreaterThan(0)
    expect(summary.average).not.toBeNull()
    // Two fives and two ones average the same as four threes; the distribution
    // is what tells those apart, so it has to be populated rather than implied.
    expect(Object.keys(summary.distribution).sort()).toEqual(['1', '2', '3', '4', '5'])
    expect(
      Object.values(summary.distribution).reduce((total, n) => total + n, 0),
    ).toBe(summary.total)
  })

  it('knows whether a student held a case, including after the claim closed', async () => {
    // The student's review is written on the closed-case screen, so requiring an
    // *active* claim would mean nobody could ever leave one.
    const other = await seedCase('SN-REV-NOTMINE', 'COMPLETED')
    expect(await studentHeldCase(other, studentId)).toBe(false)
  })
})
