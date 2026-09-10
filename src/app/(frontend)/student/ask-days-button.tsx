'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentQueue } from '@/lib/copy'
import { askDaysAction, type AskDaysState } from './queue-actions'

const INITIAL: AskDaysState = {}

function Button() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 min-h-11 w-full rounded-md border border-border px-4 text-sm font-medium disabled:opacity-60"
    >
      {pending ? studentQueue.asking : studentQueue.askDays}
    </button>
  )
}

/**
 * Asking the patient about a day they did not choose.
 *
 * Not a claim and not styled like one: the student gets nothing by pressing it.
 * The case is only theirs if the patient says yes.
 */
export function AskDaysButton({ caseId, alreadyAsked }: { caseId: string; alreadyAsked: boolean }) {
  const [state, formAction] = useActionState(askDaysAction, INITIAL)

  if (alreadyAsked || state.asked) {
    return <p className="mt-3 text-sm text-foreground-muted">{studentQueue.askedAlready}</p>
  }

  return (
    <form action={formAction}>
      <input type="hidden" name="caseId" value={caseId} />
      <Button />
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </form>
  )
}
