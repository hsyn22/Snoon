'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { optionClass } from '@/components/ui/field'
import { studentNotifications } from '@/lib/copy'
import {
  saveNotificationSettingsAction,
  type NotificationSettingsState,
} from './actions'

const INITIAL: NotificationSettingsState = {}

function SaveButton() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('primary')}>
      {pending ? studentNotifications.saving : studentNotifications.save}
    </button>
  )
}

/**
 * The notification settings form.
 *
 * A Client Component, and the only reason is that the treatment list collapses
 * when the alerts are switched off — a list of checkboxes under a question the
 * student has just answered "no" to is noise. Everything else here is a plain
 * form post.
 *
 * **It degrades to showing the list.** With no JavaScript the `useState` never
 * changes, the list renders at its server value and both controls still submit
 * — so a student on a dead connection can still turn alerts off. The collapse
 * is a tidiness, never a gate.
 *
 * **Every treatment starts ticked**, which is Haider's instruction and is also
 * the safe direction: the action stores what is *left over* as the muted set, so
 * a treatment added to سنون next month is on for everybody rather than silently
 * on for nobody.
 */
export function NotificationSettingsForm({
  treatments,
  notifyNewCases,
  mutedTreatmentTypeIds,
}: {
  treatments: readonly { id: string; nameAr: string }[]
  notifyNewCases: boolean
  mutedTreatmentTypeIds: readonly string[]
}) {
  const [state, formAction] = useActionState(saveNotificationSettingsAction, INITIAL)
  const [enabled, setEnabled] = useState(notifyNewCases)

  return (
    <form action={formAction} className="space-y-5">
      <div className="rounded-lg border border-border bg-surface p-4">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            name="notifyNewCases"
            defaultChecked={notifyNewCases}
            onChange={(event) => setEnabled(event.currentTarget.checked)}
            className="mt-1 size-5"
          />
          <span>
            <span className="block text-sm font-bold">{studentNotifications.enableLabel}</span>
            <span className="mt-1 block text-xs text-foreground-muted">
              {studentNotifications.enableHint}
            </span>
          </span>
        </label>
      </div>

      {enabled ? (
        <fieldset className="rounded-lg border border-border bg-surface p-4">
          <legend className="px-1 text-sm font-bold text-accent">
            {studentNotifications.treatmentsTitle}
          </legend>
          <p className="mt-1 text-xs text-foreground-muted">
            {studentNotifications.treatmentsHint}
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {treatments.map((treatment) => (
              <li key={treatment.id}>
                <label className={optionClass}>
                  <input
                    type="checkbox"
                    name="treatments"
                    value={treatment.id}
                    // Ticked unless deliberately muted: the stored value is the
                    // exclusion list, so anything new is on by default.
                    defaultChecked={!mutedTreatmentTypeIds.includes(treatment.id)}
                    className="size-4"
                  />
                  {treatment.nameAr}
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton />
        {state.saved ? (
          <p role="status" className="text-sm text-accent">
            {studentNotifications.saved}
          </p>
        ) : null}
        {state.error ? (
          <p role="alert" className="text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
