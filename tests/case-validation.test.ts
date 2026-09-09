import { describe, expect, it } from 'vitest'
import { validateCaseForm, type CaseFormFields } from '@/lib/cases/validation'
import { caseForm } from '@/lib/copy'

/** A submission that should pass, which each test then breaks in one way. */
function validFields(overrides: Partial<CaseFormFields> = {}): CaseFormFields {
  return {
    cityId: 'basra',
    treatmentTypeId: 'root-canal',
    availabilityDays: ['sun', 'tue'],
    availabilityPeriod: 'MORNING',
    patientName: 'أم علي',
    patientPhone: '07701234567',
    notes: '',
    ...overrides,
  }
}

describe('validateCaseForm', () => {
  it('accepts a complete submission', async () => {
    const result = await validateCaseForm(validFields())
    expect(result.ok).toBe(true)
  })

  it('normalises the phone number to canonical form', async () => {
    const result = await validateCaseForm(validFields({ patientPhone: '+964 770 123 4567' }))
    expect(result.ok && result.value.patientPhone).toBe('07701234567')
  })

  it('removes duplicate days', async () => {
    const result = await validateCaseForm(
      validFields({ availabilityDays: ['sun', 'sun', 'tue'] }),
    )
    expect(result.ok && result.value.availabilityDays).toEqual(['sun', 'tue'])
  })

  it('turns empty notes into null rather than an empty string', async () => {
    const result = await validateCaseForm(validFields({ notes: '' }))
    expect(result.ok && result.value.notes).toBeNull()
  })

  it.each([
    ['cityId', { cityId: '' }, caseForm.errors.cityRequired],
    ['cityId', { cityId: 'atlantis' }, caseForm.errors.cityUnknown],
    ['treatmentTypeId', { treatmentTypeId: '' }, caseForm.errors.treatmentRequired],
    ['treatmentTypeId', { treatmentTypeId: 'implant' }, caseForm.errors.treatmentUnknown],
    ['availabilityDays', { availabilityDays: [] }, caseForm.errors.daysRequired],
    ['availabilityDays', { availabilityDays: ['someday'] }, caseForm.errors.daysInvalid],
    ['availabilityPeriod', { availabilityPeriod: '' }, caseForm.errors.periodRequired],
    ['availabilityPeriod', { availabilityPeriod: 'MIDNIGHT' }, caseForm.errors.periodRequired],
    ['patientName', { patientName: '' }, caseForm.errors.nameRequired],
    ['patientName', { patientName: 'أ' }, caseForm.errors.nameTooShort],
    ['patientName', { patientName: 'ا'.repeat(81) }, caseForm.errors.nameTooLong],
    ['patientPhone', { patientPhone: '' }, caseForm.errors.phoneRequired],
    ['patientPhone', { patientPhone: '06901234567' }, caseForm.errors.phoneInvalid],
    ['notes', { notes: 'ا'.repeat(1001) }, caseForm.errors.notesTooLong],
  ])('rejects a bad %s', async (field, override, message) => {
    const result = await validateCaseForm(validFields(override as Partial<CaseFormFields>))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errors[field as keyof typeof result.errors]).toBe(message)
  })

  it('never echoes the submitted phone number back in an error message', async () => {
    const phone = '0690000TRACEME'
    const result = await validateCaseForm(validFields({ patientPhone: phone }))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(JSON.stringify(result.errors)).not.toContain('TRACEME')
    }
  })

  it('rejects a city that is valid-looking but not offered', async () => {
    // Guards against trusting the select element: the browser can send anything.
    const result = await validateCaseForm(validFields({ cityId: 'BASRA' }))
    expect(result.ok).toBe(false)
  })
})
