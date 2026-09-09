import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The scheduled jobs.
 *
 * These are the only things in the product that happen without anyone clicking,
 * so the thing to prove is that running them repeatedly is safe and that they
 * cannot touch a case someone is in the middle of treating.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('scheduled jobs', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const { confirmContactByPatient } = await import('@/lib/cases/contact')
  const { confirmAppointment } = await import('@/lib/cases/lifecycle')
  const { runScheduledJobs } = await import('@/lib/cases/scheduled')

  const caseIds: string[] = []
  const studentIds: string[] = []

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
        authUserId: `sched-${crypto.randomUUID()}`,
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

  it('returns an overdue claim to the queue', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    const claim = await claimCase(caseId, studentId)
    expect(claim.ok).toBe(true)
    if (!claim.ok) return

    await db
      .update(claims)
      .set({ contactDeadlineAt: new Date(Date.now() - 1000) })
      .where(eq(claims.id, claim.claimId))

    const report = await runScheduledJobs()
    expect(report.claimsExpired).toBeGreaterThanOrEqual(1)
    expect(await statusOf(caseId)).toBe('REQUESTED')
  })

  it('is safe to run twice, so two schedulers racing change nothing', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    const claim = await claimCase(caseId, studentId)
    expect(claim.ok).toBe(true)
    if (!claim.ok) return

    await db
      .update(claims)
      .set({ contactDeadlineAt: new Date(Date.now() - 1000) })
      .where(eq(claims.id, claim.claimId))

    await runScheduledJobs()
    const second = await runScheduledJobs()

    // The case was already released; the second run must not release it again.
    expect(await statusOf(caseId)).toBe('REQUESTED')
    expect(second.claimsExpired).toBe(0)
  })

  it('expires a case nobody ever claimed', async () => {
    const caseId = await makeCase()
    await db.update(cases).set({ createdAt: new Date('2020-01-01') }).where(eq(cases.id, caseId))

    const report = await runScheduledJobs()
    expect(report.casesExpired).toBeGreaterThanOrEqual(1)
    expect(await statusOf(caseId)).toBe('EXPIRED')
  })

  it('never touches a case that is mid-treatment', async () => {
    // The dangerous failure: sweeping up a patient who has an appointment
    // tomorrow because their case was submitted long ago.
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)
    await confirmContactByPatient(caseId)
    await confirmAppointment(studentId, caseId, new Date(Date.now() + 7 * 24 * 3600 * 1000))
    await db.update(cases).set({ createdAt: new Date('2020-01-01') }).where(eq(cases.id, caseId))

    await runScheduledJobs()
    expect(await statusOf(caseId)).toBe('APPOINTMENT_CONFIRMED')
  })

  it('leaves a claim still inside its window alone', async () => {
    const caseId = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    await runScheduledJobs()
    expect(await statusOf(caseId)).toBe('MATCHED')
  })

  it('reports what it did', async () => {
    const report = await runScheduledJobs()
    expect(typeof report.claimsExpired).toBe('number')
    expect(typeof report.casesExpired).toBe('number')
    expect(Date.parse(report.ranAt)).not.toBeNaN()
  })
})
