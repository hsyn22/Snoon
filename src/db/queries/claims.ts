import { and, eq, inArray, lte, notExists, sql } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims, students } from '@/db/schema'
import { getContactWindowHours } from '@/lib/config'

/**
 * Claiming, and the contact window that follows it.
 *
 * "A case can never be claimed twice" is enforced twice over: a conditional
 * UPDATE that only matches a case still in REQUESTED, and a partial unique index
 * on claims that refuses a second ACTIVE row for the same case. Neither is a
 * read-then-decide-then-write, because that races.
 */

export type ClaimFailureReason =
  /** Someone else claimed it first, or it is no longer open. */
  | 'CASE_UNAVAILABLE'
  /** Verification is checked server-side on every claim, never trusted from a session. */
  | 'STUDENT_NOT_VERIFIED'
  /** The student holds an active claim on this case already. */
  | 'ALREADY_CLAIMED_BY_STUDENT'

export type ClaimResult =
  | { ok: true; claimId: string; contactDeadlineAt: Date }
  | { ok: false; reason: ClaimFailureReason }

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === '23505'
  )
}

/**
 * Bind a student to a case, atomically.
 *
 * The whole operation is one transaction: flip the case, insert the claim, write
 * the audit row. If any part fails the case is not left MATCHED with nobody
 * holding it.
 */
export async function claimCase(caseId: string, studentId: string): Promise<ClaimResult> {
  const contactWindowHours = await getContactWindowHours()

  try {
    return await db.transaction(async (tx) => {
      // Verification is re-read inside the transaction rather than taken from the
      // caller, so a student suspended a moment ago cannot still claim.
      const [student] = await tx
        .select({ verificationStatus: students.verificationStatus })
        .from(students)
        .where(eq(students.id, studentId))
        .limit(1)

      if (!student || student.verificationStatus !== 'VERIFIED') {
        return { ok: false, reason: 'STUDENT_NOT_VERIFIED' }
      }

      // The conditional update IS the lock. If the case is not still REQUESTED,
      // no row matches and nothing was written.
      const claimed = await tx
        .update(cases)
        .set({ status: 'MATCHED', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.status, 'REQUESTED')))
        .returning({ id: cases.id })

      if (claimed.length === 0) return { ok: false, reason: 'CASE_UNAVAILABLE' }

      const contactDeadlineAt = new Date(Date.now() + contactWindowHours * 60 * 60 * 1000)

      const [claim] = await tx
        .insert(claims)
        .values({ caseId, studentId, status: 'ACTIVE', contactDeadlineAt })
        .returning({ id: claims.id })

      if (!claim) throw new Error('Claim insert returned no row.')

      await tx.insert(caseEvents).values({
        caseId,
        fromStatus: 'REQUESTED',
        toStatus: 'MATCHED',
        actorType: 'STUDENT',
        actorId: studentId,
        reason: 'Case claimed by student.',
      })

      return { ok: true, claimId: claim.id, contactDeadlineAt }
    })
  } catch (error) {
    // The partial unique index fired: another transaction won the race between
    // our update and our insert. Same outcome as losing the update.
    if (isUniqueViolation(error)) return { ok: false, reason: 'CASE_UNAVAILABLE' }
    throw error
  }
}

/**
 * Release a claim and put the case back in the queue.
 *
 * Used when the contact window expires and when a student gives a case up. The
 * released claim row is kept, not deleted: it is the record that stops the queue
 * offering the same case straight back to the same student.
 */
export async function releaseClaim(
  claimId: string,
  options: { reason: string; actorType: 'STUDENT' | 'ADMIN' | 'SYSTEM'; actorId?: string },
): Promise<boolean> {
  return db.transaction(async (tx) => {
    const released = await tx
      .update(claims)
      .set({ status: 'RELEASED', releasedAt: new Date(), releaseReason: options.reason })
      .where(and(eq(claims.id, claimId), eq(claims.status, 'ACTIVE')))
      .returning({ caseId: claims.caseId })

    const claim = released[0]
    if (!claim) return false

    await tx
      .update(cases)
      .set({ status: 'REQUESTED', updatedAt: new Date() })
      .where(and(eq(cases.id, claim.caseId), eq(cases.status, 'MATCHED')))

    // The lifecycle passes through NO_CONTACT and RETURNED_TO_QUEUE on the way
    // back to REQUESTED, and the audit trail records each hop rather than
    // pretending the case jumped.
    await tx.insert(caseEvents).values([
      {
        caseId: claim.caseId,
        fromStatus: 'MATCHED',
        toStatus: 'NO_CONTACT',
        actorType: options.actorType,
        actorId: options.actorId ?? null,
        reason: options.reason,
      },
      {
        caseId: claim.caseId,
        fromStatus: 'NO_CONTACT',
        toStatus: 'RETURNED_TO_QUEUE',
        actorType: options.actorType,
        actorId: options.actorId ?? null,
        reason: options.reason,
      },
      {
        caseId: claim.caseId,
        fromStatus: 'RETURNED_TO_QUEUE',
        toStatus: 'REQUESTED',
        actorType: 'SYSTEM',
        reason: 'Returned to the queue for another student.',
      },
    ])

    return true
  })
}

/**
 * Expire every claim whose contact window has run out.
 *
 * Runs as a scheduled job over an indexed query, never as a timer set at claim
 * time — a timer would not survive a deploy. Returns how many were released.
 */
export async function expireOverdueClaims(now: Date = new Date()): Promise<number> {
  const overdue = await db
    .select({ id: claims.id })
    .from(claims)
    .where(and(eq(claims.status, 'ACTIVE'), lte(claims.contactDeadlineAt, now)))

  let released = 0
  for (const claim of overdue) {
    const ok = await releaseClaim(claim.id, {
      reason: 'Contact window expired without contact.',
      actorType: 'SYSTEM',
    })
    if (ok) released += 1
  }
  return released
}

/** Cases this student previously held and lost — the queue must not re-offer them. */
export function studentPreviouslyReleased(studentId: string) {
  return notExists(
    db
      .select({ one: sql`1` })
      .from(claims)
      .where(
        and(
          eq(claims.caseId, cases.id),
          eq(claims.studentId, studentId),
          inArray(claims.status, ['RELEASED', 'EXPIRED']),
        ),
      ),
  )
}


/** The claim a student is currently holding, if any. A student holds at most one at a time. */
export async function getActiveClaimForStudent(
  studentId: string,
): Promise<{ id: string; caseId: string; contactDeadlineAt: Date } | null> {
  const [row] = await db
    .select({
      id: claims.id,
      caseId: claims.caseId,
      contactDeadlineAt: claims.contactDeadlineAt,
    })
    .from(claims)
    .where(and(eq(claims.studentId, studentId), eq(claims.status, 'ACTIVE')))
    .limit(1)

  return row ?? null
}
