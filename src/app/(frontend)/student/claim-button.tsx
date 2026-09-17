'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { studentQueue } from '@/lib/copy'
import { claimCaseAction, type ClaimActionState } from './queue-actions'

const INITIAL: ClaimActionState = {}

function Button() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass('primary', 'w-full')}
    >
      {pending ? studentQueue.claiming : studentQueue.claim}
    </button>
  )
}

/**
 * The claim button, and what it looks like when a student has their hands full.
 *
 * `atLimit` renders a disabled button with the reason under it rather than
 * removing the button or the card. A missing button on a case that is otherwise
 * exactly like the one above it reads as a bug; a disabled one with a sentence
 * reads as a rule, and names what clears it.
 *
 * **It is not the rule.** `claimCaseForStudent` refuses the same thing on the
 * server, for the site and the Telegram bot alike — this attribute is a
 * courtesy, and a disabled attribute has never stopped a POST.
 */
export function ClaimButton({
  caseId,
  atLimit = false,
  limit = 1,
}: {
  caseId: string
  atLimit?: boolean
  limit?: number
}) {
  const [state, formAction] = useActionState(claimCaseAction, INITIAL)

  if (atLimit) {
    return (
      <div className="mt-4">
        <button type="button" disabled className={buttonClass('primary', 'w-full')}>
          {studentQueue.claim}
        </button>
        <p className="mt-2 text-xs text-foreground-muted">
          {studentQueue.claimFailedLimit(limit)}
        </p>
      </div>
    )
  }

  return (
    <form action={formAction} className="mt-4">
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
