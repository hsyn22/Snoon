'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { patientConfirm } from '@/lib/copy'
import { answerContactAction, type ConfirmState } from './confirm-actions'

const INITIAL: ConfirmState = {}

function Answer({ value, label, tone }: { value: 'YES' | 'NO'; label: string; tone: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      name="answer"
      value={value}
      disabled={pending}
      className={`min-h-11 flex-1 rounded-md px-4 text-sm font-medium disabled:opacity-60 ${tone}`}
    >
      {label}
    </button>
  )
}

export function ConfirmContact({ trackingToken }: { trackingToken: string }) {
  const [state, formAction] = useActionState(answerContactAction, INITIAL)

  if (state.done) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm">
          {state.done === 'YES' ? patientConfirm.confirmed : patientConfirm.denied}
        </p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{patientConfirm.title}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{patientConfirm.body}</p>

      <form action={formAction} className="mt-3 flex gap-2">
        <input type="hidden" name="trackingToken" value={trackingToken} />
        <Answer
          value="YES"
          label={patientConfirm.yes}
          tone="bg-accent text-accent-foreground"
        />
        <Answer value="NO" label={patientConfirm.no} tone="border border-border bg-surface" />
      </form>
    </section>
  )
}
