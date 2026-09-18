'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
import { WEEK_DAYS, type Stage, type University } from '@/lib/config/schema'
import { caseForm, studentProfile } from '@/lib/copy'
import { updateProfileAction, type ProfileFormState } from './actions'
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
    <button type="submit" disabled={pending} className={buttonClass('primary', 'w-full')}>
      {pending ? studentProfile.submitting : studentProfile.saveAction}
    </button>
  )
}

/**
 * Correcting a profile that already exists.
 *
 * Every field defaults to what the student is currently recorded as, and to what
 * they submitted if the action refused them — React 19 resets a form after an
 * action runs, so without handing the values back a rejected edit would wipe the
 * screen and lose the correction somebody came here to make.
 *
 * The warning sits **above** the fields rather than beside the button. Three of
 * these are what an admin verified, so editing one takes the account back to the
 * review queue — and a student who learns that after saving has lost their
 * access to fix a typo and was never told it would cost that.
 */
export function ProfileEditForm({
  universities,
  stages,
  current,
}: {
  universities: readonly University[]
  stages: readonly Stage[]
  current: {
    fullName: string
    universityId: string
    stageId: string
    clinicDays: readonly string[]
  }
}) {
  const [state, formAction] = useActionState(updateProfileAction, INITIAL)
  const errors = state.errors ?? {}
  const { onInput, errorFor } = useDismissibleErrors(state)

  const nameValue = state.values?.fullName ?? current.fullName
  const universityValue = state.values?.universityId ?? current.universityId
  const stageValue = state.values?.stageId ?? current.stageId
  const dayValues = state.values?.clinicDays ?? current.clinicDays

  return (
    <form action={formAction} onInput={onInput} className="space-y-5" noValidate>
      <p className="rounded-md border border-warm/40 bg-warm-muted p-3 text-sm">
        {studentProfile.reverifyWarning}
      </p>

      <FormSection title={studentProfile.editSection}>
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
          <FieldError id="fullName-error" message={errorFor('fullName', errors.fullName)} />
        </div>

        <div>
          <label htmlFor="universityId" className={labelClass}>
            {studentProfile.universityLabel}
          </label>
          {/* `key` tied to the value, or React keeps the previously rendered
              option selected when the form is reset after a refused action. */}
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
          <FieldError
            id="universityId-error"
            message={errorFor('universityId', errors.universityId)}
          />
        </div>

        <div>
          <label htmlFor="stageId" className={labelClass}>
            {studentProfile.stageLabel}
          </label>
          <select
            id="stageId"
            name="stageId"
            key={`stage-${stageValue}`}
            defaultValue={stageValue}
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
                  defaultChecked={dayValues.includes(day)}
                  className="size-4"
                />
                {caseForm.weekDays[day]}
              </label>
            ))}
          </div>
          <FieldError id="clinicDays-error" message={errorFor('clinicDays', errors.clinicDays)} />
        </fieldset>
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
