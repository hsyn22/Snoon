'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
import type { College, Stage, University } from '@/lib/config/schema'
import { studentProfile } from '@/lib/copy'
import { submitProfileAction, type ProfileFormState } from './actions'

const INITIAL: ProfileFormState = {}

const labelClass = 'block text-sm font-medium text-foreground'
const hintClass = 'mt-1 text-xs text-foreground-muted'
const controlClass =
  'mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground'

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
      className="min-h-11 w-full rounded-md bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60"
    >
      {pending ? studentProfile.submitting : studentProfile.submit}
    </button>
  )
}

export function ProfileForm({
  universities,
  colleges,
  stages,
}: {
  universities: readonly University[]
  colleges: readonly College[]
  stages: readonly Stage[]
}) {
  const [state, formAction] = useActionState(submitProfileAction, INITIAL)
  const errors = state.errors ?? {}
  // Clear a field's error as soon as it is edited.
  const { onInput, errorFor } = useDismissibleErrors(state)

  // The college list depends on the chosen university, so this one field is
  // stateful rather than uncontrolled — picking a university has to narrow it
  // immediately, before any round trip.
  const [universityId, setUniversityId] = useState(state.values?.universityId ?? '')
  const visibleColleges = colleges.filter((college) => college.universityId === universityId)

  return (
    <form action={formAction} onInput={onInput} className="space-y-6" noValidate>
      <div>
        <label htmlFor="universityId" className={labelClass}>
          {studentProfile.universityLabel}
        </label>
        <select
          id="universityId"
          name="universityId"
          value={universityId}
          onChange={(event) => setUniversityId(event.target.value)}
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
        <FieldError id="universityId-error" message={errorFor('universityId', errors.universityId)} />
      </div>

      <div>
        <label htmlFor="collegeId" className={labelClass}>
          {studentProfile.collegeLabel}
        </label>
        {universityId === '' ? <p className={hintClass}>{studentProfile.collegeHint}</p> : null}
        <select
          id="collegeId"
          name="collegeId"
          // Remounts when the university changes so the previous university's
          // college cannot stay selected and be submitted.
          key={`college-${universityId}`}
          defaultValue={state.values?.collegeId ?? ''}
          disabled={universityId === ''}
          className={`${controlClass} disabled:opacity-60`}
          aria-invalid={Boolean(errors.collegeId)}
          aria-describedby={errors.collegeId ? 'collegeId-error' : undefined}
        >
          <option value="" disabled>
            {studentProfile.collegePlaceholder}
          </option>
          {visibleColleges.map((college) => (
            <option key={college.id} value={college.id}>
              {college.nameAr}
            </option>
          ))}
        </select>
        <FieldError id="collegeId-error" message={errorFor('collegeId', errors.collegeId)} />
      </div>

      <div>
        <label htmlFor="stageId" className={labelClass}>
          {studentProfile.stageLabel}
        </label>
        <select
          id="stageId"
          name="stageId"
          key={`stage-${state.values?.stageId ?? ''}`}
          defaultValue={state.values?.stageId ?? ''}
          className={controlClass}
          aria-invalid={Boolean(errors.stageId)}
          aria-describedby={errors.stageId ? 'stageId-error' : undefined}
        >
          <option value="" disabled>
            {studentProfile.stagePlaceholder}
          </option>
          {stages.map((stage) => (
            <option key={stage.id} value={stage.id}>
              {stage.nameAr}
            </option>
          ))}
        </select>
        <FieldError id="stageId-error" message={errorFor('stageId', errors.stageId)} />
      </div>

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
        <FieldError id="document-error" message={errorFor('document', errors.document)} />
        <p className="mt-2 text-xs text-foreground-muted">{studentProfile.documentPrivacy}</p>
      </div>

      {state.formError ? (
        <p role="alert" className="rounded-md bg-surface-muted p-3 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  )
}
