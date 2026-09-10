import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The claiming engine, against a real Postgres.
 *
 * These cover the first non-negotiable in CLAUDE.md — a case can never be claimed
 * twice — and the second — contact details are invisible until a student holds an
 * active claim. Both are enforced in the database and the data-access layer, so
 * both are tested there rather than through the UI.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('claiming', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents, claims, students } = await import('@/db/schema')
  const { submitCase, listOpenCasesForStudent, getCaseForClaimant } = await import(
    '@/db/queries/cases'
  )
  const { claimCase, releaseClaim, expireOverdueClaims } = await import('@/db/queries/claims')

  const createdCaseIds: string[] = []
  const createdStudentIds: string[] = []

  async function makeCase(overrides: Record<string, unknown> = {}) {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['root-canal'],
      availabilityDays: ['sun'],
      patientName: 'أم علي',
      patientPhone: '07701234567',
      notes: null,
      ...overrides,
    })
    const [row] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))
    createdCaseIds.push(row!.id)
    return row!.id
  }

  async function makeStudent(status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' = 'VERIFIED') {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: 'طالب تجريبي',
        universityId: 'test-university',
        collegeId: 'test-college',
        stageId: 'stage-4',
        verificationStatus: status,
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

  describe('the database is the second line of defence', () => {
    it('answers cleanly when the partial unique index refuses the claim', async () => {
      // The conditional update is the first guard and normally catches this. The
      // index behind it only fires if two requests somehow both passed the
      // status check — and until this test, the code catching that violation
      // looked for the SQLSTATE on the wrong object and turned a clean "no
      // longer available" into an unhandled error.
      const caseId = await makeCase()
      const first = await makeStudent()
      const second = await makeStudent()

      await claimCase(caseId, first)
      // Put the case back to REQUESTED without releasing the claim, so the
      // conditional update succeeds and only the index can refuse the insert.
      await db.update(cases).set({ status: 'REQUESTED' }).where(eq(cases.id, caseId))

      expect(await claimCase(caseId, second)).toEqual({ ok: false, reason: 'CASE_UNAVAILABLE' })

      const rows = await db.select({ id: claims.id }).from(claims).where(eq(claims.caseId, caseId))
      expect(rows).toHaveLength(1)
    })
  })

  describe('a case can never be claimed twice', () => {
    it('lets the first student claim and refuses the second', async () => {
      const caseId = await makeCase()
      const [first, second] = await Promise.all([makeStudent(), makeStudent()])

      const firstResult = await claimCase(caseId, first)
      const secondResult = await claimCase(caseId, second)

      expect(firstResult.ok).toBe(true)
      expect(secondResult).toEqual({ ok: false, reason: 'CASE_UNAVAILABLE' })
    })

    it('survives ten students claiming the same case at the same instant', async () => {
      // The real race. Read-then-decide-then-write passes the sequential test
      // above and fails this one.
      const caseId = await makeCase()
      const studentIds = await Promise.all(Array.from({ length: 10 }, () => makeStudent()))

      const results = await Promise.all(studentIds.map((id) => claimCase(caseId, id)))

      const winners = results.filter((r) => r.ok)
      expect(winners).toHaveLength(1)
      expect(results.filter((r) => !r.ok && r.reason === 'CASE_UNAVAILABLE')).toHaveLength(9)
    })

    it('leaves exactly one ACTIVE claim row after a race', async () => {
      const caseId = await makeCase()
      const studentIds = await Promise.all(Array.from({ length: 8 }, () => makeStudent()))
      await Promise.all(studentIds.map((id) => claimCase(caseId, id)))

      const active = await db
        .select({ id: claims.id })
        .from(claims)
        .where(eq(claims.caseId, caseId))

      expect(active.filter(Boolean)).toHaveLength(1)
    })

    it('moves the case to MATCHED and records who claimed it', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
      expect(row?.status).toBe('MATCHED')

      const events = await db
        .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus, actor: caseEvents.actorId })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))

      expect(events).toContainEqual({ from: 'REQUESTED', to: 'MATCHED', actor: studentId })
    })
  })

  describe('only verified students may claim', () => {
    it.each(['PENDING', 'REJECTED', 'SUSPENDED'] as const)('refuses a %s student', async (status) => {
      const caseId = await makeCase()
      const studentId = await makeStudent(status)

      expect(await claimCase(caseId, studentId)).toEqual({
        ok: false,
        reason: 'STUDENT_NOT_VERIFIED',
      })

      // And the case is untouched, still open for someone who may claim it.
      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
      expect(row?.status).toBe('REQUESTED')
    })

    it('refuses a student id that does not exist', async () => {
      const caseId = await makeCase()
      expect(await claimCase(caseId, crypto.randomUUID())).toEqual({
        ok: false,
        reason: 'STUDENT_NOT_VERIFIED',
      })
    })
  })

  describe('contact details are invisible without an active claim', () => {
    it('gives the claimant the phone number', async () => {
      const caseId = await makeCase({ patientPhone: '07715559999', patientName: 'أبو حسن' })
      const studentId = await makeStudent()
      await claimCase(caseId, studentId)

      const view = await getCaseForClaimant(caseId, studentId)
      expect(view?.patientPhone).toBe('07715559999')
      expect(view?.patientName).toBe('أبو حسن')
    })

    it('reports whether the contact window has run out', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const now = await getCaseForClaimant(caseId, studentId)
      expect(now?.isPastContactDeadline).toBe(false)

      // Asking as of a moment after the deadline, without waiting 48 hours.
      const later = new Date(result.contactDeadlineAt.getTime() + 1000)
      const afterwards = await getCaseForClaimant(caseId, studentId, later)
      expect(afterwards?.isPastContactDeadline).toBe(true)
    })

    it('gives a different student nothing at all', async () => {
      const caseId = await makeCase()
      const claimant = await makeStudent()
      const stranger = await makeStudent()
      await claimCase(caseId, claimant)

      expect(await getCaseForClaimant(caseId, stranger)).toBeNull()
    })

    it('gives nothing once the claim is released', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      await releaseClaim(result.claimId, { reason: 'test', actorType: 'SYSTEM' })
      expect(await getCaseForClaimant(caseId, studentId)).toBeNull()
    })

    it('never puts a contact field in the browse list', async () => {
      const caseId = await makeCase({ patientName: 'اسم المريض', patientPhone: '07709998888' })
      const studentId = await makeStudent()

      const list = await listOpenCasesForStudent(studentId, { cityIds: ['basra'] })
      const item = list.find((entry) => entry.id === caseId)
      expect(item).toBeDefined()

      // Checked as data, not as types: a stray column added to the select would
      // typecheck fine and leak at runtime.
      const serialised = JSON.stringify(item)
      expect(serialised).not.toContain('اسم المريض')
      expect(serialised).not.toContain('07709998888')
      expect(Object.keys(item!)).toEqual([
        'id',
        'referenceCode',
        'cityId',
        'treatmentTypeIds',
        'availabilityDays',
        'notes',
        'createdAt',
      ])
    })
  })

  describe('the browse list', () => {
    it('shows nothing to an unverified student', async () => {
      await makeCase()
      for (const status of ['PENDING', 'REJECTED', 'SUSPENDED'] as const) {
        const studentId = await makeStudent(status)
        expect(await listOpenCasesForStudent(studentId, { cityIds: ['basra'] })).toEqual([])
      }
    })

    it('shows only cases in the given cities', async () => {
      const basraCase = await makeCase({ cityId: 'basra' })
      const najafCase = await makeCase({ cityId: 'najaf' })
      const studentId = await makeStudent()

      const list = await listOpenCasesForStudent(studentId, { cityIds: ['najaf'] })
      const ids = list.map((entry) => entry.id)
      expect(ids).toContain(najafCase)
      expect(ids).not.toContain(basraCase)
    })

    it('filters by treatment overlap when asked', async () => {
      const ortho = await makeCase({ treatmentTypeIds: ['orthodontics'] })
      const filling = await makeCase({ treatmentTypeIds: ['filling', 'scaling'] })
      const studentId = await makeStudent()

      const list = await listOpenCasesForStudent(studentId, {
        cityIds: ['basra'],
        treatmentTypeIds: ['scaling'],
      })
      const ids = list.map((entry) => entry.id)
      expect(ids).toContain(filling)
      expect(ids).not.toContain(ortho)
    })

    it('hides a case once it is claimed', async () => {
      const caseId = await makeCase()
      const claimant = await makeStudent()
      const browser = await makeStudent()

      expect((await listOpenCasesForStudent(browser, { cityIds: ['basra'] })).map((c) => c.id)).toContain(caseId)
      await claimCase(caseId, claimant)
      expect((await listOpenCasesForStudent(browser, { cityIds: ['basra'] })).map((c) => c.id)).not.toContain(caseId)
    })

    it('does not re-offer a case to the student who already lost it', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const other = await makeStudent()

      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      await releaseClaim(result.claimId, { reason: 'no contact', actorType: 'SYSTEM' })

      const forLoser = await listOpenCasesForStudent(studentId, { cityIds: ['basra'] })
      const forOther = await listOpenCasesForStudent(other, { cityIds: ['basra'] })

      expect(forLoser.map((c) => c.id)).not.toContain(caseId)
      expect(forOther.map((c) => c.id)).toContain(caseId)
    })

    it('returns nothing when no city is given rather than everything', async () => {
      await makeCase()
      const studentId = await makeStudent()
      expect(await listOpenCasesForStudent(studentId, { cityIds: [] })).toEqual([])
    })
  })

  describe('the contact window', () => {
    it('sets a deadline roughly 48 hours out', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const hours = (result.contactDeadlineAt.getTime() - Date.now()) / (1000 * 60 * 60)
      expect(hours).toBeGreaterThan(47.5)
      expect(hours).toBeLessThan(48.5)
    })

    it('returns an overdue case to the queue and lets someone else claim it', async () => {
      const caseId = await makeCase()
      const first = await makeStudent()
      const second = await makeStudent()

      const result = await claimCase(caseId, first)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      // Push the deadline into the past rather than waiting 48 hours.
      await db
        .update(claims)
        .set({ contactDeadlineAt: new Date(Date.now() - 1000) })
        .where(eq(claims.id, result.claimId))

      expect(await expireOverdueClaims()).toBeGreaterThanOrEqual(1)

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
      expect(row?.status).toBe('REQUESTED')

      expect((await claimCase(caseId, second)).ok).toBe(true)
    })

    it('leaves a claim inside its window alone', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      await expireOverdueClaims()

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, caseId))
      expect(row?.status).toBe('MATCHED')
    })

    it('records the whole return path in the audit trail, not a jump', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      await releaseClaim(result.claimId, { reason: 'no answer', actorType: 'SYSTEM' })

      const events = await db
        .select({ from: caseEvents.fromStatus, to: caseEvents.toStatus })
        .from(caseEvents)
        .where(eq(caseEvents.caseId, caseId))

      expect(events).toContainEqual({ from: 'MATCHED', to: 'NO_CONTACT' })
      expect(events).toContainEqual({ from: 'NO_CONTACT', to: 'RETURNED_TO_QUEUE' })
      expect(events).toContainEqual({ from: 'RETURNED_TO_QUEUE', to: 'REQUESTED' })
    })

    it('refuses to release the same claim twice', async () => {
      const caseId = await makeCase()
      const studentId = await makeStudent()
      const result = await claimCase(caseId, studentId)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(await releaseClaim(result.claimId, { reason: 'a', actorType: 'SYSTEM' })).toBe(true)
      expect(await releaseClaim(result.claimId, { reason: 'b', actorType: 'SYSTEM' })).toBe(false)
    })
  })
})
