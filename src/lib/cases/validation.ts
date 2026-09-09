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
  treatmentTypeId: string
  availabilityDays: string[]
  availabilityPeriod: string
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

const PERIODS = ['MORNING', 'AFTERNOON', 'EITHER'] as const

export function readCaseForm(formData: FormData): CaseFormFields {
  const text = (key: string) => {
    const value = formData.get(key)
    return typeof value === 'string' ? value.trim() : ''
  }

  return {
    cityId: text('cityId'),
    treatmentTypeId: text('treatmentTypeId'),
    availabilityDays: formData.getAll('availabilityDays').filter((v): v is string => typeof v === 'string'),
    availabilityPeriod: text('availabilityPeriod'),
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

  if (!fields.treatmentTypeId) errors.treatmentTypeId = e.treatmentRequired
  else if (!(await isKnownTreatmentTypeId(fields.treatmentTypeId)))
    errors.treatmentTypeId = e.treatmentUnknown

  let availabilityDays: WeekDay[] = []
  if (fields.availabilityDays.length === 0) errors.availabilityDays = e.daysRequired
  else if (!fields.availabilityDays.every(isWeekDay)) errors.availabilityDays = e.daysInvalid
  else availabilityDays = [...new Set(fields.availabilityDays.filter(isWeekDay))]

  const period = PERIODS.find((p) => p === fields.availabilityPeriod)
  if (!period) errors.availabilityPeriod = e.periodRequired

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

  // Every branch above proved these are present; the guards satisfy the compiler.
  if (!period || !phone) return { ok: false, errors: { patientPhone: e.phoneInvalid } }

  return {
    ok: true,
    value: {
      cityId: fields.cityId,
      treatmentTypeId: fields.treatmentTypeId,
      availabilityDays,
      availabilityPeriod: period,
      patientName: fields.patientName,
      patientPhone: phone,
      notes: fields.notes || null,
    },
  }
}
