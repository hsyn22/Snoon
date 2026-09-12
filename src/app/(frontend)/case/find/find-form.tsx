'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { controlClass, FormSection, hintClass, labelClass } from '@/components/ui/field'
import { caseRecovery } from '@/lib/copy'
import { findCaseAction, type RecoveryFormState } from './actions'

const INITIAL: RecoveryFormState = {}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('primary', 'mt-5 w-full')}>
      {pending ? caseRecovery.submitting : caseRecovery.submit}
    </button>
  )
}

export function FindCaseForm() {
  const [state, formAction] = useActionState(findCaseAction, INITIAL)

  return (
    <form action={formAction} noValidate>
      <FormSection title={caseRecovery.section}>
        <div>
          <label htmlFor="referenceCode" className={labelClass}>
            {caseRecovery.codeLabel}
          </label>
          <p className={hintClass}>{caseRecovery.codeHint}</p>
          <input
            id="referenceCode"
            name="referenceCode"
            type="text"
            dir="ltr"
            autoComplete="off"
            // Reference codes are shown in upper case everywhere, and a phone
            // keyboard will happily send "sn-4kp7qw". Uppercased on the server
            // too; this is only so what they typed looks like what they were given.
            style={{ textTransform: 'uppercase' }}
            defaultValue={state.values?.referenceCode ?? ''}
            className={`${controlClass} reference-code text-start`}
            aria-invalid={Boolean(state.error)}
          />
        </div>

        <div>
          <label htmlFor="patientPhone" className={labelClass}>
            {caseRecovery.phoneLabel}
          </label>
          <p className={hintClass}>{caseRecovery.phoneHint}</p>
          <input
            id="patientPhone"
            name="patientPhone"
            type="tel"
            inputMode="tel"
            dir="ltr"
            autoComplete="tel"
            // Deliberately no defaultValue: a refused attempt does not echo a
            // phone number back into the HTML of a page that may be on a shared
            // phone. The code comes back; the number is retyped.
            className={`${controlClass} text-start`}
            aria-invalid={Boolean(state.error)}
          />
        </div>
      </FormSection>

      <p className="mt-3 text-xs text-foreground-muted">{caseRecovery.reissueNote}</p>

      {state.error ? (
        <p role="alert" className="mt-3 rounded-md bg-surface-muted p-3 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <Submit />
    </form>
  )
}
