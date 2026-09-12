'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { patientAccount } from '@/lib/copy'
import { attachCaseAction, type AttachState } from './attach-actions'

const INITIAL: AttachState = {}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('secondary', 'mt-3 w-full')}>
      {pending ? patientAccount.attaching : patientAccount.attach}
    </button>
  )
}

/**
 * Offered on the tracking page to a patient who is signed in and whose case is
 * not yet attached to their account.
 *
 * This is the flow that actually happens: somebody submits with no account, gets
 * a link, and only later decides they would rather not depend on it. Attaching
 * at submission alone would never reach them.
 */
export function AttachCase({ trackingToken }: { trackingToken: string }) {
  const [state, formAction] = useActionState(attachCaseAction, INITIAL)

  if (state.done) {
    return (
      <Card className="mt-4">
        <CardBody>
          <p className="text-sm">{patientAccount.attached}</p>
        </CardBody>
      </Card>
    )
  }

  return (
    <Card className="mt-4">
      <CardBody>
        <h2 className="font-bold">{patientAccount.attachTitle}</h2>
        <p className="mt-2 text-sm text-foreground-muted">{patientAccount.attachBody}</p>
        <form action={formAction}>
          <input type="hidden" name="trackingToken" value={trackingToken} />
          <Submit />
        </form>
        {state.error ? (
          <p role="alert" className="mt-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
      </CardBody>
    </Card>
  )
}
