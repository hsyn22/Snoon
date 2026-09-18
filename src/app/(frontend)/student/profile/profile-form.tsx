'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
import { WEEK_DAYS, type Stage, type University } from '@/lib/config/schema'
import { caseForm, studentProfile } from '@/lib/copy'
import { submitProfileAction, type ProfileFormState } from './actions'
import { buttonClass } from '@/components/ui/button'
import { controlClass, FormSection, hintClass, labelClass, optionClass } from '@/components/ui/field'

const INITIAL: ProfileFormState = {}

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
      className={buttonClass('primary', 'w-full')}
    >
      {pending ? studentProfile.submitting : studentProfile.submit}
    </button>
  )
}

export function ProfileForm({
  universities,
  stages,
}: {
  universities: readonly University[]
  stages: readonly Stage[]
}) {
  const [state, formAction] = useActionState(submitProfileAction, INITIAL)
  const errors = state.errors ?? {}
  // Clear a field's error as soon as it is edited.
  const { onInput, errorFor } = useDismissibleErrors(state)


  return (
    <form action={formAction} onInput={onInput} className="space-y-5" noValidate>
      <FormSection title={studentProfile.studySection}>
        {/* The name is asked for here rather than lifted off the Google account.
            It is the value an admin holds a document up against, and a display
            name — "Ahmed", or whatever somebody typed into Google years ago —
            makes that comparison impossible to do honestly. */}
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
            defaultValue={state.values?.fullName ?? ''}
            className={controlClass}
            aria-invalid={Boolean(errors.fullName)}
            aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          />
          <FieldError id="fullName-error" message={errorFor('fullName', errors.fullName)} />
        </div>

        <div>
          <label htmlFor="universityId" className={labelClass}>
            {studentProfile.universityLabel}
          </label>
          {/* Uncontrolled again. It was stateful only to narrow the college
              list as you picked, and there is no college list any more — so it
              follows the same `defaultValue` + `key` rule as every other select
              here, which is what keeps a rejected form from emptying itself. */}
          <select
            id="universityId"
            name="universityId"
            key={`university-${state.values?.universityId ?? ''}`}
            defaultValue={state.values?.universityId ?? ''}
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
      </FormSection>

      <FormSection title={studentProfile.daysSection}>
        <fieldset>
          <legend className={labelClass}>{studentProfile.clinicDaysLabel}</legend>
          <p className={hintClass}>{studentProfile.clinicDaysHint}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {WEEK_DAYS.map((day) => (
              <label key={day} className={optionClass}>
                <input
                  type="checkbox"
                  name="clinicDays"
                  value={day}
                  defaultChecked={state.values?.clinicDays?.includes(day)}
                  className="size-4"
                />
                {caseForm.weekDays[day]}
              </label>
            ))}
          </div>
          <FieldError id="clinicDays-error" message={errorFor('clinicDays', errors.clinicDays)} />
        </fieldset>
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
          <FieldError id="document-error" message={errorFor('document', errors.document)} />
          <p className="mt-2 rounded-md bg-accent-muted p-3 text-xs text-foreground">
            {studentProfile.documentPrivacy}
          </p>
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
