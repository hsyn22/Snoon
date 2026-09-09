import { describe, expect, it } from 'vitest'
import {
  formatAppointment,
  formatCaseDate,
  formatCaseDateTime,
  parseBaghdadDateTime,
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
