import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  formatAppointment,
  formatCaseDate,
  formatCaseDateTime,
  parseBaghdadDateTime,
  toBaghdadInputValue,
} from '../src/lib/dates'

const DATE = new Date('2026-09-09T10:00:00Z')

describe('formatCaseDate', () => {
  it('uses Western digits', () => {
    expect(formatCaseDate(DATE)).toMatch(/2026/)
    expect(formatCaseDate(DATE)).not.toMatch(/[٠-٩]/)
  })

  it('spells the month in Arabic rather than using slashes', () => {
    const formatted = formatCaseDate(DATE)
    expect(formatted).not.toContain('/')
    expect(formatted).toMatch(/[؀-ۿ]/)
  })

  it('contains no bidi control characters', () => {
    // These are what scrambled "09/09/2026" into "092026/09/" on the tracking page.
    expect(formatCaseDate(DATE)).not.toMatch(/[‎‏؜‪-‮⁦-⁩]/)
  })

  it('keeps the day and year readable', () => {
    expect(formatCaseDate(DATE)).toContain('9')
    expect(formatCaseDate(DATE)).toContain('2026')
  })
})

describe('formatCaseDateTime', () => {
  it('includes the time, because a 48-hour deadline is a moment not a day', () => {
    const formatted = formatCaseDateTime(DATE)
    expect(formatted).toMatch(/2026/)
    expect(formatted).toMatch(/\d:\d{2}/)
  })

  it('uses Western digits and no bidi control characters', () => {
    const formatted = formatCaseDateTime(DATE)
    expect(formatted).not.toMatch(/[٠-٩]/)
    expect(formatted).not.toMatch(/[‎‏؜‪-‮⁦-⁩]/)
  })
})

describe('parseBaghdadDateTime', () => {
  it('reads a wall-clock value as Baghdad time, not the server or device zone', () => {
    // 10:30 in Baghdad is 07:30 UTC. A student whose phone is set elsewhere must
    // not book the patient hours away from the time they typed.
    const instant = parseBaghdadDateTime('2026-09-13T10:30')
    expect(instant?.toISOString()).toBe('2026-09-13T07:30:00.000Z')
  })

  it('is stable across the year, because Iraq has no daylight saving', () => {
    expect(parseBaghdadDateTime('2026-01-13T10:30')?.toISOString()).toBe('2026-01-13T07:30:00.000Z')
    expect(parseBaghdadDateTime('2026-07-13T10:30')?.toISOString()).toBe('2026-07-13T07:30:00.000Z')
  })

  it.each([[''], ['not-a-date'], ['2026-09-13'], ['2026-13-45T10:30'], ['2026-09-13T10:30:00']])(
    'rejects %j',
    (value) => {
      expect(parseBaghdadDateTime(value)).toBeNull()
    },
  )
})

describe('formatAppointment', () => {
  it('shows the day, date and time in Baghdad time', () => {
    const formatted = formatAppointment(new Date('2026-09-13T07:30:00Z'))
    expect(formatted).toMatch(/10:30/)
    expect(formatted).toMatch(/2026/)
    expect(formatted).not.toMatch(/[٠-٩]/)
    expect(formatted).not.toMatch(/[‎‏؜‪-‮⁦-⁩]/)
  })
})

/**
 * Baghdad, on every formatter — the bug Haider found by not finding his cases.
 *
 * Vercel's functions run in UTC. Without an explicit zone, `Intl` used the
 * server's, so anything submitted between 21:00 and midnight Baghdad was
 * printed with **yesterday's** date. He submitted several cases at 01:45
 * Baghdad on the 17th, opened `/admin/cases`, and could not find them: they
 * were at the top of the list under 16 أيلول.
 *
 * These run with the process pinned to UTC, which is the environment that was
 * wrong. Under the old code the first assertion in each block fails.
 */
describe('dates are Baghdad time, whatever the server thinks', () => {
  const saved = process.env.TZ

  beforeAll(() => {
    process.env.TZ = 'UTC'
  })
  afterAll(() => {
    if (saved === undefined) delete process.env.TZ
    else process.env.TZ = saved
  })

  /** 22:45 UTC on the 16th is 01:45 Baghdad on the 17th. */
  const afterMidnightInBaghdad = new Date('2026-09-16T22:45:00Z')

  it('formatCaseDate gives the Baghdad day, not the UTC one', () => {
    expect(formatCaseDate(afterMidnightInBaghdad)).toContain('17')
    expect(formatCaseDate(afterMidnightInBaghdad)).not.toContain('16')
  })

  it('formatCaseDateTime gives the Baghdad day and hour', () => {
    // The contact deadline is read off this. Three hours wrong is the
    // difference between a student thinking they have tonight and not.
    const formatted = formatCaseDateTime(afterMidnightInBaghdad)
    expect(formatted).toContain('17')
    expect(formatted).toContain('1:45')
  })

  it('formatAppointment was already correct and stays correct', () => {
    expect(formatAppointment(afterMidnightInBaghdad)).toContain('17')
  })

  it('agrees with the parser: what is typed is what is printed', () => {
    // A student types a wall clock; the patient must be told the same one.
    const instant = parseBaghdadDateTime('2026-09-17T09:30')
    expect(instant).not.toBeNull()
    expect(formatAppointment(instant!)).toContain('9:30')
    expect(formatCaseDateTime(instant!)).toContain('9:30')
    expect(toBaghdadInputValue(instant!)).toBe('2026-09-17T09:30')
  })

  it('leaves a midday instant on the same day', () => {
    // Guards against "fixed" by subtracting three hours everywhere.
    expect(formatCaseDate(new Date('2026-09-17T09:00:00Z'))).toContain('17')
  })
})
