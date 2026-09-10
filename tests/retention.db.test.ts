import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Erasing contact details once a case is long over.
 *
 * A phone number exists to be shown to exactly one student, once. After that it
 * is the single field in this system that would do the most harm if the table
 * leaked, and it has no remaining purpose. But the case itself has to survive —
 * an admin must be able to answer "what happened to SN-4KP7QW" when someone
 * rings months later, and for a case that went wrong the event log is the only
 * record there is.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('contact retention', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents, telegramLinks } = await import('@/db/schema')
  const { submitCase, getCaseByTrackingToken } = await import('@/db/queries/cases')
  const { scrubExpiredContactDetails } = await import('@/lib/cases/retention')
  const { createInvite } = await import('@/db/queries/telegram')
  const { CASE_REASON } = await import('@/lib/cases/reasons')

  const PHONE = '07700000099'
  const NAME = 'مريض قديم'
  const NOTES = 'وجع بالضرس من شهر'

  const createdCaseIds: string[] = []

  async function makeCase() {
    const result = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: NAME,
      patientPhone: PHONE,
      notes: NOTES,
    })
    createdCaseIds.push(result.caseId)
    return result
  }

  /** Put a case into a terminal state as of a given moment. */
  async function endCase(caseId: string, when: Date, status = 'COMPLETED' as const) {
    await db.update(cases).set({ status, updatedAt: when }).where(eq(cases.id, caseId))
  }

  const longAgo = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000)
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

  afterAll(async () => {
    if (createdCaseIds.length > 0) {
      await db.delete(telegramLinks).where(inArray(telegramLinks.subjectId, createdCaseIds))
      await db.delete(cases).where(inArray(cases.id, createdCaseIds))
    }
  })

  it('erases the name, the number and the notes', async () => {
    const { caseId } = await makeCase()
    await endCase(caseId, longAgo)

    expect(await scrubExpiredContactDetails(cutoff)).toBeGreaterThanOrEqual(1)

    const [record] = await db
      .select({
        name: cases.patientName,
        phone: cases.patientPhone,
        notes: cases.notes,
        scrubbedAt: cases.contactScrubbedAt,
      })
      .from(cases)
      .where(eq(cases.id, caseId))

    expect(record?.phone).toBe('')
    expect(record?.name).toBe('')
    // Notes go too: people write more than they were asked to, and a finished
    // case has no use for it.
    expect(record?.notes).toBeNull()
    expect(record?.scrubbedAt).toBeInstanceOf(Date)
  })

  it('keeps the case, its code and its whole history', async () => {
    const { caseId, referenceCode } = await makeCase()
    await endCase(caseId, longAgo)
    await scrubExpiredContactDetails(cutoff)

    const [record] = await db
      .select({
        referenceCode: cases.referenceCode,
        status: cases.status,
        cityId: cases.cityId,
        treatmentTypeIds: cases.treatmentTypeIds,
      })
      .from(cases)
      .where(eq(cases.id, caseId))

    // An admin has to still be able to answer "what happened to this code".
    expect(record?.referenceCode).toBe(referenceCode)
    expect(record?.status).toBe('COMPLETED')
    expect(record?.cityId).toBe('basra')
    expect(record?.treatmentTypeIds).toEqual(['filling'])

    const events = await db
      .select({ reason: caseEvents.reason })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))
      .orderBy(caseEvents.createdAt)

    expect(events.length).toBeGreaterThanOrEqual(2)
    // The scrub is itself a thing that happened, and the log is what survives it.
    expect(events.at(-1)?.reason).toBe(CASE_REASON.CONTACT_SCRUBBED)
  })

  it('revokes the tracking link, which now opens an empty case', async () => {
    const { caseId, trackingToken } = await makeCase()
    expect(await getCaseByTrackingToken(trackingToken)).not.toBeNull()

    await endCase(caseId, longAgo)
    await scrubExpiredContactDetails(cutoff)

    expect(await getCaseByTrackingToken(trackingToken)).toBeNull()
  })

  it('revokes a Telegram binding, so nothing can be sent about a scrubbed case', async () => {
    const { caseId } = await makeCase()
    await createInvite({ type: 'PATIENT_CASE', id: caseId })

    await endCase(caseId, longAgo)
    await scrubExpiredContactDetails(cutoff)

    const [link] = await db
      .select({ revokedAt: telegramLinks.revokedAt })
      .from(telegramLinks)
      .where(eq(telegramLinks.subjectId, caseId))

    expect(link?.revokedAt).toBeInstanceOf(Date)
  })

  it('leaves a case that is still open alone, however old', async () => {
    const { caseId } = await makeCase()
    // Old, but nobody has treated it yet — it is still someone's live request.
    await db.update(cases).set({ updatedAt: longAgo }).where(eq(cases.id, caseId))

    await scrubExpiredContactDetails(cutoff)

    const [record] = await db
      .select({ phone: cases.patientPhone })
      .from(cases)
      .where(eq(cases.id, caseId))
    expect(record?.phone).toBe(PHONE)
  })

  it('leaves a recently finished case alone', async () => {
    const { caseId } = await makeCase()
    await endCase(caseId, new Date())

    await scrubExpiredContactDetails(cutoff)

    const [record] = await db
      .select({ phone: cases.patientPhone })
      .from(cases)
      .where(eq(cases.id, caseId))
    expect(record?.phone).toBe(PHONE)
  })

  it('scrubs a case once, however many times the job runs', async () => {
    const { caseId } = await makeCase()
    await endCase(caseId, longAgo)

    const first = await scrubExpiredContactDetails(cutoff)
    const second = await scrubExpiredContactDetails(cutoff)

    expect(first).toBeGreaterThanOrEqual(1)
    // Two schedulers racing must not write two scrub events.
    const events = await db
      .select({ reason: caseEvents.reason })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, caseId))

    expect(events.filter((e) => e.reason === CASE_REASON.CONTACT_SCRUBBED)).toHaveLength(1)
    expect(second).toBe(0)
  })

  it('scrubs an expired case too, not only a treated one', async () => {
    const { caseId } = await makeCase()
    // Nobody ever claimed it. Their number is no less sensitive for that.
    await endCase(caseId, longAgo, 'EXPIRED' as never)

    await scrubExpiredContactDetails(cutoff)

    const [record] = await db
      .select({ phone: cases.patientPhone })
      .from(cases)
      .where(eq(cases.id, caseId))
    expect(record?.phone).toBe('')
  })
})
