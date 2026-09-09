import { describe, expect, it } from 'vitest'
import { formatPhoneForDisplay, normalisePhone } from '../src/lib/phone'

describe('normalisePhone', () => {
  it.each([
    ['07701234567', '07701234567'],
    ['+9647701234567', '07701234567'],
    ['009647701234567', '07701234567'],
    ['9647701234567', '07701234567'],
    ['7701234567', '07701234567'],
    ['0770 123 4567', '07701234567'],
    ['0770-123-4567', '07701234567'],
    ['  07701234567  ', '07701234567'],
  ])('accepts %s', (input, expected) => {
    expect(normalisePhone(input)).toBe(expected)
  })

  it('accepts Arabic-Indic digits', () => {
    expect(normalisePhone('٠٧٧٠١٢٣٤٥٦٧')).toBe('07701234567')
  })

  it('accepts extended Arabic-Indic (Persian) digits', () => {
    expect(normalisePhone('۰۷۷۰۱۲۳۴۵۶۷')).toBe('07701234567')
  })

  it('accepts every Iraqi mobile prefix', () => {
    for (const prefix of ['70', '71', '72', '73', '74', '75', '76', '77', '78', '79']) {
      expect(normalisePhone(`0${prefix}12345678`), `prefix 0${prefix}`).toBe(`0${prefix}12345678`)
    }
  })

  it.each([
    ['', 'empty'],
    ['0123456789', 'not a mobile prefix'],
    ['0771234', 'too short'],
    ['077012345678', 'too long'],
    ['06901234567', 'landline prefix'],
    ['abcdefghijk', 'letters'],
    ['+15551234567', 'not an Iraqi number'],
  ])('rejects %s (%s)', (input) => {
    expect(normalisePhone(input)).toBeNull()
  })
})

describe('formatPhoneForDisplay', () => {
  it('groups the canonical form for reading aloud', () => {
    expect(formatPhoneForDisplay('07701234567')).toBe('0770 123 4567')
  })
})
