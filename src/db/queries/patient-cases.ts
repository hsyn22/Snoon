import 'server-only'
import { and, desc, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { hashTrackingToken } from '@/lib/tracking-token'

/**
 * A patient's own cases, when they chose to have an account.
 *
 * The account is an optional convenience and nothing more: it is somewhere to
 * find your cases again without a link. A case submitted without one behaves
 * identically in every other part of the product, and no student-facing or admin
 * query may branch on whether a case has an account attached.
 *
 * The projection is narrow on purpose, the same discipline the student-facing
 * queries follow. A patient looking at their own list does not need the phone
 * number they typed — they know it — and every column that is not selected is a
 * column that cannot leak through this path later.
 */

export type PatientCaseSummary = {
  id: string
  referenceCode: string
  status: (typeof cases.$inferSelect)['status']
  cityId: string
  treatmentTypeIds: string[]
  createdAt: Date
}

/** Oldest-first is wrong here: the case a patient came back for is the newest. */
export async function listCasesForPatient(authUserId: string): Promise<PatientCaseSummary[]> {
  return db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      status: cases.status,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      createdAt: cases.createdAt,
    })
    .from(cases)
    .where(eq(cases.patientAuthUserId, authUserId))
    .orderBy(desc(cases.createdAt))
    .limit(50)
}

export type AttachResult = { ok: true; referenceCode: string } | { ok: false }

/**
 * "Add this case to my account", from the tracking page.
 *
 * The realistic order of events is that somebody submits a case with no account,
 * gets their link, and only later decides they would rather not depend on it.
 * Linking at submission alone would never serve them.
 *
 * **The tracking token is the proof of ownership**, not the signed-in session. A
 * case id from a form would let anyone claim a stranger's case into their own
 * account; holding the link is exactly what "this is mine" means for a patient
 * here, and it is the same credential the tracking page already runs on.
 *
 * Refuses to move a case that already belongs to someone. Re-attaching to the
 * same account is a no-op and reports success, so a double tap is harmless.
 */
export async function attachCaseToPatient(input: {
  trackingToken: string
  authUserId: string
}): Promise<AttachResult> {
  // Looked up by the hash directly, as the tracking page does. The HMAC is
  // deterministic and the column is uniquely indexed, so this is one indexed
  // read — there is nothing to scan and nothing to compare in application code.
  const hash = hashTrackingToken(input.trackingToken)

  const [record] = await db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      patientAuthUserId: cases.patientAuthUserId,
      contactScrubbedAt: cases.contactScrubbedAt,
    })
    .from(cases)
    .where(and(eq(cases.trackingTokenHash, hash), isNull(cases.trackingTokenRevokedAt)))
    .limit(1)

  if (!record) return { ok: false }
  if (record.contactScrubbedAt) return { ok: false }
  if (record.patientAuthUserId && record.patientAuthUserId !== input.authUserId) {
    return { ok: false }
  }

  const updated = await db
    .update(cases)
    .set({ patientAuthUserId: input.authUserId, updatedAt: new Date() })
    .where(and(eq(cases.id, record.id), isNull(cases.trackingTokenRevokedAt)))
    .returning({ id: cases.id })

  if (updated.length === 0) return { ok: false }
  return { ok: true, referenceCode: record.referenceCode }
}
