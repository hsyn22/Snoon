'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentContact } from '@/lib/copy'
import { assertContactAction, type AssertContactState } from './actions'

const INITIAL: AssertContactState = {}

function Button() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 min-h-11 w-full rounded-md border border-border bg-surface px-4 text-sm font-medium disabled:opacity-60"
    >
      {studentContact.assertAction}
    </button>
  )
}

export function AssertContact({
  caseId,
  alreadyAsserted,
  confirmed,
}: {
  caseId: string
  alreadyAsserted: boolean
  confirmed: boolean
}) {
  const [state, formAction] = useActionState(assertContactAction, INITIAL)

  if (confirmed) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium text-positive">{studentContact.assertConfirmed}</p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{studentContact.assertTitle}</h2>
      <p className="mt-1 text-sm text-foreground-muted">
        {alreadyAsserted ? studentContact.assertPending : studentContact.assertBody}
      </p>

      {alreadyAsserted ? null : (
        <form action={formAction}>
          <input type="hidden" name="caseId" value={caseId} />
          <Button />
        </form>
      )}

      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </section>
  )
}
