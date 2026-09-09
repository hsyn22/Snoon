import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { caseStatus, landing, site } from '../src/lib/copy'
import { CASE_REASON, CASE_REASON_AR, describeReason } from '../src/lib/cases/reasons'

/**
 * The brand name is spelled سنون with no diacritics. سَنّون is a different word,
 * so a stray shadda is a real error rather than a typo.
 */
const ARABIC_DIACRITICS = /[ً-ْٰ]/

describe('brand name', () => {
  it('is سنون without diacritics', () => {
    expect(site.name).toBe('سنون')
    expect(ARABIC_DIACRITICS.test(site.name)).toBe(false)
  })

  it('is never written with diacritics anywhere in the copy file', () => {
    const copySource = readFileSync(join(import.meta.dirname, '..', 'src', 'lib', 'copy.ts'), 'utf8')
    const diacritised = copySource.match(/سَ?نّ?ون/g)?.filter((match) => match !== 'سنون') ?? []
    expect(diacritised).toEqual([])
  })
})

describe('landing entry points', () => {
  it('offers all three: patient, student, supplies', () => {
    expect(Object.keys(landing)).toEqual(['patient', 'student', 'supplies'])
  })
})

describe('case status labels', () => {
  it('covers every state in the lifecycle', () => {
    expect(Object.keys(caseStatus).sort()).toEqual(
      [
        'APPOINTMENT_CONFIRMED',
        'CANCELLED',
        'COMPLETED',
        'CONTACTED',
        'EXPIRED',
        'MATCHED',
        'NO_CONTACT',
        'NO_SHOW',
        'REQUESTED',
        'RETURNED_TO_QUEUE',
      ].sort(),
    )
  })
})

describe('case event reasons', () => {
  it('has an Arabic reading for every reason the system writes', () => {
    for (const reason of Object.values(CASE_REASON)) {
      expect(CASE_REASON_AR[reason], reason).toBeTruthy()
      // Latin letters here would mean a reason went untranslated, which is what
      // the admin's audit trail looked like before this existed.
      expect(CASE_REASON_AR[reason]).not.toMatch(/[A-Za-z]/)
    }
  })

  it('translates a reason and keeps the note the student typed', () => {
    const stored = `${CASE_REASON.COMPLETED} حشوتين بالفك العلوي`
    expect(describeReason(stored)).toEqual({
      text: CASE_REASON_AR[CASE_REASON.COMPLETED],
      note: 'حشوتين بالفك العلوي',
    })
  })

  it('shows text it does not recognise rather than dropping it', () => {
    // Rows written before a reason was renamed still have to read as something.
    expect(describeReason('Something older.')).toEqual({ text: 'Something older.', note: null })
  })
})
