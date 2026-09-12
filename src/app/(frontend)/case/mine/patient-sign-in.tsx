'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { GoogleMark } from '@/components/brand/google-mark'
import { patientAccount, studentAuth } from '@/lib/copy'
import { patientSignInAction, type PatientAuthState } from './actions'

const INITIAL: PatientAuthState = {}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('secondary', 'w-full')}>
      {pending ? (
        studentAuth.googleStarting
      ) : (
        <>
          <GoogleMark />
          {patientAccount.signIn}
        </>
      )}
    </button>
  )
}

/**
 * The patient's way into an account, and the only one.
 *
 * There is no password path on the patient side and there should not be: the
 * whole justification for a patient account is that it costs seconds, and a
 * password plus a verification email is neither seconds nor free of the sending
 * domain سنون does not have.
 */
export function PatientSignIn() {
  const [state, formAction] = useActionState(patientSignInAction, INITIAL)

  return (
    <div>
      <form action={formAction}>
        <Submit />
      </form>
      {state.error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
    </div>
  )
}
