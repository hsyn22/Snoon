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

  /*
   * The bug Haider found in عالجني, pinned here so سنون cannot grow it.
   *
   * Their form refuses a number typed in Arabic numerals and tells the patient
   * their Iraqi number is invalid; it only works once you retype it in Western
   * digits. It is invisible to whoever built it and it blocks exactly the
   * person this product exists for — somebody on an Arabic keyboard, on a cheap
   * phone, who now believes the site is broken or that their number is wrong.
   */
  it('accepts a whole number typed on an Arabic keyboard, in every legal shape', () => {
    // Haider's three shapes: 11 from 07, 10 from 7, and the international form.
    expect(normalisePhone('٠٧٨٠١٢٣٤٥٦٧')).toBe('07801234567')
    expect(normalisePhone('٧٨٠١٢٣٤٥٦٧')).toBe('07801234567')
    expect(normalisePhone('+٩٦٤٧٨٠١٢٣٤٥٦٧')).toBe('07801234567')
    // Grouped the way a phone's own formatter writes it.
    expect(normalisePhone('٠٧٨٠ ١٢٣ ٤٥٦٧')).toBe('07801234567')
    // And mixed, which happens when a keyboard switches mid-number.
    expect(normalisePhone('٠٧8٠١٢3٤٥٦٧')).toBe('07801234567')
  })

  it('refuses the lengths that are not Iraqi numbers', () => {
    // Ten digits are only valid without the leading zero. Ten *with* it is a
    // digit short, and must not be padded into something plausible.
    expect(normalisePhone('0780987654')).toBeNull()
    expect(normalisePhone('٠٧٨٠٩٨٧٦٥٤')).toBeNull()
    expect(normalisePhone('078012345678')).toBeNull()
    expect(normalisePhone('0123456789')).toBeNull()
  })
})
