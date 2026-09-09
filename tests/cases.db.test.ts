import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Database-backed tests for the case data-access layer.
 *
 * This is the layer that enforces "patient contact details are invisible until a
 * student holds an active claim" and "a tracking token is the only thing that
 * opens a case". A bug here reaches a real person, so it is tested against a real
 * Postgres rather than a mock.
 *
 * Skipped when DATABASE_URL is absent so the rest of the suite still runs on a
 * machine with no database.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('case data access', async () => {
  // skipIf still runs this collector, and the imports below construct a database
  // client at module load. Bail out before them, or a machine with no database
  // fails the file instead of skipping it.
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, caseEvents } = await import('@/db/schema')
  const { submitCase, getCaseByTrackingToken } = await import('@/db/queries/cases')
  const { generateTrackingToken, hashTrackingToken } = await import('@/lib/tracking-token')

  const createdReferenceCodes: string[] = []

  async function submit(overrides: Partial<Parameters<typeof submitCase>[0]> = {}) {
    const result = await submitCase({
      cityId: 'basra',
      treatmentTypeId: 'root-canal',
      availabilityDays: ['sun', 'tue'],
      availabilityPeriod: 'MORNING',
      patientName: 'مريض تجريبي',
      patientPhone: '07701234567',
      notes: null,
      ...overrides,
    })
    createdReferenceCodes.push(result.referenceCode)
    return result
  }

  afterAll(async () => {
    if (createdReferenceCodes.length > 0) {
      await db.delete(cases).where(inArray(cases.referenceCode, createdReferenceCodes))
    }
  })

  it('stores a case and returns a reference code and tracking token', async () => {
    const { referenceCode, trackingToken } = await submit()
    expect(referenceCode).toMatch(/^SN-[2346789ABCDEFGHJKMNPQRTUVWXYZ]{6}$/)
    expect(trackingToken.length).toBeGreaterThanOrEqual(42)
  })

  it('opens as REQUESTED', async () => {
    const { trackingToken } = await submit()
    const record = await getCaseByTrackingToken(trackingToken)
    expect(record?.status).toBe('REQUESTED')
  })

  it('never stores the tracking token itself, only its hash', async () => {
    const { referenceCode, trackingToken } = await submit()

    const [row] = await db
      .select({ hash: cases.trackingTokenHash })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))

    expect(row?.hash).toBeDefined()
    expect(row?.hash).not.toBe(trackingToken)
    expect(row?.hash).not.toContain(trackingToken)
    expect(row?.hash).toBe(hashTrackingToken(trackingToken))
  })

  it('writes an audit event for the case being created', async () => {
    const { referenceCode } = await submit()

    const [row] = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))
    expect(row).toBeDefined()

    const events = await db
      .select({
        fromStatus: caseEvents.fromStatus,
        toStatus: caseEvents.toStatus,
        actorType: caseEvents.actorType,
      })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, row!.id))

    expect(events).toEqual([{ fromStatus: null, toStatus: 'REQUESTED', actorType: 'PATIENT' }])
  })

  it('gives each case its own reference code and token', async () => {
    const [a, b] = await Promise.all([submit(), submit()])
    expect(a.referenceCode).not.toBe(b.referenceCode)
    expect(a.trackingToken).not.toBe(b.trackingToken)
  })

  it('returns the case for its own tracking token', async () => {
    const { referenceCode, trackingToken } = await submit({ patientName: 'أم علي' })
    const record = await getCaseByTrackingToken(trackingToken)

    expect(record).not.toBeNull()
    expect(record?.referenceCode).toBe(referenceCode)
    expect(record?.patientName).toBe('أم علي')
  })

  it('returns nothing for a token belonging to another case', async () => {
    const first = await submit()
    const second = await submit()

    const record = await getCaseByTrackingToken(second.trackingToken)
    expect(record?.referenceCode).toBe(second.referenceCode)
    expect(record?.referenceCode).not.toBe(first.referenceCode)
  })

  it('returns nothing for a token that was never issued', async () => {
    await submit()
    expect(await getCaseByTrackingToken(generateTrackingToken())).toBeNull()
  })

  it.each([['' as string], ['not-a-token'], ['../../etc/passwd'], ["' OR 1=1 --"]])(
    'returns nothing for the junk token %j',
    async (token) => {
      await submit()
      expect(await getCaseByTrackingToken(token)).toBeNull()
    },
  )

  it('returns nothing once the token is revoked', async () => {
    const { referenceCode, trackingToken } = await submit()
    expect(await getCaseByTrackingToken(trackingToken)).not.toBeNull()

    await db
      .update(cases)
      .set({ trackingTokenRevokedAt: new Date() })
      .where(eq(cases.referenceCode, referenceCode))

    expect(await getCaseByTrackingToken(trackingToken)).toBeNull()
  })
})
