import { and, arrayOverlaps, asc, eq, inArray, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims, students } from '@/db/schema'
import { studentPreviouslyReleased } from '@/db/queries/claims'
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


/**
 * What a verified student sees before claiming anything.
 *
 * This type has no `patientName` and no `patientPhone`, and that is the point:
 * the access-control table is enforced by the shape of the projection, so a
 * component cannot render a contact detail it was never given. Adding a contact
 * field here would be a bug, not a feature.
 */
export type StudentCaseListItem = {
  id: string
  referenceCode: string
  cityId: string
  treatmentTypeIds: string[]
  availabilityDays: string[]
  notes: string | null
  createdAt: Date
}

/**
 * Which cases a student is shown.
 *
 * The caller supplies the scope. Whether a student sees every case in their city
 * or only those matching their clinic and stage capability is an open product
 * decision (CLAUDE.md, open decisions), so the policy lives at the call site and
 * this function stays a plain filter. What it does NOT leave to the caller: the
 * case must be open, the student must be verified, and no contact detail is
 * returned under any argument.
 */
export type StudentCaseFilter = {
  cityIds: string[]
  /** When given, only cases asking for at least one of these treatments. */
  treatmentTypeIds?: string[]
  limit?: number
}

export async function listOpenCasesForStudent(
  studentId: string,
  filter: StudentCaseFilter,
): Promise<StudentCaseListItem[]> {
  // Verification is checked here, on every query, rather than trusted from a
  // session or a prior check.
  const [student] = await db
    .select({ verificationStatus: students.verificationStatus })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!student || student.verificationStatus !== 'VERIFIED') return []
  if (filter.cityIds.length === 0) return []

  const conditions = [
    eq(cases.status, 'REQUESTED'),
    inArray(cases.cityId, filter.cityIds),
    // A student who already held this case and lost it is not offered it again.
    studentPreviouslyReleased(studentId),
  ]

  if (filter.treatmentTypeIds && filter.treatmentTypeIds.length > 0) {
    // Array overlap, served by the GIN index on treatment_type_ids. Drizzle's
    // helper builds the array literal correctly; a hand-written `&&` template
    // sends a one-element list as a bare scalar and Postgres rejects it.
    conditions.push(arrayOverlaps(cases.treatmentTypeIds, filter.treatmentTypeIds))
  }

  return db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      availabilityDays: cases.availabilityDays,
      notes: cases.notes,
      createdAt: cases.createdAt,
    })
    .from(cases)
    .where(and(...conditions))
    .orderBy(asc(cases.createdAt))
    .limit(filter.limit ?? 50)
}

/**
 * The claimant's view — the only projection that returns contact details to a
 * student.
 *
 * It cannot be called without a student id, and it returns null unless that
 * student holds an ACTIVE claim on that case. The join is the authorisation:
 * there is no argument combination that yields a phone number to a student who
 * does not hold the case.
 */
export type ClaimantCaseView = StudentCaseListItem & {
  patientName: string
  patientPhone: string
  contactDeadlineAt: Date
}

export async function getCaseForClaimant(
  caseId: string,
  studentId: string,
): Promise<ClaimantCaseView | null> {
  const [row] = await db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      availabilityDays: cases.availabilityDays,
      notes: cases.notes,
      createdAt: cases.createdAt,
      patientName: cases.patientName,
      patientPhone: cases.patientPhone,
      contactDeadlineAt: claims.contactDeadlineAt,
    })
    .from(cases)
    .innerJoin(claims, eq(claims.caseId, cases.id))
    .where(and(eq(cases.id, caseId), eq(claims.studentId, studentId), eq(claims.status, 'ACTIVE')))
    .limit(1)

  return row ?? null
}
