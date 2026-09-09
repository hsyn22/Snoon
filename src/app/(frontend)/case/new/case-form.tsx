'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
// From ./schema, not ./index: importing the Payload reader here would pull the
// whole CMS into the browser bundle.
import { WEEK_DAYS, type City, type TreatmentType } from '@/lib/config/schema'
import { caseForm, casePhotos } from '@/lib/copy'
import { MAX_PHOTOS_PER_CASE, MAX_PHOTO_BYTES, MAX_PHOTO_BYTES_TOTAL } from '@/lib/images/limits'
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

/** The same rules the server applies, so the browser can say no first. */
function describePhotoSelection(files: File[]): string | null {
  if (files.length > MAX_PHOTOS_PER_CASE) return casePhotos.errors.tooMany
  if (files.some((file) => file.size > MAX_PHOTO_BYTES)) return casePhotos.errors.tooLarge

  const total = files.reduce((sum, file) => sum + file.size, 0)
  if (total > MAX_PHOTO_BYTES_TOTAL) return casePhotos.errors.tooLargeTotal

  return null
}

const labelClass = 'block text-sm font-medium text-foreground'
const hintClass = 'mt-1 text-xs text-foreground-muted'
const controlClass =
  'mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground'
const optionClass =
  'flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm'

export function CaseForm({
  cities,
  treatmentTypes,
}: {
  cities: readonly City[]
  treatmentTypes: readonly TreatmentType[]
}) {
  const [state, formAction] = useActionState(submitCaseAction, INITIAL)
  // A photograph problem the browser caught, before anything was uploaded.
  const [photoError, setPhotoError] = useState<string | null>(null)
  const errors = state.errors ?? {}
  // Clear a field's error as soon as it is edited.
  const { onInput, errorFor } = useDismissibleErrors(state)
  // Re-submitting after an error must not mean typing everything again.
  const values = state.values

  return (
    <form action={formAction} onInput={onInput} className="space-y-6" noValidate>
      <div>
        <label htmlFor="cityId" className={labelClass}>
          {caseForm.cityLabel}
        </label>
        <select
          id="cityId"
          name="cityId"
          // React re-applies a changed defaultValue to a text input but not to a
          // mounted <select>, so without a key the restored city silently does
          // not stick. Keying on the value remounts it with the right default.
          key={`city-${values?.cityId ?? ''}`}
          className={controlClass}
          aria-invalid={Boolean(errors.cityId)}
          aria-describedby={errors.cityId ? 'cityId-error' : undefined}
          defaultValue={values?.cityId ?? ''}
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
        <FieldError id="cityId-error" message={errorFor('cityId', errors.cityId)} />
      </div>

      <fieldset>
        <legend className={labelClass}>{caseForm.treatmentLabel}</legend>
        <p className={hintClass}>{caseForm.treatmentHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {treatmentTypes.map((treatment) => (
            <label key={treatment.id} className={optionClass}>
              <input
                type="checkbox"
                name="treatmentTypeIds"
                value={treatment.id}
                defaultChecked={values?.treatmentTypeIds.includes(treatment.id)}
                className="size-4"
              />
              {treatment.nameAr}
            </label>
          ))}
        </div>
        <FieldError id="treatmentTypeIds-error" message={errorFor('treatmentTypeIds', errors.treatmentTypeIds)} />
      </fieldset>

      <fieldset>
        <legend className={labelClass}>{caseForm.daysLabel}</legend>
        <p className={hintClass}>{caseForm.daysHint}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {WEEK_DAYS.map((day) => (
            <label key={day} className={optionClass}>
              <input
                type="checkbox"
                name="availabilityDays"
                value={day}
                defaultChecked={values?.availabilityDays.includes(day)}
                className="size-4"
              />
              {caseForm.weekDays[day]}
            </label>
          ))}
        </div>
        <FieldError id="availabilityDays-error" message={errorFor('availabilityDays', errors.availabilityDays)} />
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
          defaultValue={values?.patientName ?? ''}
          className={controlClass}
          aria-invalid={Boolean(errors.patientName)}
          aria-describedby={errors.patientName ? 'patientName-error' : undefined}
        />
        <FieldError id="patientName-error" message={errorFor('patientName', errors.patientName)} />
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
          defaultValue={values?.patientPhone ?? ''}
          className={`${controlClass} text-start`}
          aria-invalid={Boolean(errors.patientPhone)}
          aria-describedby={errors.patientPhone ? 'patientPhone-error' : undefined}
        />
        <FieldError id="patientPhone-error" message={errorFor('patientPhone', errors.patientPhone)} />
      </div>

      <div>
        <label htmlFor="photos" className={labelClass}>
          {casePhotos.label}
        </label>
        <p className={hintClass}>{casePhotos.hint}</p>
        {/* The guide requires this warning, in Arabic, on the upload itself. */}
        <p className="mt-2 text-sm font-medium text-warning">{casePhotos.faceWarning}</p>
        <input
          id="photos"
          name="photos"
          type="file"
          accept="image/*"
          multiple
          // capture is deliberately omitted: on a phone this offers both the
          // camera and the gallery, and a patient may already have a photo.
          className="mt-2 w-full text-sm"
          onChange={(event) => {
            // Checked here as well as on the server, because the server never
            // gets to answer: a request over the action's body limit is refused
            // before the action runs, and the patient loses the whole form to an
            // English error. On a slow connection this also saves them from
            // uploading megabytes that were going to be rejected.
            const files = Array.from(event.target.files ?? [])
            const problem = describePhotoSelection(files)
            setPhotoError(problem)
            if (problem) event.target.value = ''
          }}
        />
        <p className="mt-2 text-xs text-foreground-muted">{casePhotos.privacy}</p>
        {photoError || state.photoError ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {photoError ?? state.photoError}
          </p>
        ) : null}
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
          defaultValue={values?.notes ?? ''}
          className={`${controlClass} py-2`}
          aria-invalid={Boolean(errors.notes)}
          aria-describedby={errors.notes ? 'notes-error' : undefined}
        />
        <FieldError id="notes-error" message={errorFor('notes', errors.notes)} />
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
