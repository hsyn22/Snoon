import { and, eq, isNull, lte } from 'drizzle-orm'
import { db } from '@/db'
import { appointments, caseEvents, cases, claims } from '@/db/schema'
import { assertTransition, type CaseStatus } from './transitions'

/**
 * The rest of the case lifecycle: appointment, and how a case ends.
 *
 * Every move is a conditional update guarded by the status it is allowed to come
 * from, so a reloaded page or a double tap cannot apply the same transition
 * twice or apply one to a case that has since moved. The allowed-transitions map
 * is asserted first, so an illegal move fails here rather than being written and
 * discovered later in the audit trail.
 */

export type LifecycleFailure =
  | 'NO_ACTIVE_CLAIM'
  | 'WRONG_STATUS'
  | 'NOT_FOUND'
  | 'APPOINTMENT_IN_PAST'

export type LifecycleResult<T = void> =
  | ({ ok: true } & (T extends void ? Record<never, never> : { value: T }))
  | { ok: false; reason: LifecycleFailure }

/** The claim a student holds on a case, with the case's current status. */
async function activeClaimFor(caseId: string, studentId: string) {
  const [row] = await db
    .select({ claimId: claims.id, status: cases.status, referenceCode: cases.referenceCode })
    .from(claims)
    .innerJoin(cases, eq(cases.id, claims.caseId))
    .where(
      and(eq(claims.caseId, caseId), eq(claims.studentId, studentId), eq(claims.status, 'ACTIVE')),
    )
    .limit(1)
  return row ?? null
}

/**
 * The student and patient have agreed a time.
 *
 * Supersedes any earlier appointment rather than overwriting it, so a reschedule
 * leaves a trail. Refuses a time in the past: a patient cannot attend one, and
 * accepting it would quietly break the reminder that will be built on this.
 */
export async function confirmAppointment(
  studentId: string,
  caseId: string,
  scheduledFor: Date,
  now: Date = new Date(),
): Promise<LifecycleResult<{ referenceCode: string }>> {
  if (scheduledFor.getTime() <= now.getTime()) {
    return { ok: false, reason: 'APPOINTMENT_IN_PAST' }
  }

  const claim = await activeClaimFor(caseId, studentId)
  if (!claim) return { ok: false, reason: 'NO_ACTIVE_CLAIM' }

  // Rescheduling is legal from APPOINTMENT_CONFIRMED; the first booking comes
  // from CONTACTED. Anything else is not a case with an agreed time.
  const from: CaseStatus = claim.status === 'APPOINTMENT_CONFIRMED' ? 'APPOINTMENT_CONFIRMED' : 'CONTACTED'
  if (claim.status !== 'CONTACTED' && claim.status !== 'APPOINTMENT_CONFIRMED') {
    return { ok: false, reason: 'WRONG_STATUS' }
  }
  if (from === 'CONTACTED') assertTransition('CONTACTED', 'APPOINTMENT_CONFIRMED')

  return db.transaction(async (tx) => {
    const moved = await tx
      .update(cases)
      .set({ status: 'APPOINTMENT_CONFIRMED', updatedAt: now })
      .where(and(eq(cases.id, caseId), eq(cases.status, claim.status)))
      .returning({ referenceCode: cases.referenceCode })

    if (moved.length === 0) return { ok: false, reason: 'WRONG_STATUS' }

    await tx
      .update(appointments)
      .set({ supersededAt: now })
      .where(and(eq(appointments.caseId, caseId), isNull(appointments.supersededAt)))

    await tx.insert(appointments).values({ caseId, claimId: claim.claimId, scheduledFor })

    await tx.insert(caseEvents).values({
      caseId,
      fromStatus: claim.status,
      toStatus: 'APPOINTMENT_CONFIRMED',
      actorType: 'STUDENT',
      actorId: studentId,
      reason:
        claim.status === 'APPOINTMENT_CONFIRMED'
          ? 'Appointment rescheduled by the student.'
          : 'Appointment agreed with the patient.',
    })

    return { ok: true, value: { referenceCode: claim.referenceCode } }
  })
}

/** How a case ends once an appointment exists. All three are terminal. */
export type CaseOutcome = 'COMPLETED' | 'NO_SHOW' | 'CANCELLED'

const OUTCOME_REASON: Record<CaseOutcome, string> = {
  COMPLETED: 'Treatment completed.',
  NO_SHOW: 'Patient did not attend the appointment.',
  CANCELLED: 'Appointment cancelled.',
}

/**
 * Record how the case ended, and close the claim with it.
 *
 * The claim is closed in the same transaction: leaving it ACTIVE would keep a
 * finished case counting against the student and keep the contact-window job
 * looking at it.
 */
export async function recordOutcome(
  studentId: string,
  caseId: string,
  outcome: CaseOutcome,
  note?: string,
): Promise<LifecycleResult> {
  assertTransition('APPOINTMENT_CONFIRMED', outcome)

  const claim = await activeClaimFor(caseId, studentId)
  if (!claim) return { ok: false, reason: 'NO_ACTIVE_CLAIM' }
  if (claim.status !== 'APPOINTMENT_CONFIRMED') return { ok: false, reason: 'WRONG_STATUS' }

  return db.transaction(async (tx) => {
    const moved = await tx
      .update(cases)
      .set({ status: outcome, updatedAt: new Date() })
      .where(and(eq(cases.id, caseId), eq(cases.status, 'APPOINTMENT_CONFIRMED')))
      .returning({ id: cases.id })

    if (moved.length === 0) return { ok: false, reason: 'WRONG_STATUS' }

    await tx
      .update(claims)
      .set({ status: 'COMPLETED', releasedAt: new Date(), releaseReason: OUTCOME_REASON[outcome] })
      .where(eq(claims.id, claim.claimId))

    await tx.insert(caseEvents).values({
      caseId,
      fromStatus: 'APPOINTMENT_CONFIRMED',
      toStatus: outcome,
      actorType: 'STUDENT',
      actorId: studentId,
      reason: note?.trim() ? `${OUTCOME_REASON[outcome]} ${note.trim()}` : OUTCOME_REASON[outcome],
    })

    return { ok: true }
  })
}

/**
 * Expire cases that have sat unclaimed past their useful life.
 *
 * A patient who submitted months ago has almost certainly found treatment
 * elsewhere or given up; leaving the case in the queue wastes a student's claim
 * and, worse, has them ring someone who no longer wants to be rung.
 *
 * Only touches REQUESTED cases, so nothing mid-treatment can be swept up.
 */
export async function expireStaleRequestedCases(olderThan: Date): Promise<number> {
  assertTransition('REQUESTED', 'EXPIRED')

  const stale = await db
    .select({ id: cases.id })
    .from(cases)
    .where(and(eq(cases.status, 'REQUESTED'), lte(cases.createdAt, olderThan)))

  let expired = 0
  for (const entry of stale) {
    const moved = await db.transaction(async (tx) => {
      const updated = await tx
        .update(cases)
        .set({ status: 'EXPIRED', updatedAt: new Date() })
        .where(and(eq(cases.id, entry.id), eq(cases.status, 'REQUESTED')))
        .returning({ id: cases.id })

      if (updated.length === 0) return false

      await tx.insert(caseEvents).values({
        caseId: entry.id,
        fromStatus: 'REQUESTED',
        toStatus: 'EXPIRED',
        actorType: 'SYSTEM',
        reason: 'Case sat unclaimed past its useful life.',
      })
      return true
    })

    if (moved) expired += 1
  }

  return expired
}
