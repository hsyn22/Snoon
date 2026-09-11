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

export function ClaimButton({ caseId }: { caseId: string }) {
  const [state, formAction] = useActionState(claimCaseAction, INITIAL)

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
