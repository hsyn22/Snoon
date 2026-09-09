import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases } from '@/db/schema'
import { generateReferenceCode } from '@/lib/reference-code'
import { generateTrackingToken, hashTrackingToken } from '@/lib/tracking-token'
import type { WeekDay } from '@/lib/config'

/**
 * Data access for cases.
 *
 * Every function here selects an explicit column list. There is no `select *` in
 * this file and there must never be one: the access-control table in CLAUDE.md is
 * enforced by the shape of what these functions return, not by the UI choosing
 * what to render. `patientName` and `patientPhone` appear in exactly one
 * projection — the patient's own view of their own case — and the student-facing
 * projections are being added with the student side, without them.
 */

export type SubmitCaseInput = {
  cityId: string
  /** One or more treatments; a patient often needs several at once. */
  treatmentTypeIds: string[]
  availabilityDays: WeekDay[]
  patientName: string
  /** Already normalised to 07XXXXXXXXX by the caller. */
  patientPhone: string
  notes: string | null
}

export type SubmitCaseResult = {
  referenceCode: string
  /**
   * The only time this value exists in plaintext. It is handed to the patient in
   * their tracking link and never stored — the database holds an HMAC of it.
   */
  trackingToken: string
}

/** How many times to retry if a generated reference code is already taken. */
const REFERENCE_CODE_ATTEMPTS = 5

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}

/**
 * Insert a case and its opening audit row in one transaction, so a case can
 * never exist without the event that created it.
 */
export async function submitCase(input: SubmitCaseInput): Promise<SubmitCaseResult> {
  const trackingToken = generateTrackingToken()
  const trackingTokenHash = hashTrackingToken(trackingToken)

  for (let attempt = 1; attempt <= REFERENCE_CODE_ATTEMPTS; attempt += 1) {
    const referenceCode = generateReferenceCode()

    try {
      await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(cases)
          .values({
            referenceCode,
            cityId: input.cityId,
            treatmentTypeIds: input.treatmentTypeIds,
            availabilityDays: input.availabilityDays,
            patientName: input.patientName,
            patientPhone: input.patientPhone,
            notes: input.notes,
            trackingTokenHash,
          })
          .returning({ id: cases.id })

        if (!row) throw new Error('Case insert returned no row.')

        await tx.insert(caseEvents).values({
          caseId: row.id,
          fromStatus: null,
          toStatus: 'REQUESTED',
          actorType: 'PATIENT',
          reason: 'Case submitted by patient.',
        })
      })

      return { referenceCode, trackingToken }
    } catch (error) {
      // A reference code collision is expected occasionally and is not an error
      // worth surfacing — draw another and try again. Anything else propagates.
      if (isUniqueViolation(error) && attempt < REFERENCE_CODE_ATTEMPTS) continue
      throw error
    }
  }

  throw new Error(`Could not allocate a unique reference code in ${REFERENCE_CODE_ATTEMPTS} attempts.`)
}

/**
 * What the patient sees on their own tracking link. This is their own data, so it
 * includes their contact details — no other projection does.
 */
export type PatientCaseView = {
  referenceCode: string
  status: (typeof cases.status.enumValues)[number]
  cityId: string
  treatmentTypeIds: string[]
  availabilityDays: string[]
  patientName: string
  patientPhone: string
  notes: string | null
  createdAt: Date
}

/**
 * Look a case up by the patient's tracking token.
 *
 * The token is hashed and matched against the unique index, so this is a single
 * indexed lookup rather than a scan-and-compare — there is no set of rows to
 * time-attack. A revoked token matches nothing.
 */
export async function getCaseByTrackingToken(token: string): Promise<PatientCaseView | null> {
  const hash = hashTrackingToken(token)

  const [row] = await db
    .select({
      referenceCode: cases.referenceCode,
      status: cases.status,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      availabilityDays: cases.availabilityDays,
      patientName: cases.patientName,
      patientPhone: cases.patientPhone,
      notes: cases.notes,
      createdAt: cases.createdAt,
    })
    .from(cases)
    .where(and(eq(cases.trackingTokenHash, hash), isNull(cases.trackingTokenRevokedAt)))
    .limit(1)

  return row ?? null
}
