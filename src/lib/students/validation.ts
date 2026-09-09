import type { College, Stage, University } from '@/lib/config/schema'
import { studentProfile } from '@/lib/copy'

/**
 * Server-side validation of the student profile step.
 *
 * Pure: it takes the configuration rather than reading it, so the rules can be
 * tested without a database. The rule worth being careful about is the
 * university/college pairing — the browser can post any combination, and a
 * mismatched pair would place a student at a clinic they do not attend. The case
 * queue is filtered by exactly that, so it decides which patients they see.
 */

export type ProfileFields = {
  universityId: string
  collegeId: string
  stageId: string
}

export type ProfileFieldErrors = Partial<Record<keyof ProfileFields | 'document', string>>

export type ProfileValidationResult =
  | { ok: true; value: ProfileFields }
  | { ok: false; errors: ProfileFieldErrors }

export type ProfilePlaces = {
  universities: readonly University[]
  colleges: readonly College[]
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

  const college = places.colleges.find((c) => c.id === fields.collegeId)
  if (!fields.collegeId) errors.collegeId = e.collegeRequired
  else if (!college) errors.collegeId = e.collegeUnknown
  else if (fields.universityId && college.universityId !== fields.universityId) {
    errors.collegeId = e.collegeMismatch
  }

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
      collegeId: fields.collegeId,
      stageId: fields.stageId,
    },
  }
}
