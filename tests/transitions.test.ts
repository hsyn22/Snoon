import { describe, expect, it } from 'vitest'
import {
  ALLOWED_TRANSITIONS,
  assertTransition,
  canTransition,
  InvalidTransitionError,
  isTerminal,
  type CaseStatus,
} from '@/lib/cases/transitions'

const ALL_STATUSES = Object.keys(ALLOWED_TRANSITIONS) as CaseStatus[]

describe('the transition map', () => {
  it('covers every status in the lifecycle', () => {
    expect(ALL_STATUSES.sort()).toEqual(
      [
        'REQUESTED',
        'MATCHED',
        'CONTACTED',
        'APPOINTMENT_CONFIRMED',
        'COMPLETED',
        'NO_CONTACT',
        'RETURNED_TO_QUEUE',
        'NO_SHOW',
        'CANCELLED',
        'EXPIRED',
      ].sort(),
    )
  })

  it('never names a target that is not itself a status', () => {
    for (const [from, targets] of Object.entries(ALLOWED_TRANSITIONS)) {
      for (const target of targets) {
        expect(ALL_STATUSES, `${from} → ${target}`).toContain(target)
      }
    }
  })

  it('never allows a case to transition to itself', () => {
    for (const status of ALL_STATUSES) {
      expect(canTransition(status, status), `${status} → ${status}`).toBe(false)
    }
  })

  it('leaves every status reachable from REQUESTED', () => {
    // A status nobody can ever reach is dead code in the domain model.
    const reached = new Set<CaseStatus>(['REQUESTED'])
    const queue: CaseStatus[] = ['REQUESTED']
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const next of ALLOWED_TRANSITIONS[current]) {
        if (!reached.has(next)) {
          reached.add(next)
          queue.push(next)
        }
      }
    }
    expect([...reached].sort()).toEqual(ALL_STATUSES.sort())
  })
})

describe('the happy path', () => {
  it.each([
    ['REQUESTED', 'MATCHED'],
    ['MATCHED', 'CONTACTED'],
    ['CONTACTED', 'APPOINTMENT_CONFIRMED'],
    ['APPOINTMENT_CONFIRMED', 'COMPLETED'],
  ] as const)('allows %s → %s', (from, to) => {
    expect(canTransition(from, to)).toBe(true)
  })
})

describe('the failed-contact path', () => {
  it('lets an uncontacted case return to the queue and be claimed again', () => {
    expect(canTransition('MATCHED', 'NO_CONTACT')).toBe(true)
    expect(canTransition('NO_CONTACT', 'RETURNED_TO_QUEUE')).toBe(true)
    expect(canTransition('RETURNED_TO_QUEUE', 'REQUESTED')).toBe(true)
    expect(canTransition('REQUESTED', 'MATCHED')).toBe(true)
  })
})

describe('refusals that protect a patient', () => {
  it('never lets a case skip straight from REQUESTED to CONTACTED', () => {
    // Contact without a claim would mean a student saw a phone number they
    // were never granted.
    expect(canTransition('REQUESTED', 'CONTACTED')).toBe(false)
  })

  it('never lets a claimed case be claimed again', () => {
    expect(canTransition('MATCHED', 'MATCHED')).toBe(false)
  })

  it('never lets a completed case be reopened', () => {
    for (const target of ALL_STATUSES) {
      expect(canTransition('COMPLETED', target), `COMPLETED → ${target}`).toBe(false)
    }
  })

  it('never lets an appointment be confirmed before contact happened', () => {
    expect(canTransition('MATCHED', 'APPOINTMENT_CONFIRMED')).toBe(false)
  })

  it('never lets an expired case come back', () => {
    expect(canTransition('EXPIRED', 'REQUESTED')).toBe(false)
  })
})

describe('isTerminal', () => {
  it.each(['COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'] as const)('%s is terminal', (status) => {
    expect(isTerminal(status)).toBe(true)
  })

  it.each(['REQUESTED', 'MATCHED', 'CONTACTED', 'APPOINTMENT_CONFIRMED'] as const)(
    '%s is not terminal',
    (status) => {
      expect(isTerminal(status)).toBe(false)
    },
  )
})

describe('assertTransition', () => {
  it('passes a legal move silently', () => {
    expect(() => assertTransition('REQUESTED', 'MATCHED')).not.toThrow()
  })

  it('throws a typed error naming both states', () => {
    expect(() => assertTransition('COMPLETED', 'REQUESTED')).toThrow(InvalidTransitionError)
    expect(() => assertTransition('COMPLETED', 'REQUESTED')).toThrow(/COMPLETED to REQUESTED/)
  })
})
