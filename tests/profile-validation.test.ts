import { describe, expect, it } from 'vitest'
import { studentProfile } from '@/lib/copy'
import {
  MAX_DOCUMENT_BYTES,
  validateProfile,
  type ProfileFields,
  type ProfilePlaces,
} from '@/lib/students/validation'

const PLACES: ProfilePlaces = {
  universities: [
    { id: 'uni-a', nameAr: 'جامعة أ', cityId: 'basra' },
    { id: 'uni-b', nameAr: 'جامعة ب', cityId: 'najaf' },
  ],
  stages: [
    { id: 'stage-4', nameAr: 'المرحلة الرابعة', order: 4 },
    { id: 'stage-5', nameAr: 'المرحلة الخامسة', order: 5 },
  ],
}

const GOOD_DOC = { size: 1024, type: 'image/jpeg' }

function fields(overrides: Partial<ProfileFields> = {}): ProfileFields {
  return {
    universityId: 'uni-a',
    stageId: 'stage-4',
    clinicDays: ['sun', 'tue'],
    ...overrides,
  }
}

describe('validateProfile', () => {
  it('accepts a university and a stage', () => {
    const result = validateProfile(fields(), PLACES, GOOD_DOC)
    expect(result.ok).toBe(true)
  })

  /*
   * The college is gone, and with it the pairing rule that used to be tested
   * here. Every Iraqi university has one dental college, so the college carried
   * nothing the university did not; the clinics inside it are departments every
   * student rotates through rather than somewhere to belong. What it decided —
   * the city a student's queue is scoped to — now comes from the university.
   */

  it.each([
    ['universityId', { universityId: '' }, studentProfile.errors.universityRequired],
    ['universityId', { universityId: 'nowhere' }, studentProfile.errors.universityUnknown],
    ['stageId', { stageId: '' }, studentProfile.errors.stageRequired],
    ['stageId', { stageId: 'stage-9' }, studentProfile.errors.stageUnknown],
  ])('rejects a bad %s', (field, override, message) => {
    const result = validateProfile(fields(override as Partial<ProfileFields>), PLACES, GOOD_DOC)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[field as 'universityId']).toBe(message)
  })

  describe('the document', () => {
    it('is optional here, because it may arrive through the bot instead', () => {
      // Photographing a card and sending it in Telegram is far less work on a
      // cheap phone. What is not optional is an admin seeing one before the
      // student is verified — that is enforced by the review, not this form.
      const result = validateProfile(fields(), PLACES, null)
      expect(result.ok).toBe(true)
    })

    it('accepts an empty file the same way as none at all', () => {
      const result = validateProfile(fields(), PLACES, { size: 0, type: 'image/jpeg' })
      expect(result.ok).toBe(true)
    })

    it('rejects one over the size cap', () => {
      const result = validateProfile(fields(), PLACES, {
        size: MAX_DOCUMENT_BYTES + 1,
        type: 'image/jpeg',
      })
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.document).toBe(studentProfile.errors.documentTooBig)
    })

    it('accepts one exactly at the cap', () => {
      const result = validateProfile(fields(), PLACES, {
        size: MAX_DOCUMENT_BYTES,
        type: 'image/jpeg',
      })
      expect(result.ok).toBe(true)
    })

    it.each(['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])('accepts %s', (type) => {
      expect(validateProfile(fields(), PLACES, { size: 2048, type }).ok).toBe(true)
    })

    it.each(['text/html', 'application/zip', 'image/svg+xml', 'application/x-msdownload'])(
      'rejects %s',
      (type) => {
        const result = validateProfile(fields(), PLACES, { size: 2048, type })
        expect(result.ok).toBe(false)
        if (!result.ok) expect(result.errors.document).toBe(studentProfile.errors.documentWrongType)
      },
    )
  })

  describe('clinic days', () => {
    it('requires at least one', () => {
      // Without them the queue cannot tell a case this student could schedule
      // from one they could never attend.
      const result = validateProfile(fields({ clinicDays: [] }), PLACES, GOOD_DOC)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.clinicDays).toBe(studentProfile.errors.clinicDaysRequired)
    })

    it('rejects a day that is not a clinic day', () => {
      // Friday is never offered — it is always a holiday — so it cannot arrive
      // from the form either.
      const result = validateProfile(fields({ clinicDays: ['sun', 'fri'] }), PLACES, GOOD_DOC)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.clinicDays).toBe(studentProfile.errors.clinicDaysInvalid)
    })

    it('carries them through when valid', () => {
      const result = validateProfile(fields({ clinicDays: ['sat', 'mon'] }), PLACES, GOOD_DOC)
      expect(result.ok).toBe(true)
      if (result.ok) expect(result.value.clinicDays).toEqual(['sat', 'mon'])
    })
  })

  it('reports every problem at once rather than one at a time', () => {
    const result = validateProfile(
      { universityId: '', stageId: '', clinicDays: [] },
      PLACES,
      { size: 99, type: 'text/html' },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual([
      'clinicDays',
      'document',
      'stageId',
      'universityId',
    ])
  })
})
