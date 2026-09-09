import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { caseStatus, landing, site } from '../src/lib/copy'

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
