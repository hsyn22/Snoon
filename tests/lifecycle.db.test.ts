import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The rest of the case lifecycle, against a real Postgres.
 *
 * Each transition is a conditional update guarded by the status it may come
 * from, so what these cover is mostly what must NOT happen: skipping states,
 * applying a transition twice, or acting on a case someone else holds.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('case lifecycle', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { appointments, caseEvents, cases, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const { confirmContactByPatient } = await import('@/lib/cases/contact')
  const { confirmAppointment, recordOutcome, expireStaleRequestedCases } = await import(
    '@/lib/cases/lifecycle'
  )
  const { InvalidTransitionError } = await import('@/lib/cases/transitions')

  const caseIds: string[] = []
  const studentIds: string[] = []

  const FUTURE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  async function makeCase() {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض',
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
        authUserId: `life-${crypto.randomUUID()}`,
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

  /** Drive a case all the way to CONTACTED, which is where this file starts. */
  async function contactedCase() {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await confirmContactByPatient(caseId)
    return { caseId, studentId }
  }

  afterAll(async () => {
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    if (studentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, studentIds))
      await db.delete(students).where(inArray(students.id, studentIds))
    }
  })

  describe('confirming an appointment', () => {
    it('moves a contacted case to APPOINTMENT_CONFIRMED and records the time', async () => {
      const { caseId, studentId } = await contactedCase()

      const result = await confirmAppointment(studentId, caseId, FUTURE)
      expect(result.ok).toBe(true)
      expect(await statusOf(caseId)).toBe('APPOINTMENT_CONFIRMED')

      const rows = await db
        .select({ scheduledFor: appointments.scheduledFor, superseded: appointments.supersededAt })
        .from(appointments)
        .where(eq(appointments.caseId, caseId))

      expect(rows).toHaveLength(1)
      expect(rows[0]?.scheduledFor.toISOString()).toBe(FUTURE.toISOString())
      expect(rows[0]?.superseded).toBeNull()
    })

    it('refuses a time in the past', async () => {
      const { caseId, studentId } = await contactedCase()
      const past = new Date(Date.now() - 60_000)

      expect(await confirmAppointment(studentId, caseId, past)).toEqual({
        ok: false,
        reason: 'APPOINTMENT_IN_PAST',
      })
      expect(await statusOf(caseId)).toBe('CONTACTED')
    })

    it('cannot skip straight from MATCHED, before the patient confirmed contact', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      expect(await confirmAppointment(studentId, caseId, FUTURE)).toEqual({
        ok: false,
        reason: 'WRONG_STATUS',
      })
      expect(await statusOf(caseId)).toBe('MATCHED')
    })

    it('refuses a student who does not hold the case', async () => {
      const { caseId } = await contactedCase()
      const stranger = await makeStudent()

      expect(await confirmAppointment(stranger, caseId, FUTURE)).toEqual({
        ok: false,
        reason: 'NO_ACTIVE_CLAIM',
      })
    })

    describe('rescheduling', () => {
      it('supersedes the old appointment rather than overwriting it', async () => {
        const { caseId, studentId } = await contactedCase()
        const later = new Date(FUTURE.getTime() + 24 * 60 * 60 * 1000)

        await confirmAppointment(studentId, caseId, FUTURE)
        expect((await confirmAppointment(studentId, caseId, later)).ok).toBe(true)

        const rows = await db
          .select({ scheduledFor: appointments.scheduledFor, superseded: appointments.supersededAt })
          .from(appointments)
          .where(eq(appointments.caseId, caseId))

        expect(rows).toHaveLength(2)
        // Exactly one live appointment, so the patient is never shown two times.
        expect(rows.filter((row) => row.superseded === null)).toHaveLength(1)
        expect(rows.find((row) => row.superseded === null)?.scheduledFor.toISOString()).toBe(
          later.toISOString(),
        )
      })
    })
  })

  describe('how a case ends', () => {
    it.each(['COMPLETED', 'NO_SHOW', 'CANCELLED'] as const)('records %s', async (outcome) => {
      const { caseId, studentId } = await contactedCase()
      await confirmAppointment(studentId, caseId, FUTURE)

      expect((await recordOutcome(studentId, caseId, outcome)).ok).toBe(true)
      expect(await statusOf(caseId)).toBe(outcome)

      const events = await db
        .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))
      expect(events).toContainEqual({ from: 'APPOINTMENT_CONFIRMED', to: outcome })
    })

    it('closes the claim, so a finished case stops counting against the student', async () => {
      const { caseId, studentId } = await contactedCase()
      await confirmAppointment(studentId, caseId, FUTURE)
      await recordOutcome(studentId, caseId, 'COMPLETED')

      const [claim] = await db
        .select({ status: claims.status })
        .from(claims)
        .where(eq(claims.caseId, caseId))
      expect(claim?.status).toBe('COMPLETED')
    })

    it('cannot be applied before an appointment exists', async () => {
      const { caseId, studentId } = await contactedCase()
      expect(await recordOutcome(studentId, caseId, 'COMPLETED')).toEqual({
        ok: false,
        reason: 'WRONG_STATUS',
      })
    })

    it('cannot be applied twice', async () => {
      const { caseId, studentId } = await contactedCase()
      await confirmAppointment(studentId, caseId, FUTURE)

      expect((await recordOutcome(studentId, caseId, 'COMPLETED')).ok).toBe(true)
      // The claim is closed, so the second attempt cannot even find it.
      expect((await recordOutcome(studentId, caseId, 'NO_SHOW')).ok).toBe(false)
      expect(await statusOf(caseId)).toBe('COMPLETED')
    })

    it('cannot reschedule a case that has already ended', async () => {
      const { caseId, studentId } = await contactedCase()
      await confirmAppointment(studentId, caseId, FUTURE)
      await recordOutcome(studentId, caseId, 'COMPLETED')

      expect((await confirmAppointment(studentId, caseId, FUTURE)).ok).toBe(false)
      expect(await statusOf(caseId)).toBe('COMPLETED')
    })
  })

  describe('expiring cases nobody claimed', () => {
    it('expires a case older than the cutoff', async () => {
      const caseId = await makeCase()
      await db.update(cases).set({ createdAt: new Date('2020-01-01') }).where(eq(cases.id, caseId))

      expect(await expireStaleRequestedCases(new Date('2021-01-01'))).toBeGreaterThanOrEqual(1)
      expect(await statusOf(caseId)).toBe('EXPIRED')
    })

    it('leaves a recent case alone', async () => {
      const caseId = await makeCase()
      await expireStaleRequestedCases(new Date('2020-01-01'))
      expect(await statusOf(caseId)).toBe('REQUESTED')
    })

    it('never touches a case someone is already treating', async () => {
      // The dangerous failure: sweeping up a case mid-treatment would strand a
      // patient who is about to be seen.
      const { caseId, studentId } = await contactedCase()
      await confirmAppointment(studentId, caseId, FUTURE)
      await db.update(cases).set({ createdAt: new Date('2020-01-01') }).where(eq(cases.id, caseId))

      await expireStaleRequestedCases(new Date('2021-01-01'))
      expect(await statusOf(caseId)).toBe('APPOINTMENT_CONFIRMED')
    })
  })

  describe('the transition map is the authority', () => {
    it('refuses an outcome the lifecycle does not allow', async () => {
      // REQUESTED → COMPLETED is not in the map, so it throws rather than being
      // written and discovered later in the audit trail.
      await expect(async () => {
        const { assertTransition } = await import('@/lib/cases/transitions')
        assertTransition('REQUESTED', 'COMPLETED')
      }).rejects.toThrow(InvalidTransitionError)
    })
  })
})
