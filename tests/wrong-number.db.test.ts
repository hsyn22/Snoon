import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * A case can carry someone else's phone number.
 *
 * Patients have no account — that is deliberate, and it means nothing stops a
 * submission naming a number its owner never gave. The first that person hears
 * of سنون is a student ringing about treatment they never asked for. There is no
 * free way to prove ownership: an SMS code is exactly what this project
 * excludes. So this is the harm-reduction path, and it is tested end to end
 * because every part of it has to hold for the person on the other end of that
 * call.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('a case submitted with the wrong number', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, claims, phoneBlocks, students } = await import('@/db/schema')
  const { submitCase, getCaseByTrackingToken } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const { reportWrongNumber } = await import('@/lib/cases/lifecycle')
  const { assertContactMade } = await import('@/lib/cases/contact')
  const {
    activePhoneBlock,
    checkPhoneMaySubmit,
    countActiveBlocks,
    liftPhoneBlock,
    listActivePhoneBlocks,
  } = await import('@/db/queries/phone-blocks')

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []
  const usedPhones: string[] = []

  /** A distinct number per test, so one test's cooldown is not another's. */
  let counter = 0
  function freshPhone(): string {
    counter += 1
    const phone = `0770${String(1000000 + counter).slice(0, 7)}`
    usedPhones.push(phone)
    return phone
  }

  async function makeCase(phone: string) {
    const { caseId, trackingToken } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض تجريبي',
      patientPhone: phone,
      notes: null,
    })
    createdCaseIds.push(caseId)
    return { caseId, trackingToken }
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

  afterAll(async () => {
    if (usedPhones.length > 0) {
      await db.delete(phoneBlocks).where(inArray(phoneBlocks.phone, usedPhones))
    }
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
    }
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  const LIMITS = { maxOpen: 3, maxPerDay: 5 }

  it('closes the case, frees the student, and blocks the number', async () => {
    const phone = freshPhone()
    const { caseId } = await makeCase(phone)
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    const result = await reportWrongNumber(studentId, caseId, 30)
    expect(result.ok).toBe(true)

    const [record] = await db
      .select({ status: cases.status })
      .from(cases)
      .where(eq(cases.id, caseId))
    expect(record?.status).toBe('CANCELLED')

    const [claim] = await db.select({ status: claims.status }).from(claims).where(eq(claims.caseId, caseId))
    // RELEASED, not COMPLETED: the student did the right thing by reporting it,
    // and nothing should read as a case they finished or failed.
    expect(claim?.status).toBe('RELEASED')

    expect(await countActiveBlocks(phone)).toBe(1)
  })

  it('revokes the tracking link, so whoever submitted it stops watching', async () => {
    const phone = freshPhone()
    const { caseId, trackingToken } = await makeCase(phone)
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    expect(await getCaseByTrackingToken(trackingToken)).not.toBeNull()

    await reportWrongNumber(studentId, caseId, 30)

    // The person who put a stranger's number in loses their view of what
    // happens to that stranger's case.
    expect(await getCaseByTrackingToken(trackingToken)).toBeNull()
  })

  it('stops the same submission being made again', async () => {
    const phone = freshPhone()
    const { caseId } = await makeCase(phone)
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await reportWrongNumber(studentId, caseId, 30)

    const verdict = await checkPhoneMaySubmit(phone, LIMITS)
    expect(verdict.ok).toBe(false)
    if (!verdict.ok) expect(verdict.reason).toBe('BLOCKED')
  })

  it('can be reported after the student says they made contact', async () => {
    // A student often rings, gets told "I never asked for this", and only then
    // works out what happened — by which point they may already have reported
    // the call.
    const phone = freshPhone()
    const { caseId } = await makeCase(phone)
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId)

    expect((await reportWrongNumber(studentId, caseId, 30)).ok).toBe(true)
  })

  it('refuses a student who does not hold the case', async () => {
    const phone = freshPhone()
    const { caseId } = await makeCase(phone)
    const holder = await makeStudent()
    const stranger = await makeStudent()
    await claimCase(caseId, holder)

    const result = await reportWrongNumber(stranger, caseId, 30)
    expect(result).toEqual({ ok: false, reason: 'NO_ACTIVE_CLAIM' })

    // And nothing happened to the case or the number.
    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    expect(record?.status).toBe('MATCHED')
    expect(await countActiveBlocks(phone)).toBe(0)
  })

  it('lifts by itself, and an admin can lift it sooner', async () => {
    const phone = freshPhone()
    const { caseId } = await makeCase(phone)
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await reportWrongNumber(studentId, caseId, 30)

    const blocks = await listActivePhoneBlocks(200)
    const mine = blocks.find((block) => block.phone === phone)
    expect(mine).toBeDefined()

    // The cooldown falls on someone who did nothing wrong, so there has to be a
    // way back that does not involve waiting a month.
    expect(await liftPhoneBlock(mine!.id, 'admin@example.com')).toBe(true)
    expect(await activePhoneBlock(phone)).toBeNull()
    expect((await checkPhoneMaySubmit(phone, LIMITS)).ok).toBe(true)

    // Lifting twice is not a second lift.
    expect(await liftPhoneBlock(mine!.id, 'admin@example.com')).toBe(false)
  })

  describe('how much one number may be used', () => {
    it('allows a household sharing a phone, and refuses a flood', async () => {
      const phone = freshPhone()

      // Two open cases on one number is ordinary — a mother submitting for
      // herself and for her child.
      await makeCase(phone)
      expect((await checkPhoneMaySubmit(phone, LIMITS)).ok).toBe(true)
      await makeCase(phone)
      expect((await checkPhoneMaySubmit(phone, LIMITS)).ok).toBe(true)

      await makeCase(phone)
      const verdict = await checkPhoneMaySubmit(phone, LIMITS)
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('TOO_MANY_OPEN')
    })

    it('does not count a closed case against the number', async () => {
      const phone = freshPhone()
      const { caseId } = await makeCase(phone)
      await makeCase(phone)
      await makeCase(phone)
      expect((await checkPhoneMaySubmit(phone, LIMITS)).ok).toBe(false)

      // Once a case is finished it is not an open call any more.
      await db.update(cases).set({ status: 'COMPLETED' }).where(eq(cases.id, caseId))
      expect((await checkPhoneMaySubmit(phone, LIMITS)).ok).toBe(true)
    })

    it('caps a day even when the earlier cases are closed', async () => {
      const phone = freshPhone()
      for (let i = 0; i < 5; i += 1) {
        const { caseId } = await makeCase(phone)
        await db.update(cases).set({ status: 'COMPLETED' }).where(eq(cases.id, caseId))
      }

      const verdict = await checkPhoneMaySubmit(phone, LIMITS)
      expect(verdict.ok).toBe(false)
      if (!verdict.ok) expect(verdict.reason).toBe('TOO_MANY_TODAY')
    })
  })
})
