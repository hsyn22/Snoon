import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * A student's own record of the cases they have held.
 *
 * The thing worth testing is not that a list renders. It is that the list is
 * built from a projection with no contact columns in it — a student who
 * finished a case last month has no more claim on that patient's number than
 * anyone else, and the grant was for the active claim.
 *
 * The count matters too, for a duller reason: a student reports it to their
 * college, so a claim that expired must not inflate it.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('a student’s case history', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const {
    claimCase,
    releaseClaim,
    listCaseHistoryForStudent,
    countTreatedCasesForStudent,
  } = await import('@/db/queries/claims')
  const { assertContactMade, confirmContactByPatient } = await import('@/lib/cases/contact')
  const { confirmAppointment, recordOutcome } = await import('@/lib/cases/lifecycle')
  const { CASE_REASON } = await import('@/lib/cases/reasons')

  const PHONE = '07700000042'
  const NAME = 'مريض تجريبي للسجل'

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  async function makeCase(treatmentTypeIds = ['filling']) {
    const { caseId } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds,
      availabilityDays: ['sun'],
      patientName: NAME,
      patientPhone: PHONE,
      notes: null,
    })
    createdCaseIds.push(caseId)
    return caseId
  }

  async function makeStudent(stageId: 'stage-4' | 'stage-5' = 'stage-4') {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: 'طالب تجريبي',
        universityId: 'test-university',
        collegeId: 'test-college',
        stageId,
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    createdStudentIds.push(row!.id)
    return row!.id
  }

  async function treat(studentId: string, caseId: string) {
    await claimCase(caseId, studentId)
    await assertContactMade(studentId, caseId)
    await confirmContactByPatient(caseId)
    await confirmAppointment(studentId, caseId, new Date(Date.now() + 3 * 86400_000))
    await recordOutcome(studentId, caseId, 'COMPLETED')
  }

  afterAll(async () => {
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  it('cannot contain a patient name or phone number', async () => {
    const studentId = await makeStudent()
    await treat(studentId, await makeCase())

    const history = await listCaseHistoryForStudent(studentId)
    expect(history).toHaveLength(1)

    // Not "the page does not render it" — the value is not in the object, so
    // nothing downstream can leak it by accident.
    const serialised = JSON.stringify(history)
    expect(serialised).not.toContain(PHONE)
    expect(serialised).not.toContain(NAME)
    expect(Object.keys(history[0]!)).not.toContain('patientPhone')
    expect(Object.keys(history[0]!)).not.toContain('patientName')
  })

  it('shows only this student’s own claims', async () => {
    const mine = await makeStudent()
    const theirs = await makeStudent()
    await treat(mine, await makeCase())
    await treat(theirs, await makeCase())

    const history = await listCaseHistoryForStudent(mine)
    expect(history).toHaveLength(1)
  })

  it('counts a treated case and not one that expired', async () => {
    const studentId = await makeStudent()
    await treat(studentId, await makeCase())

    const lost = await makeCase()
    await claimCase(lost, studentId)
    await releaseClaim(lost, {
      reason: CASE_REASON.CONTACT_WINDOW_EXPIRED,
      actorType: 'SYSTEM',
    })

    // The number a student reports to their college. A case they lost to the
    // contact window is not a case they treated.
    expect(await countTreatedCasesForStudent(studentId)).toBe(1)

    const history = await listCaseHistoryForStudent(studentId)
    expect(history).toHaveLength(2)
  })

  it('counts a share of a shared case as treated', async () => {
    const { returnRemainderToQueue } = await import('@/lib/cases/lifecycle')
    const fifth = await makeStudent('stage-5')
    const caseId = await makeCase(['root-canal', 'partial-denture'])

    await claimCase(caseId, fifth)
    await assertContactMade(fifth, caseId)
    await confirmContactByPatient(caseId)
    await confirmAppointment(fifth, caseId, new Date(Date.now() + 3 * 86400_000))
    await returnRemainderToQueue(fifth, caseId, ['root-canal'])

    // They treated a patient. That the case still needs a fourth year is a fact
    // about the case, not a reason to leave it off their record.
    expect(await countTreatedCasesForStudent(fifth)).toBe(1)

    const [entry] = await listCaseHistoryForStudent(fifth)
    expect(entry?.releaseReason).toBe(CASE_REASON.PART_COMPLETED)
  })
})
