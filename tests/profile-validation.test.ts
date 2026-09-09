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
  colleges: [
    { id: 'college-a', nameAr: 'كلية أ', universityId: 'uni-a' },
    { id: 'college-b', nameAr: 'كلية ب', universityId: 'uni-b' },
  ],
  stages: [
    { id: 'stage-4', nameAr: 'المرحلة الرابعة', order: 4 },
    { id: 'stage-5', nameAr: 'المرحلة الخامسة', order: 5 },
  ],
}

const GOOD_DOC = { size: 1024, type: 'image/jpeg' }

function fields(overrides: Partial<ProfileFields> = {}): ProfileFields {
  return { universityId: 'uni-a', collegeId: 'college-a', stageId: 'stage-4', ...overrides }
}

describe('validateProfile', () => {
  it('accepts a matching university, college and stage', () => {
    const result = validateProfile(fields(), PLACES, GOOD_DOC)
    expect(result.ok).toBe(true)
  })

  describe('the college must belong to the chosen university', () => {
    it('rejects a college from a different university', () => {
      // The browser can post any pair. Accepting this would place the student at
      // a clinic they do not attend — and the case queue is filtered by exactly
      // that, so it would decide which patients they can see.
      const result = validateProfile(
        fields({ universityId: 'uni-a', collegeId: 'college-b' }),
        PLACES,
        GOOD_DOC,
      )
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.errors.collegeId).toBe(studentProfile.errors.collegeMismatch)
    })

    it('accepts each college with its own university', () => {
      for (const [universityId, collegeId] of [
        ['uni-a', 'college-a'],
        ['uni-b', 'college-b'],
      ] as const) {
        expect(validateProfile(fields({ universityId, collegeId }), PLACES, GOOD_DOC).ok).toBe(true)
      }
    })
  })

  it.each([
    ['universityId', { universityId: '' }, studentProfile.errors.universityRequired],
    ['universityId', { universityId: 'nowhere' }, studentProfile.errors.universityUnknown],
    ['collegeId', { collegeId: '' }, studentProfile.errors.collegeRequired],
    ['collegeId', { collegeId: 'nowhere' }, studentProfile.errors.collegeUnknown],
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

  it('reports every problem at once rather than one at a time', () => {
    const result = validateProfile(
      { universityId: '', collegeId: '', stageId: '' },
      PLACES,
      { size: 99, type: 'text/html' },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual([
      'collegeId',
      'document',
      'stageId',
      'universityId',
    ])
  })
})
