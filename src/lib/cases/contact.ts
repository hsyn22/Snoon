import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims } from '@/db/schema'
import { assertTransition } from './transitions'
import { CASE_REASON } from './reasons'
import { releaseClaim } from '@/db/queries/claims'

/**
 * Confirming that contact actually happened.
 *
 * The rule from CLAUDE.md: the student's word alone does not advance
 * `MATCHED → CONTACTED`. A student saying "I called them" is recorded and lets
 * the patient be asked, but only the patient's own answer moves the case. A
 * student who never called cannot park a case out of reach that way.
 */

export type AssertContactResult =
  | { ok: true; caseId: string; referenceCode: string }
  | { ok: false; reason: 'NO_ACTIVE_CLAIM' }

/**
 * The student says they reached the patient.
 *
 * Writes an event and a timestamp; deliberately does not change the case status.
 * Only the patient's own answer does that.
 *
 * It does one other thing: it **extends the contact window**. The window exists
 * to stop a case being sat on, and a student who actually rang is not sitting on
 * it — but the patient they rang may never use Telegram and may never open a
 * tracking link, which is an ordinary way for the median user to behave rather
 * than a failure. Without the extension the case is taken off the one person who
 * did what was asked, and handed to another student who will ring the same
 * unresponsive number.
 */
export async function assertContactMade(
  studentId: string,
  caseId: string,
  graceHours: number,
): Promise<AssertContactResult> {
  return db.transaction(async (tx) => {
    const [claim] = await tx
      .select({ id: claims.id, referenceCode: cases.referenceCode })
      .from(claims)
      .innerJoin(cases, eq(cases.id, claims.caseId))
      .where(
        and(eq(claims.caseId, caseId), eq(claims.studentId, studentId), eq(claims.status, 'ACTIVE')),
      )
      .limit(1)

    if (!claim) return { ok: false, reason: 'NO_ACTIVE_CLAIM' }

    // Guarded by `contactAssertedAt IS NULL`, so a student tapping twice cannot
    // extend their own deadline indefinitely.
    await tx
      .update(claims)
      .set({
        contactAssertedAt: new Date(),
        contactDeadlineAt: new Date(Date.now() + graceHours * 60 * 60 * 1000),
      })
      .where(and(eq(claims.id, claim.id), isNull(claims.contactAssertedAt)))

    await tx.insert(caseEvents).values({
      caseId,
      fromStatus: 'MATCHED',
      toStatus: 'MATCHED',
      actorType: 'STUDENT',
      actorId: studentId,
      // Same status on both sides on purpose: this records a claim about the
      // world, not a transition. The case has not moved.
      reason: CASE_REASON.CONTACT_ASSERTED,
    })

    return { ok: true, caseId, referenceCode: claim.referenceCode }
  })
}

export type ConfirmContactResult =
  | { ok: true; referenceCode: string }
  | { ok: false; reason: 'NOT_FOUND' | 'WRONG_STATUS' }

/**
 * The patient confirms contact happened. This is the only thing that advances
 * the case to CONTACTED.
 *
 * The conditional update is the guard: it only matches a case still in MATCHED,
 * so a double tap on a Telegram button or a reloaded page cannot move a case
 * twice or move one that has since gone back to the queue.
 */
export async function confirmContactByPatient(caseId: string): Promise<ConfirmContactResult> {
  assertTransition('MATCHED', 'CONTACTED')

  return db.transaction(async (tx) => {
    const updated = await tx
      .update(cases)
      .set({ status: 'CONTACTED', updatedAt: new Date() })
      .where(and(eq(cases.id, caseId), eq(cases.status, 'MATCHED')))
      .returning({ referenceCode: cases.referenceCode })

    const row = updated[0]
    if (!row) {
      const [existing] = await tx
        .select({ id: cases.id })
        .from(cases)
        .where(eq(cases.id, caseId))
        .limit(1)
      return { ok: false, reason: existing ? 'WRONG_STATUS' : 'NOT_FOUND' }
    }

    await tx.insert(caseEvents).values({
      caseId,
      fromStatus: 'MATCHED',
      toStatus: 'CONTACTED',
      actorType: 'PATIENT',
      reason: CASE_REASON.CONTACT_CONFIRMED,
    })

    return { ok: true, referenceCode: row.referenceCode }
  })
}

/**
 * The patient says nobody has contacted them.
 *
 * Recorded, and nothing else: the contact window is already running and will
 * return the case to the queue on its own. Releasing it here would let a
 * mistaken tap take a case away from a student who is mid-conversation.
 */
export async function reportNoContactByPatient(caseId: string): Promise<boolean> {
  const [existing] = await db
    .select({ status: cases.status })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  if (!existing || existing.status !== 'MATCHED') return false

  await db.insert(caseEvents).values({
    caseId,
    fromStatus: 'MATCHED',
    toStatus: 'MATCHED',
    actorType: 'PATIENT',
    reason: CASE_REASON.NO_CONTACT_REPORTED,
  })

  return true
}

export type AdminContactDecision = 'CONFIRMED' | 'RELEASE'

/**
 * An admin decides a case where the student says they called and the patient
 * answered neither channel.
 *
 * This is the only path by which contact is confirmed without the patient
 * saying so, and it is deliberately a person rather than a timer. The rule the
 * product is built on — a student's word alone must not advance a case — is
 * about an *unchecked* claim; an admin who has rung the patient, or who knows
 * the student, is a check. A timer would not be.
 *
 * Both outcomes are guarded by the status they may come from, so two admins
 * clicking at once cannot apply the decision twice.
 */
export async function decideStuckContact(
  caseId: string,
  decision: AdminContactDecision,
  adminEmail: string,
): Promise<ConfirmContactResult> {
  if (decision === 'CONFIRMED') {
    assertTransition('MATCHED', 'CONTACTED')

    return db.transaction(async (tx) => {
      const updated = await tx
        .update(cases)
        .set({ status: 'CONTACTED', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.status, 'MATCHED')))
        .returning({ referenceCode: cases.referenceCode })

      const row = updated[0]
      if (!row) return { ok: false, reason: 'WRONG_STATUS' }

      await tx.insert(caseEvents).values({
        caseId,
        fromStatus: 'MATCHED',
        toStatus: 'CONTACTED',
        actorType: 'ADMIN',
        actorId: adminEmail,
        reason: CASE_REASON.CONTACT_CONFIRMED_BY_ADMIN,
      })

      return { ok: true, referenceCode: row.referenceCode }
    })
  }

  // Back to the queue. The student keeps the case in their history as a claim
  // that was released, which is what happened — they are not marked as having
  // failed, and the patient is not left waiting behind a stalled case.
  const [record] = await db
    .select({ referenceCode: cases.referenceCode })
    .from(cases)
    .where(and(eq(cases.id, caseId), eq(cases.status, 'MATCHED')))
    .limit(1)

  if (!record) return { ok: false, reason: 'WRONG_STATUS' }

  const [claim] = await db
    .select({ id: claims.id })
    .from(claims)
    .where(and(eq(claims.caseId, caseId), eq(claims.status, 'ACTIVE')))
    .limit(1)

  if (!claim) return { ok: false, reason: 'WRONG_STATUS' }

  const released = await releaseClaim(claim.id, {
    reason: CASE_REASON.RELEASED_BY_ADMIN,
    actorType: 'ADMIN',
    actorId: adminEmail,
  })

  return released
    ? { ok: true, referenceCode: record.referenceCode }
    : { ok: false, reason: 'WRONG_STATUS' }
}
