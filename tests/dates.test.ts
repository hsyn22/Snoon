import { describe, expect, it } from 'vitest'
import { formatCaseDate } from '../src/lib/dates'

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
