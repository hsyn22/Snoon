import { inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Link recovery and the optional patient account.
 *
 * Both were added because a patient with no account has exactly one way back to
 * their case, and losing it meant losing the case. Both are also the kind of
 * feature that quietly becomes a hole: recovery is a form that hands out access
 * to a case, and an account is a second path to the same data. So the tests here
 * are mostly about what must NOT work.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('patient link recovery and accounts', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases } = await import('@/db/schema')
  const { submitCase, getCaseByTrackingToken } = await import('@/db/queries/cases')
  const { recoverTrackingLink } = await import('@/db/queries/case-recovery')
  const { attachCaseToPatient, listCasesForPatient } = await import('@/db/queries/patient-cases')

  const caseIds: string[] = []

  async function makeCase(overrides: { phone?: string; authUserId?: string } = {}) {
    const result = await submitCase({
      cityId: 'baghdad',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sat'],
      patientName: 'مريض الاختبار',
      patientPhone: overrides.phone ?? '07701234567',
      notes: null,
      patientAuthUserId: overrides.authUserId ?? null,
    })
    caseIds.push(result.caseId)
    return result
  }

  afterAll(async () => {
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
  })

  describe('recovering a lost tracking link', () => {
    it('returns a working link for the right code and number', async () => {
      const submitted = await makeCase()

      const recovered = await recoverTrackingLink({
        referenceCode: submitted.referenceCode,
        patientPhone: '07701234567',
      })

      expect(recovered.ok).toBe(true)
      if (!recovered.ok) return

      const record = await getCaseByTrackingToken(recovered.trackingToken)
      expect(record?.referenceCode).toBe(submitted.referenceCode)
    })

    it('accepts the code in any case, as a phone keyboard will send it', async () => {
      const submitted = await makeCase()

      const recovered = await recoverTrackingLink({
        referenceCode: submitted.referenceCode.toLowerCase(),
        patientPhone: '07701234567',
      })
      expect(recovered.ok).toBe(true)
    })

    it('kills the old link when it issues a new one', async () => {
      const submitted = await makeCase()

      const recovered = await recoverTrackingLink({
        referenceCode: submitted.referenceCode,
        patientPhone: '07701234567',
      })
      expect(recovered.ok).toBe(true)

      // What the database holds is an HMAC, so the original token is
      // unrecoverable by design and recovery has to reissue. The old link dying
      // is the right outcome anyway: the usual reason somebody is here is that
      // the old one ended up somewhere they no longer control.
      expect(await getCaseByTrackingToken(submitted.trackingToken)).toBeNull()
    })

    it('refuses the right code with the wrong number', async () => {
      const submitted = await makeCase()

      expect(
        await recoverTrackingLink({
          referenceCode: submitted.referenceCode,
          patientPhone: '07709998888',
        }),
      ).toEqual({ ok: false })
    })

    it('refuses a code that does not exist', async () => {
      expect(
        await recoverTrackingLink({ referenceCode: 'SN-ZZZZZZ', patientPhone: '07701234567' }),
      ).toEqual({ ok: false })
    })

    it('refuses an unparseable number without saying so', async () => {
      const submitted = await makeCase()

      // The action passes null when normalisePhone rejects the input. Reporting
      // "that is not a valid Iraqi mobile" separately would tell whoever is
      // guessing which half of their guess to keep.
      expect(
        await recoverTrackingLink({ referenceCode: submitted.referenceCode, patientPhone: null }),
      ).toEqual({ ok: false })
    })

    it('will not resurrect a link that was revoked', async () => {
      const submitted = await makeCase()

      // reportWrongNumber revokes the token precisely so whoever submitted a
      // stranger's number stops watching that stranger's data. Recovery handing
      // it back would undo the only remedy that exists for that.
      await db
        .update(cases)
        .set({ trackingTokenRevokedAt: new Date() })
        .where(inArray(cases.id, [submitted.caseId]))

      expect(
        await recoverTrackingLink({
          referenceCode: submitted.referenceCode,
          patientPhone: '07701234567',
        }),
      ).toEqual({ ok: false })
    })

    it('will not recover a case whose contact details were scrubbed', async () => {
      const submitted = await makeCase()

      // The scrub empties the phone column. An empty submitted value must never
      // match an empty stored one.
      await db
        .update(cases)
        .set({ patientPhone: '', patientName: '', contactScrubbedAt: new Date() })
        .where(inArray(cases.id, [submitted.caseId]))

      expect(
        await recoverTrackingLink({ referenceCode: submitted.referenceCode, patientPhone: null }),
      ).toEqual({ ok: false })
    })
  })

  describe('the optional account', () => {
    it('submits and lists a case for the patient who was signed in', async () => {
      const authUserId = `patient-${crypto.randomUUID()}`
      const submitted = await makeCase({ authUserId })

      const mine = await listCasesForPatient(authUserId)
      expect(mine.map((row) => row.referenceCode)).toContain(submitted.referenceCode)
    })

    it('never returns a contact detail in the list', async () => {
      const authUserId = `patient-${crypto.randomUUID()}`
      await makeCase({ authUserId })

      const [row] = await listCasesForPatient(authUserId)
      expect(row).toBeDefined()
      // The projection is the enforcement, as it is on the student side: a
      // column that is never selected cannot leak through this path later.
      expect(row).not.toHaveProperty('patientPhone')
      expect(row).not.toHaveProperty('patientName')
    })

    it('shows a patient nothing that is not theirs', async () => {
      const mine = `patient-${crypto.randomUUID()}`
      const theirs = `patient-${crypto.randomUUID()}`
      await makeCase({ authUserId: theirs })

      expect(await listCasesForPatient(mine)).toEqual([])
    })

    it('attaches a case to whoever holds its tracking link', async () => {
      const authUserId = `patient-${crypto.randomUUID()}`
      const submitted = await makeCase()

      const result = await attachCaseToPatient({
        trackingToken: submitted.trackingToken,
        authUserId,
      })
      expect(result).toEqual({ ok: true, referenceCode: submitted.referenceCode })

      const mine = await listCasesForPatient(authUserId)
      expect(mine.map((row) => row.referenceCode)).toEqual([submitted.referenceCode])
    })

    it('refuses a tracking token that is not real', async () => {
      expect(
        await attachCaseToPatient({
          trackingToken: 'not-a-real-token',
          authUserId: `patient-${crypto.randomUUID()}`,
        }),
      ).toEqual({ ok: false })
    })

    it('will not move a case that already belongs to somebody else', async () => {
      const owner = `patient-${crypto.randomUUID()}`
      const stranger = `patient-${crypto.randomUUID()}`
      const submitted = await makeCase({ authUserId: owner })

      // Holding the link is what "this is mine" means for a patient, but it must
      // not be enough to take a case off an account that already has it.
      expect(
        await attachCaseToPatient({ trackingToken: submitted.trackingToken, authUserId: stranger }),
      ).toEqual({ ok: false })

      expect(await listCasesForPatient(stranger)).toEqual([])
      expect((await listCasesForPatient(owner)).length).toBe(1)
    })

    it('treats attaching the same case twice as a no-op', async () => {
      const authUserId = `patient-${crypto.randomUUID()}`
      const submitted = await makeCase()

      await attachCaseToPatient({ trackingToken: submitted.trackingToken, authUserId })
      const again = await attachCaseToPatient({
        trackingToken: submitted.trackingToken,
        authUserId,
      })

      expect(again.ok, 'a double tap must not be an error').toBe(true)
      expect((await listCasesForPatient(authUserId)).length).toBe(1)
    })

    it('drops the case out of the account when the scrub runs', async () => {
      const authUserId = `patient-${crypto.randomUUID()}`
      const submitted = await makeCase({ authUserId })

      const { scrubExpiredContactDetails } = await import('@/lib/cases/retention')

      // Force the case terminal and old enough for the scrub to reach it.
      const longAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 400)
      await db
        .update(cases)
        .set({ status: 'COMPLETED', updatedAt: longAgo, createdAt: longAgo })
        .where(inArray(cases.id, [submitted.caseId]))

      // Everything that ended before yesterday.
      await scrubExpiredContactDetails(new Date(Date.now() - 1000 * 60 * 60 * 24))

      // An account row carries a real name and a real address. Leaving the case
      // attached would keep it tied to an identified person months after the
      // details on it were deliberately erased, which would make the scrub
      // cosmetic.
      expect(await listCasesForPatient(authUserId)).toEqual([])
    })
  })
})
