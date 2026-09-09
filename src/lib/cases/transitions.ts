import type { cases } from '@/db/schema'

export type CaseStatus = (typeof cases.status.enumValues)[number]

/**
 * The only case transitions the system permits, transcribed from the lifecycle
 * diagram in CLAUDE.md.
 *
 * This map is the authority. A client never sends a target state that is applied
 * directly — a request names an *action*, the server decides the resulting state,
 * and this map says whether that move is legal from where the case actually is.
 * Anything not listed here is not merely unimplemented, it is forbidden.
 */
export const ALLOWED_TRANSITIONS: Readonly<Record<CaseStatus, readonly CaseStatus[]>> = {
  // A student claims it, or it sits unclaimed past its useful life.
  REQUESTED: ['MATCHED', 'EXPIRED'],

  // The student makes contact, or the contact window runs out — or the person
  // who answers never asked for treatment, which ends the case there and then.
  MATCHED: ['CONTACTED', 'NO_CONTACT', 'CANCELLED'],

  // A failed contact returns the case to the queue rather than stranding it.
  NO_CONTACT: ['RETURNED_TO_QUEUE'],
  RETURNED_TO_QUEUE: ['REQUESTED'],

  // A wrong number can surface after the first call as easily as during it.
  CONTACTED: ['APPOINTMENT_CONFIRMED', 'CANCELLED'],
  // Back to REQUESTED when one student finished their part and the case still
  // needs treatments their stage may not perform — a fifth year does the root
  // canal, and the partial denture goes back for a fourth year. The case is not
  // completed: it is a smaller case now.
  APPOINTMENT_CONFIRMED: ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'REQUESTED'],

  // Terminal.
  COMPLETED: [],
  NO_SHOW: [],
  CANCELLED: [],
  EXPIRED: [],
}

/** States from which a case can never move again. */
export function isTerminal(status: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

export function canTransition(from: CaseStatus, to: CaseStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

/** Thrown when a transition is refused, so callers can tell it apart from a database failure. */
export class InvalidTransitionError extends Error {
  constructor(
    readonly from: CaseStatus,
    readonly to: CaseStatus,
  ) {
    super(`Case cannot move from ${from} to ${to}.`)
    this.name = 'InvalidTransitionError'
  }
}

export function assertTransition(from: CaseStatus, to: CaseStatus): void {
  if (!canTransition(from, to)) throw new InvalidTransitionError(from, to)
}
