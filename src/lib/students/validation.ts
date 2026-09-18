import { isWeekDay, type Stage, type University } from '@/lib/config/schema'
import { studentProfile } from '@/lib/copy'

/**
 * Server-side validation of the student profile step.
 *
 * Pure: it takes the configuration rather than reading it, so the rules can be
 * tested without a database.
 *
 * **The college is gone**, and with it the pairing rule this comment used to be
 * about. Every Iraqi university has exactly one dental college, so the college
 * carried nothing the university did not, and the clinics inside it are
 * departments every student rotates through rather than something to belong to.
 * What remains still decides which patients a student sees — the university
 * gives the city and the stage gives the treatments — so an unknown value here
 * is refused rather than ignored.
 */

export type ProfileFields = {
  /**
   * The student's name as it is written on their enrolment document.
   *
   * **It used to be taken from the Google account and never asked for.** A
   * display name is whatever somebody typed into Google years ago — one word, a
   * nickname, or Latin script — and an admin at `/admin/students` was being
   * asked to decide whether a document naming أحمد علي حسين belongs to an
   * account called "Ahmed". That is not a judgement anybody can make, so the
   * check it stands for was decorative: the one step keeping unverified people
   * away from patients' phone numbers rested on comparing a name against
   * nothing in particular.
   */
  fullName: string
  universityId: string
  stageId: string
  /**
   * The days this student is in clinic. Required for a new profile: without it
   * the queue cannot tell a case they could schedule from one they could not.
   */
  clinicDays: string[]
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFields | 'document', string>>

/** Long enough for four or five parts; short enough that nothing else fits. */
export const MAX_NAME_LENGTH = 120

/**
 * The three-part name, checked as loosely as it can be while still doing its job.
 *
 * **At least three parts, not exactly three.** Plenty of Iraqi names run to four,
 * and عبد الله is one name written as two words — a rule demanding exactly three
 * would refuse real names, and a student refused by a form does not write in to
 * explain, they leave. Three is the floor because that is what distinguishes a
 * name from a Google display name, which is the whole reason the field exists.
 *
 * Nothing here checks the script. Requiring Arabic would be the same mistake as
 * putting a `pattern` on the phone input: the person who can actually tell
 * whether this matches the document is the admin reading both, and a form that
 * guesses at it can only be wrong in the direction that blocks somebody.
 */
export function normaliseFullName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim()
}

export function isTriplePartName(name: string): boolean {
  const parts = normaliseFullName(name).split(' ')
  return parts.length >= 3 && parts.every((part) => part.length >= 2)
}

export type ProfileValidationResult =
  | { ok: true; value: ProfileFields }
  | { ok: false; errors: ProfileFieldErrors }

export type ProfilePlaces = {
  universities: readonly University[]
  stages: readonly Stage[]
}

/** Describes the uploaded file without depending on the File type. */
export type UploadedDocument = { size: number; type: string } | null

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
export const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export function validateProfile(
  fields: ProfileFields,
  places: ProfilePlaces,
  document: UploadedDocument,
): ProfileValidationResult {
  const errors: ProfileFieldErrors = {}
  const e = studentProfile.errors

  const fullName = normaliseFullName(fields.fullName)
  if (!fullName) errors.fullName = e.nameRequired
  else if (fullName.length > MAX_NAME_LENGTH) errors.fullName = e.nameTooLong
  else if (!isTriplePartName(fullName)) errors.fullName = e.nameNotTriple

  if (!fields.universityId) errors.universityId = e.universityRequired
  else if (!places.universities.some((u) => u.id === fields.universityId)) {
    errors.universityId = e.universityUnknown
  }

  if (fields.clinicDays.length === 0) errors.clinicDays = e.clinicDaysRequired
  else if (!fields.clinicDays.every(isWeekDay)) errors.clinicDays = e.clinicDaysInvalid

  if (!fields.stageId) errors.stageId = e.stageRequired
  else if (!places.stages.some((s) => s.id === fields.stageId)) errors.stageId = e.stageUnknown

  // Optional: a student may send it to the bot instead, which is easier on a
  // cheap phone. If they attach nothing here, the student page asks for it. What
  // is NOT optional is that an admin sees one before the student is verified.
  //
  // **A zero-byte file is nothing attached, not a file of the wrong type.** An
  // empty `<input type="file">` posts a File with size 0 and an empty type, and
  // reading that as a rejected upload is how "optional" became "required, and
  // refused with a message about a file you never chose". The caller filters it
  // too; this is the layer that must not depend on the caller remembering.
  const attached = document && document.size > 0 ? document : null
  if (attached && attached.size > MAX_DOCUMENT_BYTES) errors.document = e.documentTooBig
  else if (attached && !(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(attached.type)) {
    errors.document = e.documentWrongType
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      fullName,
      universityId: fields.universityId,
      stageId: fields.stageId,
      clinicDays: fields.clinicDays,
    },
  }
}

/**
 * The verification step on its own — the name and the university, without the
 * study details a profile already carries.
 *
 * `/student/profile/document` is reached by a student who has a profile and is
 * waiting on, or has been refused, a decision. What an admin needs from them
 * there is the two things they will compare against the document in front of
 * them, so those two are asked again rather than assumed: a name Google
 * supplied and a university chosen before the document existed are exactly the
 * values most likely to be wrong.
 *
 * The stage is deliberately **not** here. It decides which treatments a student
 * may perform, and the page it belongs on is the profile, where changing it
 * re-opens verification. Letting it be edited beside the document would make
 * the upload step the quiet way to change what somebody is allowed to treat.
 */
export type VerificationFields = { fullName: string; universityId: string }

export type VerificationValidationResult =
  | { ok: true; value: VerificationFields }
  | { ok: false; errors: ProfileFieldErrors }

export function validateVerificationDetails(
  fields: VerificationFields,
  universities: readonly University[],
): VerificationValidationResult {
  const errors: ProfileFieldErrors = {}
  const e = studentProfile.errors

  const fullName = normaliseFullName(fields.fullName)
  if (!fullName) errors.fullName = e.nameRequired
  else if (fullName.length > MAX_NAME_LENGTH) errors.fullName = e.nameTooLong
  else if (!isTriplePartName(fullName)) errors.fullName = e.nameNotTriple

  if (!fields.universityId) errors.universityId = e.universityRequired
  else if (!universities.some((u) => u.id === fields.universityId)) {
    errors.universityId = e.universityUnknown
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, value: { fullName, universityId: fields.universityId } }
}

/**
 * What an edit to an existing profile does to the student's standing.
 *
 * A profile used to be write-once: `/student/profile` redirected away the moment
 * a student had one, so a fourth year who became a fifth year, or anybody who
 * mistyped their name, had no way to correct it and no page that showed them
 * what سنون held about them. Making it editable is the obvious fix and it is the
 * dangerous one, because three of those fields are exactly what an admin
 * verified: the queue a student sees is their university's city, what they may
 * perform is their stage, and the document was matched against their name.
 *
 * **So editing any of the three re-opens verification.** A verified fourth year
 * who edits their stage to the fifth does not become a fifth year; they become a
 * student waiting on an admin again, and see nothing in the meantime. The
 * alternative — trusting the edit — would make this page the way to grant
 * yourself root canals on a queue nobody checked you against.
 *
 * **Clinic days never re-open it.** Nobody verifies which days somebody is in
 * clinic, it changes with a timetable, and charging re-verification for it would
 * teach students to leave it wrong — which silently costs them cases.
 *
 * **SUSPENDED is absorbing.** A suspension is a decision about a person, and an
 * edit is not an appeal: without this line, a suspended student could change one
 * letter of their name and be back in the review queue, and then in the queue.
 */
export type StudentStanding = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'

/** The fields an admin actually verifies. Clinic days are deliberately absent. */
export type VerifiedFields = { fullName: string; universityId: string; stageId: string }

export function verifiedFieldsChanged(before: VerifiedFields, after: VerifiedFields): boolean {
  return (
    normaliseFullName(before.fullName) !== normaliseFullName(after.fullName) ||
    before.universityId !== after.universityId ||
    before.stageId !== after.stageId
  )
}

export function standingAfterProfileEdit(
  current: StudentStanding,
  changed: boolean,
): { status: StudentStanding; clearReviewer: boolean } {
  if (current === 'SUSPENDED') return { status: 'SUSPENDED', clearReviewer: false }
  if (!changed) return { status: current, clearReviewer: false }
  // Back to the queue, and the previous decision is cleared: it no longer
  // describes what an admin is being asked to look at.
  return { status: 'PENDING', clearReviewer: current !== 'PENDING' }
}
