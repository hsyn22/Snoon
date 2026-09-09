import { describe, expect, it } from 'vitest'
import { generateReferenceCode, normaliseReferenceCode } from '../src/lib/reference-code'

describe('generateReferenceCode', () => {
  it('has the SN- prefix and six characters', () => {
    expect(generateReferenceCode()).toMatch(/^SN-[2346789ABCDEFGHJKMNPQRTUVWXYZ]{6}$/)
  })

  it('never emits a character that can be misread aloud', () => {
    // 0/O, 1/I/L and 5/S are the pairs people confuse over a phone line.
    const codes = Array.from({ length: 500 }, () => generateReferenceCode())
    for (const code of codes) {
      expect(code.slice(3)).not.toMatch(/[01OIL5S]/)
    }
  })

  it('does not repeat itself over many draws', () => {
    const codes = new Set(Array.from({ length: 2000 }, () => generateReferenceCode()))
    // Collisions are possible but should be vanishingly rare at this sample size.
    expect(codes.size).toBeGreaterThan(1995)
  })
})

describe('normaliseReferenceCode', () => {
  it.each([
    ['SN-4KP7QW', 'SN-4KP7QW'],
    ['sn-4kp7qw', 'SN-4KP7QW'],
    ['4KP7QW', 'SN-4KP7QW'],
    ['  SN-4KP7QW  ', 'SN-4KP7QW'],
    ['SN 4KP 7QW', 'SN-4KP7QW'],
  ])('normalises %s', (input, expected) => {
    expect(normaliseReferenceCode(input)).toBe(expected)
  })

  it('converts Arabic-Indic digits a patient may paste', () => {
    expect(normaliseReferenceCode('SN-٤KP٧QW')).toBe('SN-4KP7QW')
  })

  it.each([['SN-4KP7Q'], ['SN-4KP7QWX'], [''], ['!!!!!!']])('rejects %s', (input) => {
    expect(normaliseReferenceCode(input)).toBeNull()
  })
})
