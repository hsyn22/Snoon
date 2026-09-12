import 'server-only'
import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { secureCompare } from '@/lib/secure-compare'
import { generateTrackingToken, hashTrackingToken } from '@/lib/tracking-token'

/**
 * "I lost my link."
 *
 * A patient has no account by default, so their tracking link is the only thing
 * that opens their case. Losing it — a cleared browser, a new phone, a message
 * deleted — used to mean ringing an admin, and most people would simply give up
 * and assume سنون had forgotten them.
 *
 * Recovery asks for two things the patient has: the **case reference code** they
 * were given, and the **phone number on the case**. Neither alone is enough. The
 * code is not a secret — it is read out over the phone and printed on the
 * tracking page — and the phone number is exactly what سنون is trying to
 * protect, so the pair is what stands in for a password.
 *
 * Why the token has to be reissued rather than resent: what the database holds
 * is an HMAC of the token, never the token itself, so the original is
 * unrecoverable by design. The old link stops working, which is the right
 * outcome anyway — the usual reason a patient is here is that the old link ended
 * up somewhere they no longer control.
 *
 * Three rules this must never break:
 *
 * 1. **One answer for every failure.** A wrong code, a wrong number, a case that
 *    never existed and a case whose link was revoked all return the same thing.
 *    Any difference turns this into an oracle for "does SN-4KP7QW exist" or
 *    "which number is on it".
 * 2. **A revoked link stays revoked.** `reportWrongNumber` revokes the token
 *    precisely so that whoever submitted a stranger's number stops watching that
 *    stranger's data. Recovery must not hand it back.
 * 3. **A scrubbed case cannot be recovered.** After the retention period the
 *    phone column is an empty string, so there is nothing to check against — and
 *    an empty submitted value must never match it.
 */

export type RecoveryResult =
  | { ok: true; trackingToken: string; referenceCode: string }
  | { ok: false }

/** The single failure value. Named so a caller cannot accidentally distinguish. */
const NOT_FOUND: RecoveryResult = { ok: false }

export async function recoverTrackingLink(input: {
  /** As typed. Normalised here so the caller cannot get the casing wrong. */
  referenceCode: string
  /** Already normalised to 07XXXXXXXXX by the caller; null when unparseable. */
  patientPhone: string | null
}): Promise<RecoveryResult> {
  const referenceCode = input.referenceCode.trim().toUpperCase()
  if (!referenceCode || !input.patientPhone) return NOT_FOUND

  const [record] = await db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      patientPhone: cases.patientPhone,
      contactScrubbedAt: cases.contactScrubbedAt,
    })
    .from(cases)
    .where(and(eq(cases.referenceCode, referenceCode), isNull(cases.trackingTokenRevokedAt)))
    .limit(1)

  if (!record) return NOT_FOUND

  // Scrubbed cases hold an empty string, and an empty string must never match.
  if (record.contactScrubbedAt || !record.patientPhone) return NOT_FOUND

  // Constant time: a byte-by-byte comparison here leaks how much of a guessed
  // number was right, which is the whole game when the alphabet is ten digits.
  if (!secureCompare(input.patientPhone, record.patientPhone)) return NOT_FOUND

  // Reissue. The old link dies with the old hash, which is what we want.
  const trackingToken = generateTrackingToken()
  const updated = await db
    .update(cases)
    .set({ trackingTokenHash: hashTrackingToken(trackingToken), updatedAt: new Date() })
    .where(and(eq(cases.id, record.id), isNull(cases.trackingTokenRevokedAt)))
    .returning({ id: cases.id })

  // Revoked between the read and the write. Rare, and the answer is the same one.
  if (updated.length === 0) return NOT_FOUND

  return { ok: true, trackingToken, referenceCode: record.referenceCode }
}
