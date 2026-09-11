'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentProfile } from '@/lib/copy'
import { uploadDocumentAction, type DocumentState } from './actions'
import { buttonClass } from '@/components/ui/button'
import { FormSection, hintClass, labelClass } from '@/components/ui/field'

const INITIAL: DocumentState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass('primary', 'mt-4 w-full')}
    >
      {pending ? studentProfile.submitting : studentProfile.submit}
    </button>
  )
}

export function DocumentForm() {
  const [state, formAction] = useActionState(uploadDocumentAction, INITIAL)

  return (
    <form action={formAction} noValidate>
      <FormSection title={studentProfile.documentSection}>
        <div>
          <label htmlFor="document" className={labelClass}>
            {studentProfile.documentLabel}
          </label>
          <p className={hintClass}>{studentProfile.documentHint}</p>
          <input
            id="document"
            name="document"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="mt-2 w-full text-sm"
            aria-invalid={Boolean(state.error)}
          />
          <p className="mt-2 rounded-md bg-accent-muted p-3 text-xs text-foreground">
            {studentProfile.documentPrivacy}
          </p>

          {state.error ? (
            <p role="alert" className="mt-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
        </div>
      </FormSection>

      <SubmitButton />
    </form>
  )
}
