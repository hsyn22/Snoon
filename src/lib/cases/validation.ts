import { isKnownCityId, isKnownTreatmentTypeId, isWeekDay, type WeekDay } from '@/lib/config'
import { caseForm } from '@/lib/copy'
import { normalisePhone } from '@/lib/phone'
import type { SubmitCaseInput } from '@/db/queries/cases'

/**
 * Server-side validation of the patient case form.
 *
 * This runs on the server and is the only validation that counts — the browser's
 * `required` attributes are a convenience for the patient, not a control. Errors
 * come back keyed by field so the form can render each one next to its input.
 *
 * Nothing here echoes the phone number back into an error message.
 */

export type CaseFormFields = {
  cityId: string
  treatmentTypeIds: string[]
  availabilityDays: string[]
  patientName: string
  patientPhone: string
  notes: string
}

export type FieldErrors = Partial<Record<keyof CaseFormFields, string>>

export type ValidationResult =
  | { ok: true; value: SubmitCaseInput }
  | { ok: false; errors: FieldErrors }

const NAME_MIN = 2
const NAME_MAX = 80
const NOTES_MAX = 1000

export function readCaseForm(formData: FormData): CaseFormFields {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }

  const strings = (key: string) =>
    formData.getAll(key).filter((value): value is string => typeof value === 'string')

  return {
    cityId: text('cityId'),
    treatmentTypeIds: strings('treatmentTypeIds'),
    availabilityDays: strings('availabilityDays'),
    patientName: text('patientName'),
    patientPhone: text('patientPhone'),
    notes: text('notes'),
  }
}

export async function validateCaseForm(fields: CaseFormFields): Promise<ValidationResult> {
  const errors: FieldErrors = {}
  const e = caseForm.errors

  if (!fields.cityId) errors.cityId = e.cityRequired
  else if (!(await isKnownCityId(fields.cityId))) errors.cityId = e.cityUnknown

  let treatmentTypeIds: string[] = []
  if (fields.treatmentTypeIds.length === 0) errors.treatmentTypeIds = e.treatmentRequired
  else {
    treatmentTypeIds = [...new Set(fields.treatmentTypeIds)]
    const known = await Promise.all(treatmentTypeIds.map(isKnownTreatmentTypeId))
    if (known.some((isKnown) => !isKnown)) errors.treatmentTypeIds = e.treatmentUnknown
  }

  let availabilityDays: WeekDay[] = []
  if (fields.availabilityDays.length === 0) errors.availabilityDays = e.daysRequired
  else if (!fields.availabilityDays.every(isWeekDay)) errors.availabilityDays = e.daysInvalid
  else availabilityDays = [...new Set(fields.availabilityDays.filter(isWeekDay))]

  if (!fields.patientName) errors.patientName = e.nameRequired
  else if (fields.patientName.length < NAME_MIN) errors.patientName = e.nameTooShort
  else if (fields.patientName.length > NAME_MAX) errors.patientName = e.nameTooLong

  // normalisePhone accepts +964, 00964, spaces, dashes and Arabic-Indic digits,
  // so a rejection here means the number genuinely is not an Iraqi mobile.
  const phone = fields.patientPhone ? normalisePhone(fields.patientPhone) : null
  if (!fields.patientPhone) errors.patientPhone = e.phoneRequired
  else if (!phone) errors.patientPhone = e.phoneInvalid

  if (fields.notes.length > NOTES_MAX) errors.notes = e.notesTooLong

  if (Object.keys(errors).length > 0) return { ok: false, errors }

  // The branch above proved this is present; the guard satisfies the compiler.
  if (!phone) return { ok: false, errors: { patientPhone: e.phoneInvalid } }

  return {
    ok: true,
    value: {
      cityId: fields.cityId,
      treatmentTypeIds,
      availabilityDays,
      patientName: fields.patientName,
      patientPhone: phone,
      notes: fields.notes || null,
    },
  }
}
