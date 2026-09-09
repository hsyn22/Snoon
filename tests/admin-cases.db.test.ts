import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The admin case lookup, against a real Postgres.
 *
 * Admins are the one audience the access table grants every column, so these
 * queries do return a patient's phone number. The rule that still binds is the
 * one in the privacy section: contact details never appear in a list. That is
 * what most of this file checks — not that the detail view works, but that the
 * overview cannot be made to carry a phone number no matter what is in the
 * database.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('admin case lookup', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCase } = await import('@/db/queries/claims')
  const { findCaseForAdmin, listRecentCasesForAdmin, countCasesByStatus } = await import(
    '@/db/queries/admin-cases'
  )
  const { normaliseReferenceCode } = await import('@/lib/reference-code')

  const PHONE = '07701234567'
  const NAME = 'أم علي التجريبية'

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  async function makeCase() {
    const { referenceCode, caseId } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['root-canal'],
      availabilityDays: ['sun', 'tue'],
      patientName: NAME,
      patientPhone: PHONE,
      notes: 'وجع بالضرس',
    })
    createdCaseIds.push(caseId)
    return { caseId, referenceCode }
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
    if (createdCaseIds.length > 0) await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    if (createdStudentIds.length > 0) {
      await db.delete(claims).where(inArray(claims.studentId, createdStudentIds))
      await db.delete(students).where(inArray(students.id, createdStudentIds))
    }
  })

  it('finds a case by its reference code and shows the patient', async () => {
    const { referenceCode } = await makeCase()

    const record = await findCaseForAdmin(referenceCode)

    expect(record?.referenceCode).toBe(referenceCode)
    expect(record?.patientName).toBe(NAME)
    expect(record?.patientPhone).toBe(PHONE)
    expect(record?.status).toBe('REQUESTED')
  })

  it('finds a case from the code as a human types it', async () => {
    const { referenceCode } = await makeCase()

    // Lowercase, no prefix — what someone reading a code down the phone produces.
    const typed = referenceCode.replace('SN-', '').toLowerCase()
    const record = await findCaseForAdmin(normaliseReferenceCode(typed)!)

    expect(record?.referenceCode).toBe(referenceCode)
  })

  it('returns null for a code that matches nothing', async () => {
    expect(await findCaseForAdmin('SN-ZZZZZZ')).toBeNull()
  })

  it('never puts a contact detail in the overview list', async () => {
    const { referenceCode } = await makeCase()

    const rows = await listRecentCasesForAdmin(50)
    const row = rows.find((entry) => entry.referenceCode === referenceCode)

    expect(row).toBeDefined()
    // Not "the UI does not render it" — the value is not in the object at all,
    // so nothing downstream can leak it by accident.
    const serialised = JSON.stringify(rows)
    expect(serialised).not.toContain(PHONE)
    expect(serialised).not.toContain(NAME)
    expect(Object.keys(row!)).not.toContain('patientPhone')
    expect(Object.keys(row!)).not.toContain('patientName')
  })

  it('shows who holds the case, with the student named', async () => {
    const { caseId, referenceCode } = await makeCase()
    const studentId = await makeStudent()

    const claimed = await claimCase(caseId, studentId)
    expect(claimed.ok).toBe(true)

    const record = await findCaseForAdmin(referenceCode)

    expect(record?.status).toBe('MATCHED')
    expect(record?.claims).toHaveLength(1)
    expect(record?.claims[0]?.status).toBe('ACTIVE')
    expect(record?.claims[0]?.studentName).toBe('طالب تجريبي')
    expect(record?.claims[0]?.contactDeadlineAt).toBeInstanceOf(Date)
  })

  it('reads the audit trail oldest first', async () => {
    const { caseId, referenceCode } = await makeCase()
    const studentId = await makeStudent()
    await claimCase(caseId, studentId)

    const record = await findCaseForAdmin(referenceCode)
    const events = record!.events

    expect(events.length).toBeGreaterThanOrEqual(2)
    expect(events[0]?.toStatus).toBe('REQUESTED')
    expect(events.at(-1)?.toStatus).toBe('MATCHED')
    for (let i = 1; i < events.length; i += 1) {
      expect(events[i]!.createdAt.getTime()).toBeGreaterThanOrEqual(events[i - 1]!.createdAt.getTime())
    }
  })

  it('counts cases by status', async () => {
    await makeCase()

    const counts = await countCasesByStatus()

    expect(counts.REQUESTED).toBeGreaterThanOrEqual(1)
    expect(Object.values(counts).every((value) => Number.isInteger(value))).toBe(true)
  })

  it('says whether the patient has a bound Telegram chat', async () => {
    const { referenceCode } = await makeCase()
    const record = await findCaseForAdmin(referenceCode)
    expect(record?.telegramLinked).toBe(false)
  })

  it('does not carry a tracking token, only whether it was revoked', async () => {
    const { caseId, referenceCode } = await makeCase()
    await db
      .update(cases)
      .set({ trackingTokenRevokedAt: new Date() })
      .where(eq(cases.id, caseId))

    const record = await findCaseForAdmin(referenceCode)

    expect(record?.trackingTokenRevokedAt).toBeInstanceOf(Date)
    expect(JSON.stringify(record)).not.toContain('trackingTokenHash')
  })
})
