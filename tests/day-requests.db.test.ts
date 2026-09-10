import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Asking a patient about a day they did not choose.
 *
 * A student is in clinic on the days their timetable says; a patient names the
 * days they can come. Requiring an overlap hides most cases from most students;
 * ignoring days entirely lets a student claim a case they can never schedule,
 * which costs the student a claim, the patient a call, and the case a trip back
 * through the queue.
 *
 * So a student without an overlap may ask, and nothing else — and the patient's
 * yes goes through the same atomic claim an ordinary one does. That last part is
 * why this file exists: it is the first path other than `claimCase` that can
 * hand out a case, and "a case can never be claimed twice" has to survive it.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('day requests', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents, claims, dayRequests, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const {
    acceptDay,
    declineDay,
    daysWorthAsking,
    hasPendingRequest,
    pendingDaysForCase,
    requestDays,
    supersedeStaleDayRequests,
  } = await import('@/db/queries/day-requests')
  const { CASE_REASON } = await import('@/lib/cases/reasons')

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  type Day = 'sat' | 'sun' | 'mon' | 'tue' | 'wed' | 'thu'

  async function makeCase(availabilityDays: Day[] = ['sun']) {
    const { caseId } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays,
      patientName: 'مريض تجريبي',
      patientPhone: '07700000123',
      notes: null,
    })
    createdCaseIds.push(caseId)
    return caseId
  }

  async function makeStudent(clinicDays: string[], verified = true) {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: 'طالب تجريبي',
        universityId: 'test-university',
        collegeId: 'test-college',
        stageId: 'stage-4',
        clinicDays,
        verificationStatus: verified ? 'VERIFIED' : 'PENDING',
      })
      .returning({ id: students.id })
    createdStudentIds.push(row!.id)
    return row!.id
  }

  afterAll(async () => {
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  describe('which days are worth asking about', () => {
    it('skips days the patient already picked', () => {
      // Asking about a day they already chose is asking a question they answered
      // by filling in the form — and the student could simply claim it.
      expect(daysWorthAsking(['sat', 'sun'], ['sun'])).toEqual(['sat'])
    })

    it('is empty when the student is already free on their days', () => {
      expect(daysWorthAsking(['sun'], ['sun', 'tue'])).toEqual([])
    })
  })

  it('records one question per day, not per student', async () => {
    const caseId = await makeCase(['sun'])
    const studentId = await makeStudent(['sat', 'tue'])

    const result = await requestDays(caseId, studentId)
    expect(result).toEqual({ ok: true, days: ['sat', 'tue'] })
    expect(await pendingDaysForCase(caseId)).toEqual(['sat', 'tue'])
  })

  it('refuses a student whose days the patient already chose', async () => {
    const caseId = await makeCase(['sun', 'tue'])
    const studentId = await makeStudent(['sun'])

    // They can just claim it.
    expect(await requestDays(caseId, studentId)).toEqual({ ok: false, reason: 'NO_DAYS_TO_OFFER' })
  })

  it('refuses an unverified student', async () => {
    const caseId = await makeCase(['sun'])
    const studentId = await makeStudent(['sat'], false)

    expect(await requestDays(caseId, studentId)).toEqual({
      ok: false,
      reason: 'STUDENT_NOT_VERIFIED',
    })
  })

  it('refuses a case that is no longer open', async () => {
    const caseId = await makeCase(['sun'])
    const holder = await makeStudent(['sun'])
    await claimCase(caseId, holder)

    const asker = await makeStudent(['sat'])
    expect(await requestDays(caseId, asker)).toEqual({ ok: false, reason: 'CASE_UNAVAILABLE' })
  })

  it('does not let one student ask the same thing twice', async () => {
    const caseId = await makeCase(['sun'])
    const studentId = await makeStudent(['sat'])

    expect((await requestDays(caseId, studentId)).ok).toBe(true)
    // A refresh, or a determined student, must not bury the patient in the same
    // question.
    expect(await requestDays(caseId, studentId)).toEqual({ ok: false, reason: 'ALREADY_ASKED' })
    expect(await hasPendingRequest(caseId, studentId)).toBe(true)
  })

  it('asks about a shared day once, however many students want it', async () => {
    const caseId = await makeCase(['sun'])
    const first = await makeStudent(['sat'])
    const second = await makeStudent(['sat'])

    await requestDays(caseId, first)
    await requestDays(caseId, second)

    // The patient answers about a day, not about people.
    expect(await pendingDaysForCase(caseId)).toEqual(['sat'])
  })

  describe('the patient says yes', () => {
    it('gives the case to whoever asked first', async () => {
      const caseId = await makeCase(['sun'])
      const first = await makeStudent(['sat'])
      const second = await makeStudent(['sat'])

      await requestDays(caseId, first)
      await requestDays(caseId, second)

      const result = await acceptDay(caseId, 'sat')
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.studentId).toBe(first)
    })

    it('claims the case the same way an ordinary claim does', async () => {
      const caseId = await makeCase(['sun'])
      const studentId = await makeStudent(['sat'])
      await requestDays(caseId, studentId)

      await acceptDay(caseId, 'sat')

      const [record] = await db
        .select({ status: cases.status })
        .from(cases)
        .where(eq(cases.id, caseId))
      const [claim] = await db
        .select({ status: claims.status, studentId: claims.studentId })
        .from(claims)
        .where(eq(claims.caseId, caseId))

      expect(record?.status).toBe('MATCHED')
      expect(claim?.status).toBe('ACTIVE')
      expect(claim?.studentId).toBe(studentId)
    })

    it('records the patient as the actor, because it was their decision', async () => {
      const caseId = await makeCase(['sun'])
      const studentId = await makeStudent(['sat'])
      await requestDays(caseId, studentId)
      await acceptDay(caseId, 'sat')

      const events = await db
        .select({ actorType: caseEvents.actorType, reason: caseEvents.reason })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))
        .orderBy(caseEvents.createdAt)

      expect(events.at(-1)?.actorType).toBe('PATIENT')
      expect(events.at(-1)?.reason).toBe(CASE_REASON.CLAIMED_BY_DAY_REQUEST)
    })

    it('closes everyone else’s question without calling it a refusal', async () => {
      const caseId = await makeCase(['sun'])
      const saturday = await makeStudent(['sat'])
      const tuesday = await makeStudent(['tue'])

      await requestDays(caseId, saturday)
      await requestDays(caseId, tuesday)
      await acceptDay(caseId, 'sat')

      const rows = await db
        .select({ day: dayRequests.requestedDay, status: dayRequests.status })
        .from(dayRequests)
        .where(eq(dayRequests.caseId, caseId))

      expect(rows.find((r) => r.day === 'sat')?.status).toBe('ACCEPTED')
      // The patient did not refuse Tuesday — the case simply went somewhere.
      expect(rows.find((r) => r.day === 'tue')?.status).toBe('SUPERSEDED')
    })

    it('cannot take a case somebody else already claimed', async () => {
      const caseId = await makeCase(['sun'])
      const asker = await makeStudent(['sat'])
      await requestDays(caseId, asker)

      // Someone claims it normally in the meantime.
      const holder = await makeStudent(['sun'])
      expect((await claimCase(caseId, holder)).ok).toBe(true)

      expect(await acceptDay(caseId, 'sat')).toEqual({ ok: false, reason: 'CASE_UNAVAILABLE' })

      // Still exactly one claim. This is the non-negotiable.
      const rows = await db.select({ id: claims.id }).from(claims).where(eq(claims.caseId, caseId))
      expect(rows).toHaveLength(1)
    })

    it('refuses a student suspended since they asked', async () => {
      const caseId = await makeCase(['sun'])
      const studentId = await makeStudent(['sat'])
      await requestDays(caseId, studentId)

      await db
        .update(students)
        .set({ verificationStatus: 'SUSPENDED' })
        .where(eq(students.id, studentId))

      expect(await acceptDay(caseId, 'sat')).toEqual({ ok: false, reason: 'CASE_UNAVAILABLE' })

      const [record] = await db
        .select({ status: cases.status })
        .from(cases)
        .where(eq(cases.id, caseId))
      expect(record?.status).toBe('REQUESTED')
    })

    it('does nothing for a day nobody asked about', async () => {
      const caseId = await makeCase(['sun'])
      expect(await acceptDay(caseId, 'sat')).toEqual({ ok: false, reason: 'NO_SUCH_REQUEST' })
    })
  })

  describe('the patient says no', () => {
    it('closes that day for everyone, so it is not asked again', async () => {
      const caseId = await makeCase(['sun'])
      const first = await makeStudent(['sat'])
      const second = await makeStudent(['sat'])
      await requestDays(caseId, first)
      await requestDays(caseId, second)

      expect(await declineDay(caseId, 'sat')).toBe(2)
      expect(await pendingDaysForCase(caseId)).toEqual([])

      const [record] = await db
        .select({ status: cases.status })
        .from(cases)
        .where(eq(cases.id, caseId))
      expect(record?.status).toBe('REQUESTED')
    })

    it('leaves other days alone', async () => {
      const caseId = await makeCase(['sun'])
      const studentId = await makeStudent(['sat', 'tue'])
      await requestDays(caseId, studentId)

      await declineDay(caseId, 'sat')
      expect(await pendingDaysForCase(caseId)).toEqual(['tue'])
    })
  })

  it('closes questions once the case is gone', async () => {
    const caseId = await makeCase(['sun'])
    const asker = await makeStudent(['sat'])
    await requestDays(caseId, asker)

    const holder = await makeStudent(['sun'])
    await claimCase(caseId, holder)

    expect(await supersedeStaleDayRequests()).toBeGreaterThanOrEqual(1)
    // A patient answering about a case that is no longer theirs to give would
    // be answering nothing.
    expect(await pendingDaysForCase(caseId)).toEqual([])
  })
})
