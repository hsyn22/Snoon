import { and, count, desc, eq, inArray, isNull, isNotNull, lte, notExists, sql } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims, students } from '@/db/schema'
import { getContactWindowHours } from '@/lib/config/settings'
import { CASE_REASON } from '@/lib/cases/reasons'
import { isUniqueViolation } from '@/db/unique-violation'

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
        reason: CASE_REASON.CLAIMED,
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
        reason: CASE_REASON.RETURNED_TO_QUEUE,
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
    .where(
      and(
        eq(claims.status, 'ACTIVE'),
        lte(claims.contactDeadlineAt, now),
        /**
         * Only claims where the student never said they called.
         *
         * That is the case this job was written for: nobody rang, and the
         * patient should not wait behind a student who is not going to act. A
         * student who did ring is a different situation entirely — the silence
         * is the patient's, and taking the case away punishes the one person who
         * did what was asked while sending the next student to the same
         * unresponsive number. Those go to an admin instead, and are never
         * released automatically. See `listClaimsAwaitingPatient`.
         */
        isNull(claims.contactAssertedAt),
      ),
    )

  let released = 0
  for (const claim of overdue) {
    const ok = await releaseClaim(claim.id, {
      reason: CASE_REASON.CONTACT_WINDOW_EXPIRED,
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

/**
 * A student's own record: the cases they have held and how each ended.
 *
 * The reason this exists is not nostalgia. A student is here because their
 * university requires a number of cases; "how many have I done" is the question
 * they actually came to answer, and until now the site could not answer it. It
 * is also the data that any future fairness policy would be computed from
 * (open decision 1), which is worth having long before the policy is decided.
 *
 * No contact details, by construction. These claims are closed, and the grant of
 * a patient's name and number was for the active claim only — a student who
 * finished a case last month has no more right to that number than anyone else.
 */
export type StudentCaseHistoryEntry = {
  claimId: string
  caseId: string
  referenceCode: string
  /**
   * What this student treated, when the claim ended in treatment; otherwise
   * what the case was asking for while they held it. The two differ on a shared
   * case, which shrinks as each stage does its part.
   */
  treatmentTypeIds: string[]
  claimStatus: (typeof claims.status.enumValues)[number]
  caseStatus: (typeof cases.status.enumValues)[number]
  releaseReason: string | null
  claimedAt: Date
  closedAt: Date | null
}

export async function listCaseHistoryForStudent(
  studentId: string,
  limit = 100,
): Promise<StudentCaseHistoryEntry[]> {
  return db
    .select({
      claimId: claims.id,
      caseId: claims.caseId,
      referenceCode: cases.referenceCode,
      treatmentTypeIds: sql<string[]>`coalesce(${claims.treatedTreatmentIds}, ${cases.treatmentTypeIds})`,
      claimStatus: claims.status,
      caseStatus: cases.status,
      releaseReason: claims.releaseReason,
      claimedAt: claims.createdAt,
      closedAt: claims.releasedAt,
    })
    .from(claims)
    .innerJoin(cases, eq(cases.id, claims.caseId))
    .where(eq(claims.studentId, studentId))
    .orderBy(desc(claims.createdAt))
    .limit(limit)
}

/**
 * How many cases this student has actually treated.
 *
 * Counts claims that ended in treatment — a completed case, or a share of one
 * handed on to another stage. A claim that expired or was released is not a
 * treated case and must not inflate the number a student reports to their
 * university.
 */
export async function countTreatedCasesForStudent(studentId: string): Promise<number> {
  const [row] = await db
    .select({ total: count() })
    .from(claims)
    .where(
      and(
        eq(claims.studentId, studentId),
        /**
         * The presence of a treated set, not the claim's status.
         *
         * A NO_SHOW outcome closes the claim as COMPLETED too — the claim
         * finished, the treatment did not — so counting by status credited a
         * student for a patient who never turned up. `treatedTreatmentIds` is
         * written only where treatment actually happened, which is the question
         * being asked.
         */
        isNotNull(claims.treatedTreatmentIds),
      ),
    )

  return Number(row?.total ?? 0)
}

/**
 * Claims where the student says they called and the patient never answered.
 *
 * The gap this fills: the product asks the patient to confirm, through Telegram
 * and through their tracking link, and only their answer advances the case. A
 * patient who uses neither — which is entirely ordinary on a cheap phone —
 * leaves the case stuck. Advancing it on the student's word alone is exactly
 * what the confirmation rule exists to prevent, and releasing it punishes a
 * student who did their part.
 *
 * So neither happens automatically. These surface to an admin, who can ring the
 * patient and decide. That does not scale to thousands of cases and does not
 * need to: at one or two cities it is a handful a week, and a wrong automatic
 * answer here costs someone their treatment or their case.
 */
export type ClaimAwaitingPatient = {
  claimId: string
  caseId: string
  referenceCode: string
  studentId: string
  studentName: string
  contactAssertedAt: Date
  contactDeadlineAt: Date
}

export async function listClaimsAwaitingPatient(
  now: Date = new Date(),
  limit = 50,
): Promise<ClaimAwaitingPatient[]> {
  return db
    .select({
      claimId: claims.id,
      caseId: claims.caseId,
      referenceCode: cases.referenceCode,
      studentId: claims.studentId,
      studentName: students.fullName,
      contactAssertedAt: claims.contactAssertedAt,
      contactDeadlineAt: claims.contactDeadlineAt,
    })
    .from(claims)
    .innerJoin(cases, eq(cases.id, claims.caseId))
    .innerJoin(students, eq(students.id, claims.studentId))
    .where(
      and(
        eq(claims.status, 'ACTIVE'),
        eq(cases.status, 'MATCHED'),
        isNotNull(claims.contactAssertedAt),
        lte(claims.contactDeadlineAt, now),
      ),
    )
    .orderBy(claims.contactDeadlineAt)
    .limit(limit)
    .then((rows) =>
      rows.map((row) => ({ ...row, contactAssertedAt: row.contactAssertedAt as Date })),
    )
}
