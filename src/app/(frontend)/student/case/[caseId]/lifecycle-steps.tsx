'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentLifecycle } from '@/lib/copy'
import {
  confirmAppointmentAction,
  recordOutcomeAction,
  type LifecycleState,
} from './lifecycle-actions'
import { returnRemainderAction, type RemainderState } from './remainder-actions'

const INITIAL: LifecycleState = {}

function Error({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="mt-2 text-sm text-danger">
      {message}
    </p>
  )
}

function SubmitButton({ label, busy, tone }: { label: string; busy: string; tone: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={`min-h-11 w-full rounded-md px-4 text-sm font-medium disabled:opacity-60 ${tone}`}
    >
      {pending ? busy : label}
    </button>
  )
}

/** Step one after contact: agree a time. Also used to reschedule. */
export function AppointmentStep({
  caseId,
  currentValue,
  isReschedule,
}: {
  caseId: string
  /** Pre-filled with the existing time when rescheduling, in Baghdad wall clock. */
  currentValue?: string
  isReschedule: boolean
}) {
  const [state, formAction] = useActionState(confirmAppointmentAction, INITIAL)

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">
        {isReschedule ? studentLifecycle.rescheduleAction : studentLifecycle.appointmentTitle}
      </h2>
      {isReschedule ? null : (
        <p className="mt-1 text-sm text-foreground-muted">{studentLifecycle.appointmentBody}</p>
      )}

      <form action={formAction} className="mt-3">
        <input type="hidden" name="caseId" value={caseId} />
        <label htmlFor="scheduledFor" className="block text-sm font-medium">
          {studentLifecycle.appointmentLabel}
        </label>
        <p className="mt-1 text-xs text-foreground-muted">{studentLifecycle.appointmentHint}</p>
        <input
          id="scheduledFor"
          name="scheduledFor"
          type="datetime-local"
          required
          defaultValue={currentValue}
          dir="ltr"
          className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-start text-foreground"
        />
        <div className="mt-3">
          <SubmitButton
            label={studentLifecycle.appointmentAction}
            busy={studentLifecycle.appointmentSaving}
            tone="bg-accent text-accent-foreground"
          />
        </div>
        <Error message={state.error} />
      </form>
    </section>
  )
}

/** Step two: what actually happened. All three answers close the case. */
export function OutcomeStep({ caseId }: { caseId: string }) {
  const [state, formAction] = useActionState(recordOutcomeAction, INITIAL)

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{studentLifecycle.outcomeTitle}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{studentLifecycle.outcomeBody}</p>

      <form action={formAction} className="mt-3 space-y-2">
        <input type="hidden" name="caseId" value={caseId} />
        <button
          type="submit"
          name="outcome"
          value="COMPLETED"
          className="min-h-11 w-full rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          {studentLifecycle.completed}
        </button>
        <button
          type="submit"
          name="outcome"
          value="NO_SHOW"
          className="min-h-11 w-full rounded-md border border-border px-4 text-sm font-medium"
        >
          {studentLifecycle.noShow}
        </button>
        <button
          type="submit"
          name="outcome"
          value="CANCELLED"
          className="min-h-11 w-full rounded-md border border-border px-4 text-sm font-medium"
        >
          {studentLifecycle.cancelled}
        </button>
        <Error message={state.error} />
      </form>
    </section>
  )
}

/**
 * Handing the remaining treatments to another stage.
 *
 * Shown only when the case actually asks for something this student's stage may
 * not perform. `remaining` is computed on the server from the stage capability
 * and repeated here so the student can see exactly what they are passing on
 * before they do it.
 */
export function RemainderStep({
  caseId,
  remaining,
}: {
  caseId: string
  remaining: readonly string[]
}) {
  const [state, formAction] = useActionState(returnRemainderAction, {} as RemainderState)

  if (state.done) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium">{studentLifecycle.remainderDone}</p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{studentLifecycle.remainderTitle}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{studentLifecycle.remainderBody}</p>

      <p className="mt-3 text-xs text-foreground-muted">
        {studentLifecycle.remainderListLabel}
      </p>
      <p className="text-sm font-medium">{remaining.join('، ')}</p>

      <form action={formAction} className="mt-3">
        <input type="hidden" name="caseId" value={caseId} />
        <RemainderButton />
        <Error message={state.error} />
      </form>
    </section>
  )
}

function RemainderButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-md border border-border px-4 text-sm font-medium disabled:opacity-60"
    >
      {pending ? studentLifecycle.remainderSaving : studentLifecycle.remainderAction}
    </button>
  )
}
