import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Contact confirmation.
 *
 * The rule under test is from CLAUDE.md: the student's word alone does not
 * advance MATCHED → CONTACTED. A student who never called must not be able to
 * park a case out of everyone's reach by claiming they did.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('contact confirmation', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { caseEvents, cases, claims, students } = await import('@/db/schema')
  const { submitCase, getCaseForClaimant } = await import('@/db/queries/cases')
  const { claimCase, releaseClaim } = await import('@/db/queries/claims')
  const { assertContactMade, confirmContactByPatient, reportNoContactByPatient } = await import(
    '@/lib/cases/contact'
  )

  const caseIds: string[] = []
  const studentIds: string[] = []

  async function makeCase() {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض تجريبي',
      patientPhone: '07701234567',
      notes: null,
    })
    const [row] = await db.select({ id: cases.id }).from(cases).where(eq(cases.referenceCode, referenceCode))
    caseIds.push(row!.id)
    return row!.id
  }

  async function makeStudent() {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `contact-${crypto.randomUUID()}`,
        fullName: 'طالب',
        universityId: 'u',
        collegeId: 'c',
        stageId: 'stage-4',
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    studentIds.push(row!.id)
    return row!.id
  }

  async function statusOf(caseId: string) {
    const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    return row?.status
  }

  afterAll(async () => {
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    if (studentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, studentIds))
      await db.delete(students).where(inArray(students.id, studentIds))
    }
  })

  describe("the student's word alone does not move the case", () => {
    it('leaves the case in MATCHED when the student reports contact', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      const result = await assertContactMade(studentId, caseId)
      expect(result.ok).toBe(true)
      // The whole point: reporting contact is not the same as it having happened.
      expect(await statusOf(caseId)).toBe('MATCHED')
    })

    it('records the report in the audit trail as a claim, not a transition', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)
      await assertContactMade(studentId, caseId)

      const events = await db
        .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus, reason: caseEvents.reason })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))

      const report = events.find((event) => event.reason?.includes('Student reported'))
      expect(report).toBeDefined()
      expect(report?.from).toBe('MATCHED')
      expect(report?.to).toBe('MATCHED')
    })

    it('refuses a report from a student who does not hold the case', async () => {
      const caseId = await makeCase()
      const holder = await makeStudent()
      const stranger = await makeStudent()
      await claimCase(caseId, holder)

      expect(await assertContactMade(stranger, caseId)).toEqual({
        ok: false,
        reason: 'NO_ACTIVE_CLAIM',
      })
    })

    it('refuses a report once the claim has been released', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const claim = await claimCase(caseId, studentId)
      expect(claim.ok).toBe(true)
      if (!claim.ok) return

      await releaseClaim(claim.claimId, { reason: 'expired', actorType: 'SYSTEM' })
      expect(await assertContactMade(studentId, caseId)).toEqual({
        ok: false,
        reason: 'NO_ACTIVE_CLAIM',
      })
    })
  })

  describe('the patient confirming', () => {
    it('is what advances the case to CONTACTED', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)
      await assertContactMade(studentId, caseId)

      const result = await confirmContactByPatient(caseId)
      expect(result.ok).toBe(true)
      expect(await statusOf(caseId)).toBe('CONTACTED')
    })

    it('works even if the student never reported anything', async () => {
      // The patient is the authority. A student who called without pressing the
      // button has still called.
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      expect((await confirmContactByPatient(caseId)).ok).toBe(true)
      expect(await statusOf(caseId)).toBe('CONTACTED')
    })

    it('cannot be applied twice', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      expect((await confirmContactByPatient(caseId)).ok).toBe(true)
      // A double tap on a Telegram button, or a reloaded page.
      expect(await confirmContactByPatient(caseId)).toEqual({ ok: false, reason: 'WRONG_STATUS' })
      expect(await statusOf(caseId)).toBe('CONTACTED')
    })

    it('cannot move a case that is back in the queue', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const claim = await claimCase(caseId, studentId)
      expect(claim.ok).toBe(true)
      if (!claim.ok) return
      await releaseClaim(claim.claimId, { reason: 'expired', actorType: 'SYSTEM' })

      expect(await confirmContactByPatient(caseId)).toEqual({ ok: false, reason: 'WRONG_STATUS' })
      expect(await statusOf(caseId)).toBe('REQUESTED')
    })

    it('reports a case that does not exist as not found', async () => {
      expect(await confirmContactByPatient(crypto.randomUUID())).toEqual({
        ok: false,
        reason: 'NOT_FOUND',
      })
    })

    it('writes the transition with the patient as the actor', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)
      await confirmContactByPatient(caseId)

      const events = await db
        .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus, actor: caseEvents.actorType })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))

      expect(events).toContainEqual({ from: 'MATCHED', to: 'CONTACTED', actor: 'PATIENT' })
    })
  })

  describe('the patient saying nobody called', () => {
    it('records it without taking the case away mid-conversation', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      expect(await reportNoContactByPatient(caseId)).toBe(true)
      // The contact window is already running and will return it on its own; a
      // mistaken tap must not yank a case from a student who is mid-call.
      expect(await statusOf(caseId)).toBe('MATCHED')
    })

    it('does nothing once the case has moved on', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)
      await confirmContactByPatient(caseId)

      expect(await reportNoContactByPatient(caseId)).toBe(false)
    })
  })

  describe('what the claimant sees', () => {
    it('reflects the report and then the confirmation', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      const before = await getCaseForClaimant(caseId, studentId)
      expect(before?.contactAsserted).toBe(false)
      expect(before?.contactConfirmed).toBe(false)

      await assertContactMade(studentId, caseId)
      const reported = await getCaseForClaimant(caseId, studentId)
      expect(reported?.contactAsserted).toBe(true)
      expect(reported?.contactConfirmed).toBe(false)

      await confirmContactByPatient(caseId)
      const confirmed = await getCaseForClaimant(caseId, studentId)
      expect(confirmed?.contactConfirmed).toBe(true)
    })
  })
})
