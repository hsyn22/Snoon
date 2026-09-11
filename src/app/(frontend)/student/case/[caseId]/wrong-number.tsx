'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentClaim } from '@/lib/copy'
import { reportWrongNumberAction, type WrongNumberState } from './wrong-number-actions'
import { buttonClass } from '@/components/ui/button'

const INITIAL: WrongNumberState = {}

function Button() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass('danger', 'mt-3 w-full text-sm')}
    >
      {pending ? studentClaim.wrongNumberSaving : studentClaim.wrongNumberAction}
    </button>
  )
}

/**
 * The student reporting that whoever answered never asked for treatment.
 *
 * Two taps, not one. The action is terminal — it closes the case and takes the
 * number out of use — so it must not be reachable by a thumb landing in the
 * wrong place on a phone. It is deliberately not styled as a primary action
 * either: most calls are ordinary, and this is the exception.
 */
export function WrongNumberReport({ caseId }: { caseId: string }) {
  const [state, formAction] = useActionState(reportWrongNumberAction, INITIAL)
  const [confirming, setConfirming] = useState(false)

  if (state.done) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium">{studentClaim.wrongNumberDone}</p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{studentClaim.wrongNumberTitle}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{studentClaim.wrongNumberBody}</p>

      {confirming ? (
        <form action={formAction}>
          <input type="hidden" name="caseId" value={caseId} />
          <p className="mt-3 text-sm font-medium text-danger">
            {studentClaim.wrongNumberConfirm}
          </p>
          <Button />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className={buttonClass('secondary', 'mt-3 w-full text-sm font-normal text-foreground-muted')}
        >
          {studentClaim.wrongNumberAction}
        </button>
      )}

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </section>
  )
}
