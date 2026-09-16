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
  universityId: string
  stageId: string
  /**
   * The days this student is in clinic. Required for a new profile: without it
   * the queue cannot tell a case they could schedule from one they could not.
   */
  clinicDays: string[]
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFields | 'document', string>>

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
  if (document && document.size > MAX_DOCUMENT_BYTES) errors.document = e.documentTooBig
  else if (document && !(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(document.type)) {
    errors.document = e.documentWrongType
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  return {
    ok: true,
    value: {
      universityId: fields.universityId,
      stageId: fields.stageId,
      clinicDays: fields.clinicDays,
    },
  }
}
