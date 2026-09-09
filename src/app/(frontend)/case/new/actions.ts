'use server'

import { redirect } from 'next/navigation'
import { submitCase } from '@/db/queries/cases'
import { caseForm } from '@/lib/copy'
import {
  readCaseForm,
  validateCaseForm,
  type CaseFormFields,
  type FieldErrors,
} from '@/lib/cases/validation'

export type CaseFormState = {
  errors?: FieldErrors
  formError?: string
  /**
   * What the patient typed, handed back so a rejected submission does not empty
   * the form. React 19 resets a form after an action, so the only values that
   * survive are the ones re-rendered as each input's default.
   */
  values?: CaseFormFields
}

export async function submitCaseAction(
  _previous: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const fields = readCaseForm(formData)
  const validated = await validateCaseForm(fields)

  if (!validated.ok) return { errors: validated.errors, values: fields }

  let trackingToken: string
  try {
    const result = await submitCase(validated.value)
    trackingToken = result.trackingToken
  } catch (error) {
    // Log that a submission failed, never what was in it — the form data holds
    // the patient's name and phone number.
    console.error('Case submission failed:', error instanceof Error ? error.message : 'unknown error')
    return { formError: caseForm.errors.submitFailed, values: fields }
  }

  // redirect() signals by throwing, so it must sit outside the try/catch above —
  // otherwise the catch would swallow it and report a submission failure for a
  // case that was actually saved.
  redirect(`/case/track/${trackingToken}?new=1`)
}
