import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims } from '@/db/schema'
import { assertTransition } from './transitions'

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
 */
export async function assertContactMade(
  studentId: string,
  caseId: string,
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

    await tx
      .update(claims)
      .set({ contactAssertedAt: new Date() })
      .where(and(eq(claims.id, claim.id), isNull(claims.contactAssertedAt)))

    await tx.insert(caseEvents).values({
      caseId,
      fromStatus: 'MATCHED',
      toStatus: 'MATCHED',
      actorType: 'STUDENT',
      actorId: studentId,
      // Same status on both sides on purpose: this records a claim about the
      // world, not a transition. The case has not moved.
      reason: 'Student reported making contact; awaiting the patient to confirm.',
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
      reason: 'Patient confirmed a student made contact.',
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
    reason: 'Patient reported that no student had contacted them yet.',
  })

  return true
}
