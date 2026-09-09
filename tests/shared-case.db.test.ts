import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * A case that needs two students.
 *
 * The two years do not treat the same things: a root canal is fifth year, a
 * partial denture is fourth, and most other work is shared. So a patient wanting
 * both needs a fourth year AND a fifth year, and neither can finish the case
 * alone. Rather than making that the patient's problem — or hiding the case from
 * both — one student takes it, does their part, and hands the rest back.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('a case needing two stages', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents, claims, students } = await import('@/db/schema')
  const { submitCase, listOpenCasesForStudent } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const { assertContactMade, confirmContactByPatient } = await import('@/lib/cases/contact')
  const { confirmAppointment, returnRemainderToQueue, recordOutcome } = await import(
    '@/lib/cases/lifecycle'
  )

  // The real mapping, from Haider. Shared work plus each year's own.
  const FOURTH_YEAR = ['examination', 'filling', 'extraction', 'scaling', 'partial-denture']
  const FIFTH_YEAR = [
    'examination',
    'filling',
    'extraction',
    'scaling',
    'root-canal',
    'complete-denture',
    'orthodontics',
    'paediatric',
  ]

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  async function makeCase(treatmentTypeIds: string[]) {
    const { caseId } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds,
      availabilityDays: ['sun'],
      patientName: 'مريض تجريبي',
      patientPhone: '07700000001',
      notes: null,
    })
    createdCaseIds.push(caseId)
    return caseId
  }

  async function makeStudent(stageId: 'stage-4' | 'stage-5') {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: stageId === 'stage-4' ? 'طالب رابع' : 'طالب خامس',
        universityId: 'test-university',
        collegeId: 'test-college',
        stageId,
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    createdStudentIds.push(row!.id)
    return row!.id
  }

  /** Drive a claimed case as far as an appointment, which is where an outcome
   *  — or a hand-off — becomes possible. */
  async function reachAppointment(studentId: string, caseId: string) {
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId)
    await confirmContactByPatient(caseId)
    await confirmAppointment(studentId, caseId, new Date(Date.now() + 3 * 24 * 60 * 60 * 1000))
  }

  afterAll(async () => {
    // Cases first: appointments reference claims with ON DELETE RESTRICT, and
    // deleting the case cascades through both in the right order.
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  it('is visible to both years, not hidden from either', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fourth = await makeStudent('stage-4')
    const fifth = await makeStudent('stage-5')

    const forFourth = await listOpenCasesForStudent(fourth, {
      cityIds: ['basra'],
      treatmentTypeIds: FOURTH_YEAR,
    })
    const forFifth = await listOpenCasesForStudent(fifth, {
      cityIds: ['basra'],
      treatmentTypeIds: FIFTH_YEAR,
    })

    // Overlap, not containment. Hiding it from both would leave the patient
    // waiting for a student who can do everything, and there is no such student.
    expect(forFourth.map((c) => c.id)).toContain(caseId)
    expect(forFifth.map((c) => c.id)).toContain(caseId)
  })

  it('shrinks to what is left and goes back to the queue', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fifth = await makeStudent('stage-5')
    await reachAppointment(fifth, caseId)

    const result = await returnRemainderToQueue(fifth, caseId, FIFTH_YEAR)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.remaining).toEqual(['partial-denture'])

    const [record] = await db
      .select({ status: cases.status, treatmentTypeIds: cases.treatmentTypeIds })
      .from(cases)
      .where(eq(cases.id, caseId))

    // Not completed and not duplicated: it is a smaller case now, so the
    // patient's tracking link, phone number and photographs all stay put.
    expect(record?.status).toBe('REQUESTED')
    expect(record?.treatmentTypeIds).toEqual(['partial-denture'])
  })

  it('closes the claim of the student who did their part as completed', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fifth = await makeStudent('stage-5')
    await reachAppointment(fifth, caseId)
    await returnRemainderToQueue(fifth, caseId, FIFTH_YEAR)

    const [claim] = await db
      .select({ status: claims.status })
      .from(claims)
      .where(eq(claims.studentId, fifth))

    // They finished what they took on. The case being unfinished is a fact
    // about the case, not a mark against them.
    expect(claim?.status).toBe('COMPLETED')
  })

  it('hands it to the other year, and not back to the one who did their part', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fifth = await makeStudent('stage-5')
    const fourth = await makeStudent('stage-4')

    await reachAppointment(fifth, caseId)
    await returnRemainderToQueue(fifth, caseId, FIFTH_YEAR)

    const forFourth = await listOpenCasesForStudent(fourth, {
      cityIds: ['basra'],
      treatmentTypeIds: FOURTH_YEAR,
    })
    const forFifth = await listOpenCasesForStudent(fifth, {
      cityIds: ['basra'],
      treatmentTypeIds: FIFTH_YEAR,
    })

    expect(forFourth.map((c) => c.id)).toContain(caseId)
    // Nothing left on it is theirs to do.
    expect(forFifth.map((c) => c.id)).not.toContain(caseId)
  })

  it('can then be claimed and finished by the second student', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fifth = await makeStudent('stage-5')
    const fourth = await makeStudent('stage-4')

    await reachAppointment(fifth, caseId)
    await returnRemainderToQueue(fifth, caseId, FIFTH_YEAR)

    await reachAppointment(fourth, caseId)
    expect((await recordOutcome(fourth, caseId, 'COMPLETED')).ok).toBe(true)

    const [record] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
    expect(record?.status).toBe('COMPLETED')
  })

  it('refuses when nothing on the case belongs to another stage', async () => {
    // Everything here is the student's own work, so there is no remainder and
    // this is an ordinary completion.
    const caseId = await makeCase(['filling', 'scaling'])
    const fourth = await makeStudent('stage-4')
    await reachAppointment(fourth, caseId)

    expect(await returnRemainderToQueue(fourth, caseId, FOURTH_YEAR)).toEqual({
      ok: false,
      reason: 'NOTHING_TO_RETURN',
    })
  })

  it('refuses a student who does not hold the case', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const holder = await makeStudent('stage-5')
    const stranger = await makeStudent('stage-5')
    await reachAppointment(holder, caseId)

    expect(await returnRemainderToQueue(stranger, caseId, FIFTH_YEAR)).toEqual({
      ok: false,
      reason: 'NO_ACTIVE_CLAIM',
    })
  })

  it('keeps the whole story in one event log', async () => {
    const caseId = await makeCase(['partial-denture', 'root-canal'])
    const fifth = await makeStudent('stage-5')
    await reachAppointment(fifth, caseId)
    await returnRemainderToQueue(fifth, caseId, FIFTH_YEAR)

    const events = await db
      .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(caseEvents.createdAt)

    // One case, one trail — an admin taking a phone call can see that part of
    // the treatment is done and the rest is waiting.
    expect(events.at(-1)).toEqual({ from: 'APPOINTMENT_CONFIRMED', to: 'REQUESTED' })
  })
})
