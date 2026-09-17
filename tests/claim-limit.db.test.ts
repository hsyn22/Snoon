import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

/**
 * How many cases a student may hold at once — and where that rule lives.
 *
 * It used to live in one `? :` on the student page: hold a case, and the page
 * rendered the held case *instead of* the queue. Two things were wrong with
 * that, and the second is why this file exists.
 *
 * 1. It made the site look empty. A student with one case in hand saw no queue,
 *    and could not tell "سنون has no patients" from "سنون will not let me".
 *    Haider hit it on the first day.
 * 2. **It was not a rule at all.** A rendering decision stops nobody: the
 *    Telegram bot's claim button reaches `claimCaseForStudent` with no page in
 *    front of it, and every server action is a public POST. A student at the
 *    cap could claim as many cases as they could name ids for.
 *
 * So the cap moved to `claimCaseForStudent`, beside the city, stage and day
 * checks, and the number became a Payload setting. These assert the refusal
 * happens there, and that a refused claim leaves the case where it was.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL)

/**
 * Both Payload reads are stubbed, and deliberately only these two.
 *
 * The scope and the limit are configuration; what is under test is the rule
 * that reads them. Leaving them live would make this pass or fail on whether a
 * seed had run, which is the kind of test that goes red for the wrong reason
 * and gets deleted. Everything else — the claim transaction, the conditional
 * update, the counting — runs against the real database.
 */
const limit = vi.hoisted(() => ({ value: 1 }))

vi.mock('@/lib/config/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config/settings')>()
  return { ...actual, getMaxActiveClaimsPerStudent: async () => limit.value }
})

vi.mock('@/lib/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config')>()
  return {
    ...actual,
    getStudentCaseScope: async () => ({ cityIds: ['basra'], treatmentTypeIds: ['filling'] }),
  }
})

describe.skipIf(!hasDatabase)('the cap on cases held at once', async () => {
  if (!hasDatabase) return

  const { eq, inArray } = await import('drizzle-orm')
  const { db } = await import('@/db')
  const { cases, claims, students } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { claimCaseForStudent } = await import('@/lib/cases/claim')
  const { countActiveClaimsForStudent, listActiveClaimsForStudent } = await import(
    '@/db/queries/claims'
  )

  let studentId = ''
  const caseIds: string[] = []
  const byReference = new Map<string, string>()

  /** A case this student is unambiguously entitled to: their city, their stage. */
  async function openCase(label: string): Promise<string> {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'اختبار الحد',
      // Its own number each time, so the per-number open-case cap cannot be
      // what refuses a submission and make this test lie.
      patientPhone: '0770' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0'),
      notes: null,
    })
    const [row] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))
      .limit(1)
    if (!row) throw new Error('submitted case not found')
    caseIds.push(row.id)
    byReference.set(label, row.id)
    return row.id
  }

  beforeAll(async () => {
    const [student] = await db
      .insert(students)
      .values({
        authUserId: `claim-limit-${crypto.randomUUID()}`,
        fullName: 'طالب اختبار الحد',
        universityId: 'test-university',
        stageId: 'stage-4',
        // Empty means "any day", so the day rule cannot be what refuses.
        clinicDays: [],
        verificationStatus: 'VERIFIED',
      })
      .returning({ id: students.id })
    if (!student) throw new Error('student insert returned no row')
    studentId = student.id
  })

  afterAll(async () => {
    if (caseIds.length > 0) {
      await db.delete(claims).where(inArray(claims.caseId, caseIds))
      await db.delete(cases).where(inArray(cases.id, caseIds))
    }
    if (studentId) await db.delete(students).where(eq(students.id, studentId))
  })

  it('lets the first claim through and refuses the second at a limit of one', async () => {
    limit.value = 1

    const first = await claimCaseForStudent(await openCase('first'), studentId)
    expect(first.ok).toBe(true)

    const second = await claimCaseForStudent(await openCase('second'), studentId)
    expect(second.ok).toBe(false)
    if (second.ok) return
    // Not a generic failure. The student has to be told it is their workload
    // and not the case, or the sentence reads as a rejection of them.
    expect(second.reason).toBe('CLAIM_LIMIT_REACHED')
  })

  it('leaves the refused case in the queue for somebody else', async () => {
    // The refusal has to land *before* `claimCase` flips the case to MATCHED.
    // A case knocked out of REQUESTED by a claim that was then refused would be
    // invisible to every student and held by nobody — the worst of both.
    const [refused] = await db
      .select({ status: cases.status })
      .from(cases)
      .where(eq(cases.id, byReference.get('second')!))
      .limit(1)

    expect(refused?.status).toBe('REQUESTED')
  })

  it('raising the setting lets the same student claim again', async () => {
    limit.value = 3

    const result = await claimCaseForStudent(await openCase('third'), studentId)
    expect(result.ok).toBe(true)
    expect(await countActiveClaimsForStudent(studentId)).toBe(2)
  })

  it('lists every held case rather than one, so the page can show them all', async () => {
    // The singular `getActiveClaimForStudent` is exactly what let the page
    // render one case and drop the rest of the screen.
    const held = await listActiveClaimsForStudent(studentId)
    expect(held).toHaveLength(2)
    expect(held.map((claim) => claim.caseId).sort()).toEqual(
      [byReference.get('first')!, byReference.get('third')!].sort(),
    )
  })

  it('carries no contact details', async () => {
    // The grant of a name and a number is `getCaseForClaimant`, one case at a
    // time behind its own check. This list is drawn on a page a student leaves
    // open, and a projection that cannot hold a phone number is the guard.
    const [held] = await listActiveClaimsForStudent(studentId)
    expect(held).toBeDefined()
    for (const key of Object.keys(held ?? {})) {
      expect(key).not.toMatch(/phone|patientName/i)
    }
  })
})
