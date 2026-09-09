'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentProfile } from '@/lib/copy'
import { uploadDocumentAction, type DocumentState } from './actions'

const INITIAL: DocumentState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 min-h-11 w-full rounded-md bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60"
    >
      {pending ? studentProfile.submitting : studentProfile.submit}
    </button>
  )
}

export function DocumentForm() {
  const [state, formAction] = useActionState(uploadDocumentAction, INITIAL)

  return (
    <form action={formAction} noValidate>
      <label htmlFor="document" className="block text-sm font-medium">
        {studentProfile.documentLabel}
      </label>
      <p className="mt-1 text-xs text-foreground-muted">{studentProfile.documentHint}</p>
      <input
        id="document"
        name="document"
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="mt-2 w-full text-sm"
        aria-invalid={Boolean(state.error)}
      />
      <p className="mt-2 text-xs text-foreground-muted">{studentProfile.documentPrivacy}</p>

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
