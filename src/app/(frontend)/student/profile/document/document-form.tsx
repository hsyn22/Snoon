'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { University } from '@/lib/config/schema'
import { studentProfile } from '@/lib/copy'
import { uploadDocumentAction, type DocumentState } from './actions'
import { buttonClass } from '@/components/ui/button'
import { controlClass, FormSection, hintClass, labelClass } from '@/components/ui/field'

const INITIAL: DocumentState = {}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {message}
    </p>
  )
}

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

/**
 * The verification step: who you are, where you study, and the paper that proves
 * it — in that order, because that is the order an admin reads them in.
 *
 * Every field hands back what was submitted as its `defaultValue`, and the
 * `<select>` carries a `key` tied to its value. React 19 resets a form after an
 * action runs, back to each input's default, so without this a student who
 * mistyped one thing would find the whole screen blank — on the step this
 * product already loses students at.
 */
export function DocumentForm({
  universities,
  currentName,
  currentUniversityId,
  hasDocument,
}: {
  universities: readonly University[]
  currentName: string
  currentUniversityId: string
  hasDocument: boolean
}) {
  const [state, formAction] = useActionState(uploadDocumentAction, INITIAL)
  const errors = state.errors ?? {}
  const nameValue = state.values?.fullName ?? currentName
  const universityValue = state.values?.universityId ?? currentUniversityId

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormSection title={studentProfile.verifySection}>
        <div>
          <label htmlFor="fullName" className={labelClass}>
            {studentProfile.nameLabel}
          </label>
          <p className={hintClass}>{studentProfile.nameHint}</p>
          <input
            id="fullName"
            name="fullName"
            type="text"
            autoComplete="name"
            placeholder={studentProfile.namePlaceholder}
            defaultValue={nameValue}
            className={controlClass}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
          <FieldError id="fullName-error" message={errors.fullName} />
        </div>

        <div>
          <label htmlFor="universityId" className={labelClass}>
            {studentProfile.universityLabel}
          </label>
          <select
            id="universityId"
            name="universityId"
            key={`university-${universityValue}`}
            defaultValue={universityValue}
            className={controlClass}
            aria-invalid={Boolean(errors.universityId)}
            aria-describedby={errors.universityId ? 'universityId-error' : undefined}
          >
            <option value="" disabled>
              {studentProfile.universityPlaceholder}
            </option>
            {universities.map((university) => (
              <option key={university.id} value={university.id}>
                {university.nameAr}
              </option>
            ))}
          </select>
          <FieldError id="universityId-error" message={errors.universityId} />
        </div>
      </FormSection>

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
            aria-invalid={Boolean(errors.document)}
            aria-describedby={errors.document ? 'document-error' : undefined}
          />
          {/* A student who sent their document to the bot already has one.
              Making them photograph it again just to correct their name is a
              step people abandon, and this is the step سنون loses students at. */}
          {hasDocument ? (
            <p className={`${hintClass} mt-2`}>{studentProfile.documentOnRecord}</p>
          ) : null}
          <p className="mt-2 rounded-md bg-accent-muted p-3 text-xs text-foreground">
            {studentProfile.documentPrivacy}
          </p>
          <FieldError id="document-error" message={errors.document} />
        </div>
      </FormSection>

      {state.formError ? (
        <p role="alert" className="rounded-md bg-surface-muted p-3 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
