import { and, eq, inArray, isNull, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, telegramLinks } from '@/db/schema'
import { CASE_REASON } from './reasons'

/**
 * Erasing a patient's contact details once their case is long over.
 *
 * A phone number exists to be shown to exactly one student, once. After the case
 * ends it has no remaining purpose, and every day it stays is exposure with no
 * upside — it is the single field in this system that would do the most harm if
 * the table ever leaked.
 *
 * What is erased: name, phone, and the patient's own free-text notes. Notes go
 * too because people write more than they are asked to, and a finished case has
 * no use for them.
 *
 * What survives, deliberately: the case row, its reference code, city,
 * treatments and its whole event log. An admin has to be able to answer "what
 * happened to SN-4KP7QW" when someone rings months later, and for a case that
 * went wrong the log is the only record there is. Scrubbing rather than deleting
 * also keeps a case that had a patient distinguishable from one whose details
 * were never filled in.
 *
 * Two things go with the details, because they are keys to them:
 *
 * - the **tracking token** is revoked, since a link that opens a case with
 *   nothing in it is a live credential with no purpose;
 * - any **Telegram binding** for the case is revoked, so nothing can later be
 *   sent to a chat about a patient the system no longer knows.
 */

/** Cases past treating. NO_SHOW and CANCELLED count: nobody is coming back to them. */
const TERMINAL_STATUSES = ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'] as const

export async function scrubExpiredContactDetails(olderThan: Date): Promise<number> {
  const due = await db
    .select({ id: cases.id })
    .from(cases)
    .where(
      and(
        isNull(cases.contactScrubbedAt),
        inArray(cases.status, [...TERMINAL_STATUSES]),
        // Measured from when the case ended, not when it was submitted.
        lte(cases.updatedAt, olderThan),
      ),
    )

  let scrubbed = 0

  for (const record of due) {
    await db.transaction(async (tx) => {
      // Guarded by `contactScrubbedAt IS NULL` so two runs racing scrub once.
      const updated = await tx
        .update(cases)
        .set({
          patientName: '',
          patientPhone: '',
          notes: null,
          /*
           * The account link goes with the rest of it.
           *
           * A patient account is optional and most cases have none, but where
           * one exists it points at an auth row carrying a real name and a real
           * email address. Leaving it would keep the case attached to an
           * identified person months after the name and number on the case were
           * deliberately erased — which would make the scrub cosmetic. The case
           * then drops out of that patient's "my cases" list, correctly: there
           * is nothing left on it to show them.
           */
          patientAuthUserId: null,
          contactScrubbedAt: new Date(),
          trackingTokenRevokedAt: sql`coalesce(${cases.trackingTokenRevokedAt}, now())`,
        })
        .where(and(eq(cases.id, record.id), isNull(cases.contactScrubbedAt)))
        .returning({ id: cases.id })

      if (updated.length === 0) return

      await tx
        .update(telegramLinks)
        .set({ revokedAt: new Date() })
        .where(
          and(
            eq(telegramLinks.subjectType, 'PATIENT_CASE'),
            eq(telegramLinks.subjectId, record.id),
            isNull(telegramLinks.revokedAt),
          ),
        )

      // The scrub is itself a thing that happened to the case, and the log is
      // what survives it. Recorded without moving the case, which is terminal.
      const [current] = await tx
        .select({ status: cases.status })
        .from(cases)
        .where(eq(cases.id, record.id))
        .limit(1)

      await tx.insert(caseEvents).values({
        caseId: record.id,
        fromStatus: current!.status,
        toStatus: current!.status,
        actorType: 'SYSTEM',
        reason: CASE_REASON.CONTACT_SCRUBBED,
      })

      scrubbed += 1
    })
  }

  return scrubbed
}
