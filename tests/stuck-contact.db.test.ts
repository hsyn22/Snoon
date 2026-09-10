import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * When the patient never answers at all.
 *
 * The product asks the patient to confirm contact, through Telegram and through
 * their tracking link, and only their answer advances the case. A patient who
 * uses neither is entirely ordinary on a cheap phone — and leaves the case
 * stuck. Both easy answers are wrong: advancing on the student's word is what
 * the confirmation rule exists to prevent, and releasing the claim punishes the
 * one person who did what was asked and sends the next student to the same
 * unresponsive number.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('a patient who never answers', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCase, expireOverdueClaims, listClaimsAwaitingPatient } = await import(
    '@/db/queries/claims'
  )
  const { assertContactMade, decideStuckContact } = await import('@/lib/cases/contact')
  const { CASE_REASON } = await import('@/lib/cases/reasons')

  const GRACE_HOURS = 48
  const ADMIN = 'admin@example.com'

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  async function makeCase() {
    const { caseId } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض صامت',
      patientPhone: '07700000077',
      notes: null,
    })
    createdCaseIds.push(caseId)
    return caseId
  }

  async function makeStudent() {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: 'طالب تجريبي',
        universityId: 'test-university',
        collegeId: 'test-college',
        stageId: 'stage-4',
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    createdStudentIds.push(row!.id)
    return row!.id
  }

  /** Push a claim's deadline into the past, as the passage of time would. */
  async function expireDeadline(caseId: string) {
    await db
      .update(claims)
      .set({ contactDeadlineAt: new Date(Date.now() - 60_000) })
      .where(eq(claims.caseId, caseId))
  }

  afterAll(async () => {
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  it('extends the window when the student says they called', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    const [before] = await db
      .select({ deadline: claims.contactDeadlineAt })
      .from(claims)
      .where(eq(claims.caseId, caseId))

    await assertContactMade(studentId, caseId, GRACE_HOURS)

    const [after] = await db
      .select({ deadline: claims.contactDeadlineAt })
      .from(claims)
      .where(eq(claims.caseId, caseId))

    // The patient may take a day or two to notice either channel.
    expect(after!.deadline.getTime()).toBeGreaterThan(before!.deadline.getTime())
  })

  it('does not let a student extend their own deadline twice', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    await assertContactMade(studentId, caseId, GRACE_HOURS)
    const [first] = await db
      .select({ deadline: claims.contactDeadlineAt })
      .from(claims)
      .where(eq(claims.caseId, caseId))

    await assertContactMade(studentId, caseId, GRACE_HOURS)
    const [second] = await db
      .select({ deadline: claims.contactDeadlineAt })
      .from(claims)
      .where(eq(claims.caseId, caseId))

    expect(second!.deadline.getTime()).toBe(first!.deadline.getTime())
  })

  it('still releases a claim where nobody ever called', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await expireDeadline(caseId)

    expect(await expireOverdueClaims()).toBeGreaterThanOrEqual(1)

    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    // Nobody rang. The patient should not wait behind a student who is not
    // going to act.
    expect(record?.status).toBe('REQUESTED')
  })

  it('never releases a claim where the student did call', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)
    await expireDeadline(caseId)

    await expireOverdueClaims()

    const [claim] = await db.select({ status: claims.status }).from(claims).where(eq(claims.caseId, caseId))
    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))

    // Taking it away would punish the one person who did what was asked.
    expect(claim?.status).toBe('ACTIVE')
    expect(record?.status).toBe('MATCHED')
  })

  it('surfaces it to an admin instead', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)
    await expireDeadline(caseId)

    const waiting = await listClaimsAwaitingPatient()
    expect(waiting.map((entry) => entry.caseId)).toContain(caseId)
    expect(waiting.find((entry) => entry.caseId === caseId)?.studentName).toBe('طالب تجريبي')
  })

  it('does not surface a case still inside its window', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)

    const waiting = await listClaimsAwaitingPatient()
    expect(waiting.map((entry) => entry.caseId)).not.toContain(caseId)
  })

  it('lets an admin confirm contact, recorded as the admin and not the patient', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)
    await expireDeadline(caseId)

    expect((await decideStuckContact(caseId, 'CONFIRMED', ADMIN)).ok).toBe(true)

    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    expect(record?.status).toBe('CONTACTED')

    const events = await db
      .select({ actorType: caseEvents.actorType, actorId: caseEvents.actorId, reason: caseEvents.reason })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(caseEvents.createdAt)

    // The audit trail must not claim the patient said something they did not.
    const last = events.at(-1)
    expect(last?.actorType).toBe('ADMIN')
    expect(last?.actorId).toBe(ADMIN)
    expect(last?.reason).toBe(CASE_REASON.CONTACT_CONFIRMED_BY_ADMIN)
  })

  it('lets an admin send it back to the queue instead', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)
    await expireDeadline(caseId)

    expect((await decideStuckContact(caseId, 'RELEASE', ADMIN)).ok).toBe(true)

    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    const [claim] = await db.select({ status: claims.status }).from(claims).where(eq(claims.caseId, caseId))

    expect(record?.status).toBe('REQUESTED')
    expect(claim?.status).toBe('RELEASED')
  })

  it('refuses a second decision on the same case', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId, GRACE_HOURS)
    await expireDeadline(caseId)

    await decideStuckContact(caseId, 'CONFIRMED', ADMIN)
    // Two admins clicking at once must not apply it twice.
    expect(await decideStuckContact(caseId, 'CONFIRMED', ADMIN)).toEqual({
      ok: false,
      reason: 'WRONG_STATUS',
    })
  })
})
