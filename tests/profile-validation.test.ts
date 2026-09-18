import { describe, expect, it } from 'vitest'
import { studentProfile } from '@/lib/copy'
import {
  MAX_DOCUMENT_BYTES,
  MAX_NAME_LENGTH,
  isTriplePartName,
  normaliseFullName,
  standingAfterProfileEdit,
  validateProfile,
  verifiedFieldsChanged,
  validateVerificationDetails,
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
    fullName: 'أحمد علي حسين',
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
      { fullName: '', universityId: '', stageId: '', clinicDays: [] },
      PLACES,
      { size: 99, type: 'text/html' },
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual([
      'clinicDays',
      'document',
      'fullName',
      'stageId',
      'universityId',
    ])
  })
})

/**
 * The name, and why it is a rule rather than a label.
 *
 * `fullName` used to be lifted off the Google account and never asked for, so
 * the row an admin reads at `/admin/students` said whatever somebody typed into
 * Google years ago — one word, a nickname, or Latin script. The admin was then
 * asked whether a document naming أحمد علي حسين belongs to an account called
 * "Ahmed", which is not a judgement anybody can make. Manual review is the one
 * step keeping unverified people away from patients' phone numbers, so a check
 * nobody can actually perform is the same as no check.
 *
 * These fail on the old code: `validateProfile` had no name field at all.
 */
describe('the three-part name', () => {
  it('accepts three parts', () => {
    expect(isTriplePartName('أحمد علي حسين')).toBe(true)
  })

  /* Plenty of Iraqi names run to four, and عبد الله is one name written as two
     words. A rule demanding exactly three would refuse real names, and somebody
     refused by a form does not write in to explain — they leave. */
  it('accepts more than three parts', () => {
    expect(isTriplePartName('عبد الله أحمد علي حسين')).toBe(true)
  })

  it('refuses the shapes a Google display name arrives in', () => {
    expect(isTriplePartName('أحمد')).toBe(false)
    expect(isTriplePartName('أحمد علي')).toBe(false)
    expect(isTriplePartName('Ahmed Ali')).toBe(false)
    expect(isTriplePartName('')).toBe(false)
  })

  /* An initial is not a name part. Without this, "أ ب ج" passes and the admin is
     back to comparing a document against nothing. */
  it('refuses single-letter parts', () => {
    expect(isTriplePartName('أ ب ج')).toBe(false)
    expect(isTriplePartName('أحمد ع حسين')).toBe(false)
  })

  it('does not count stray whitespace as a part', () => {
    expect(normaliseFullName('  أحمد   علي  حسين ')).toBe('أحمد علي حسين')
    expect(isTriplePartName('أحمد  علي')).toBe(false)
  })

  it('is required by the profile form, with a message that says what is missing', () => {
    const short = validateProfile(fields({ fullName: 'أحمد' }), PLACES, GOOD_DOC)
    expect(short.ok).toBe(false)
    if (!short.ok) expect(short.errors.fullName).toBe(studentProfile.errors.nameNotTriple)

    const empty = validateProfile(fields({ fullName: '' }), PLACES, GOOD_DOC)
    expect(empty.ok).toBe(false)
    if (!empty.ok) expect(empty.errors.fullName).toBe(studentProfile.errors.nameRequired)
  })

  it('is stored collapsed, not as it was typed', () => {
    const result = validateProfile(fields({ fullName: ' أحمد   علي حسين ' }), PLACES, GOOD_DOC)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.fullName).toBe('أحمد علي حسين')
  })

  it('refuses a name longer than the column is meant to hold', () => {
    const long = `${'أ'.repeat(MAX_NAME_LENGTH)} علي حسين`
    const result = validateProfile(fields({ fullName: long }), PLACES, GOOD_DOC)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.fullName).toBe(studentProfile.errors.nameTooLong)
  })
})

/**
 * The verification step asks for the two things an admin compares the document
 * against, and nothing else.
 */
describe('validateVerificationDetails', () => {
  it('accepts a real name and a known university', () => {
    const result = validateVerificationDetails(
      { fullName: 'أحمد علي حسين', universityId: 'uni-a' },
      PLACES.universities,
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ fullName: 'أحمد علي حسين', universityId: 'uni-a' })
  })

  /* The university decides which city's cases a student is shown, so an
     unknown value is refused rather than ignored — the same rule the profile
     step applies, and for the same reason. */
  it('refuses a university that is not offered', () => {
    const result = validateVerificationDetails(
      { fullName: 'أحمد علي حسين', universityId: 'nowhere' },
      PLACES.universities,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.universityId).toBe(studentProfile.errors.universityUnknown)
  })

  it('refuses a name that could not be matched against a document', () => {
    const result = validateVerificationDetails(
      { fullName: 'Ahmed', universityId: 'uni-a' },
      PLACES.universities,
    )
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors.fullName).toBe(studentProfile.errors.nameNotTriple)
  })

  /* The stage is not here on purpose: it decides which treatments a student may
     perform, and the upload screen must not become the quiet way to change that.
     If this ever starts passing, that boundary has moved. */
  it('carries no stage', () => {
    const result = validateVerificationDetails(
      { fullName: 'أحمد علي حسين', universityId: 'uni-a' },
      PLACES.universities,
    )
    expect(result.ok).toBe(true)
    if (result.ok) expect(Object.keys(result.value).sort()).toEqual(['fullName', 'universityId'])
  })
})

/**
 * The document is optional, and it has to actually be optional.
 *
 * An empty `<input type="file">` still posts a File — size 0, with an empty
 * type string — and the profile action handed that to the validator, which
 * refused the empty string as a disallowed type. A student who left the
 * document out, which this flow documents as allowed because sending it to the
 * Telegram bot is far less work on a cheap phone, was told "نوع الملف مو مقبول"
 * about a file they had never chosen. Nothing errored, the message named
 * something invisible to them, and it sat on the exact step سنون loses students
 * at.
 *
 * Fails on the old code: `{ size: 0, type: '' }` produced a `document` error.
 */
describe('an unattached document', () => {
  it('is not a file of the wrong type', () => {
    const result = validateProfile(fields(), PLACES, { size: 0, type: '' })
    expect(result.ok).toBe(true)
  })

  it('is treated the same as passing nothing at all', () => {
    expect(validateProfile(fields(), PLACES, null).ok).toBe(true)
  })

  /* And a real file is still checked, or the fix above would have turned the
     size and type rules off. */
  it('does not disable the checks on a file that was attached', () => {
    const big = validateProfile(fields(), PLACES, {
      size: MAX_DOCUMENT_BYTES + 1,
      type: 'image/jpeg',
    })
    expect(big.ok).toBe(false)
    if (!big.ok) expect(big.errors.document).toBe(studentProfile.errors.documentTooBig)

    const wrong = validateProfile(fields(), PLACES, { size: 1024, type: 'text/html' })
    expect(wrong.ok).toBe(false)
    if (!wrong.ok) expect(wrong.errors.document).toBe(studentProfile.errors.documentWrongType)
  })
})

/**
 * Editing a profile, and what it costs.
 *
 * The profile was write-once — `/student/profile` redirected away the moment one
 * existed — so a fourth year who became a fifth year could not say so and a
 * mistyped name was permanent. Making it editable is the obvious fix and it is
 * the dangerous one: three of those fields are exactly what an admin verified.
 * The queue a student sees is their university's city, what they may perform is
 * their stage, and the document was matched against their name.
 *
 * These are the rules that stop the edit screen from being a way to grant
 * yourself a queue nobody checked you against. They have no old code to fail on
 * — the behaviour did not exist — so they are here to pin it.
 */
describe('standingAfterProfileEdit', () => {
  it('sends a verified student back to the queue when a verified field changes', () => {
    expect(standingAfterProfileEdit('VERIFIED', true)).toEqual({
      status: 'PENDING',
      clearReviewer: true,
    })
  })

  /* A verified fourth year who edits their stage to the fifth does not become a
     fifth year. They become a student waiting on an admin, seeing nothing. */
  it('does not let an edit grant what an admin has not seen', () => {
    expect(standingAfterProfileEdit('VERIFIED', true).status).not.toBe('VERIFIED')
  })

  it('leaves a standing alone when nothing an admin verifies changed', () => {
    for (const standing of ['PENDING', 'VERIFIED', 'REJECTED'] as const) {
      expect(standingAfterProfileEdit(standing, false)).toEqual({
        status: standing,
        clearReviewer: false,
      })
    }
  })

  it('puts a rejected student back in the queue when they correct something', () => {
    expect(standingAfterProfileEdit('REJECTED', true)).toEqual({
      status: 'PENDING',
      clearReviewer: true,
    })
  })

  /* Already in the queue: the status does not move, and there is no decision to
     clear because nobody has made one. */
  it('does not clear a reviewer a pending student never had', () => {
    expect(standingAfterProfileEdit('PENDING', true)).toEqual({
      status: 'PENDING',
      clearReviewer: false,
    })
  })

  /*
   * The one that matters most. A suspension is a decision about a person, and an
   * edit is not an appeal — without this, a suspended student changes one letter
   * of their name, lands back in the review queue, and is one approval away from
   * patients' phone numbers again.
   */
  it('never lets a suspended student edit their way out of a suspension', () => {
    expect(standingAfterProfileEdit('SUSPENDED', true)).toEqual({
      status: 'SUSPENDED',
      clearReviewer: false,
    })
    expect(standingAfterProfileEdit('SUSPENDED', false).status).toBe('SUSPENDED')
  })
})

describe('verifiedFieldsChanged', () => {
  const before = { fullName: 'أحمد علي حسين', universityId: 'uni-a', stageId: 'stage-4' }

  it('sees a changed name, university or stage', () => {
    expect(verifiedFieldsChanged(before, { ...before, fullName: 'أحمد علي كاظم' })).toBe(true)
    expect(verifiedFieldsChanged(before, { ...before, universityId: 'uni-b' })).toBe(true)
    expect(verifiedFieldsChanged(before, { ...before, stageId: 'stage-5' })).toBe(true)
  })

  it('sees no change in the same values', () => {
    expect(verifiedFieldsChanged(before, { ...before })).toBe(false)
  })

  /* Retyping the same name with different spacing is not a change, or a student
     would lose their verification to a stray space. */
  it('does not count re-spacing a name as a change', () => {
    expect(verifiedFieldsChanged(before, { ...before, fullName: ' أحمد   علي حسين ' })).toBe(false)
  })

  /* Clinic days are absent on purpose: nobody verifies which days somebody is in
     clinic, it changes with a timetable, and charging re-verification for it
     would teach students to leave it wrong — which silently costs them cases.
     If this list ever grows a fourth field, that decision has moved. */
  it('is about the three fields an admin actually verifies', () => {
    expect(Object.keys(before).sort()).toEqual(['fullName', 'stageId', 'universityId'])
  })
})
