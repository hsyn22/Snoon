'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { caseForm, dayRequest } from '@/lib/copy'
import { answerDayAction, type DayAnswerState } from './day-actions'

const INITIAL: DayAnswerState = {}

function Button({ label, tone }: { label: string; tone: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="answer"
      value={label === dayRequest.no ? 'NO' : 'YES'}
      disabled={pending}
      className={`min-h-11 flex-1 rounded-md px-4 text-sm font-medium disabled:opacity-60 ${tone}`}
    >
      {label}
    </button>
  )
}

/**
 * The same question the bot asks, for a patient who never linked Telegram.
 *
 * Telegram is optional and must stay optional, so every question the bot can ask
 * has to be answerable here too. Phrased about a day, never about a person.
 */
export function DayAnswer({ trackingToken, day }: { trackingToken: string; day: string }) {
  const [state, formAction] = useActionState(answerDayAction, INITIAL)
  const label = caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day

  if (state.done) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium">
          {state.done === 'YES' ? dayRequest.accepted : dayRequest.declined}
        </p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{dayRequest.title}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{dayRequest.body(label)}</p>

      <form action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="trackingToken" value={trackingToken} />
        <input type="hidden" name="day" value={day} />
        <Button label={dayRequest.yes(label)} tone="bg-accent text-accent-foreground" />
        <Button label={dayRequest.no} tone="border border-border" />
      </form>

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {dayRequest.failed}
        </p>
      ) : null}
    </section>
  )
}
