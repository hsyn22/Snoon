'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import type { City, TreatmentType } from '@/lib/config'
import { WEEK_DAYS } from '@/lib/config'
import { caseForm } from '@/lib/copy'
import { submitCaseAction, type CaseFormState } from './actions'

const INITIAL: CaseFormState = {}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {message}
    </p>
  )
}

function SubmitButton() {
  // Reads the parent form's pending state, so the patient cannot double-submit
  // on a slow connection — which is the connection to design for.
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-md bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60"
    >
      {pending ? caseForm.submitting : caseForm.submit}
    </button>
  )
}

const labelClass = 'block text-sm font-medium text-foreground'
const hintClass = 'mt-1 text-xs text-foreground-muted'
const controlClass =
  'mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground'

export function CaseForm({
  cities,
  treatmentTypes,
}: {
  cities: readonly City[]
  treatmentTypes: readonly TreatmentType[]
}) {
  const [state, formAction] = useActionState(submitCaseAction, INITIAL)
  const errors = state.errors ?? {}

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <label htmlFor="cityId" className={labelClass}>
          {caseForm.cityLabel}
        </label>
        <select
          id="cityId"
          name="cityId"
          className={controlClass}
          aria-invalid={Boolean(errors.cityId)}
          aria-describedby={errors.cityId ? 'cityId-error' : undefined}
          defaultValue=""
        >
          <option value="" disabled>
            {caseForm.cityPlaceholder}
          </option>
          {cities.map((city) => (
            <option key={city.id} value={city.id}>
              {city.nameAr}
            </option>
          ))}
        </select>
        <FieldError id="cityId-error" message={errors.cityId} />
      </div>

      <div>
        <label htmlFor="treatmentTypeId" className={labelClass}>
          {caseForm.treatmentLabel}
        </label>
        <p className={hintClass}>{caseForm.treatmentHint}</p>
        <select
          id="treatmentTypeId"
          name="treatmentTypeId"
          className={controlClass}
          aria-invalid={Boolean(errors.treatmentTypeId)}
          aria-describedby={errors.treatmentTypeId ? 'treatmentTypeId-error' : undefined}
          defaultValue=""
        >
          <option value="" disabled>
            {caseForm.treatmentPlaceholder}
          </option>
          {treatmentTypes.map((treatment) => (
            <option key={treatment.id} value={treatment.id}>
              {treatment.nameAr} — {treatment.descriptionAr}
            </option>
          ))}
        </select>
        <FieldError id="treatmentTypeId-error" message={errors.treatmentTypeId} />
      </div>

      <fieldset>
        <legend className={labelClass}>{caseForm.daysLabel}</legend>
        <p className={hintClass}>{caseForm.daysHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {WEEK_DAYS.map((day) => (
            <label
              key={day}
              className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm"
            >
              <input type="checkbox" name="availabilityDays" value={day} className="size-4" />
              {caseForm.weekDays[day]}
            </label>
          ))}
        </div>
        <FieldError id="availabilityDays-error" message={errors.availabilityDays} />
      </fieldset>

      <fieldset>
        <legend className={labelClass}>{caseForm.periodLabel}</legend>
        <div className="mt-2 space-y-2">
          {(['MORNING', 'AFTERNOON', 'EITHER'] as const).map((period) => (
            <label
              key={period}
              className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm"
            >
              <input type="radio" name="availabilityPeriod" value={period} className="size-4" />
              {caseForm.periodOptions[period]}
            </label>
          ))}
        </div>
        <FieldError id="availabilityPeriod-error" message={errors.availabilityPeriod} />
      </fieldset>

      <div>
        <label htmlFor="patientName" className={labelClass}>
          {caseForm.nameLabel}
        </label>
        <p className={hintClass}>{caseForm.nameHint}</p>
        <input
          id="patientName"
          name="patientName"
          type="text"
          autoComplete="name"
          className={controlClass}
          aria-invalid={Boolean(errors.patientName)}
          aria-describedby={errors.patientName ? 'patientName-error' : undefined}
        />
        <FieldError id="patientName-error" message={errors.patientName} />
      </div>

      <div>
        <label htmlFor="patientPhone" className={labelClass}>
          {caseForm.phoneLabel}
        </label>
        <p className={hintClass}>{caseForm.phoneHint}</p>
        <input
          id="patientPhone"
          name="patientPhone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          dir="ltr"
          placeholder="07701234567"
          className={`${controlClass} text-start`}
          aria-invalid={Boolean(errors.patientPhone)}
          aria-describedby={errors.patientPhone ? 'patientPhone-error' : undefined}
        />
        <FieldError id="patientPhone-error" message={errors.patientPhone} />
      </div>

      <div>
        <label htmlFor="notes" className={labelClass}>
          {caseForm.notesLabel}
        </label>
        <p className={hintClass}>{caseForm.notesHint}</p>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={1000}
          className={`${controlClass} py-2`}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
        />
        <FieldError id="notes-error" message={errors.notes} />
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
