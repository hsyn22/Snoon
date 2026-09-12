'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { buttonClass } from '@/components/ui/button'
import { GoogleMark } from '@/components/brand/google-mark'
import { studentAuth } from '@/lib/copy'
import { continueWithGoogleAction } from './actions'
import type { AuthFormState } from './actions'

const INITIAL: AuthFormState = {}

function Submit() {
  const { pending } = useFormStatus()
  return (
    <button type="submit" disabled={pending} className={buttonClass('secondary', 'w-full')}>
      {pending ? (
        studentAuth.googleStarting
      ) : (
        <>
          <GoogleMark />
          {studentAuth.google}
        </>
      )}
    </button>
  )
}

/**
 * The fastest way into سنون, and — until a sending domain exists — the only one
 * that works in production. See `src/lib/oauth.ts`.
 *
 * A plain form posting to a server action, so the tap works whether or not the
 * JavaScript has arrived. `useActionState` only carries the error back; it is
 * not what makes the button function.
 */
export function GoogleButton() {
  const [state, formAction] = useActionState(continueWithGoogleAction, INITIAL)

  return (
    <div>
      <form action={formAction}>
        <Submit />
      </form>
      <p className="mt-2 text-center text-xs text-foreground-muted">{studentAuth.googleHint}</p>
      {state.formError ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}
    </div>
  )
}

/** A labelled rule between the Google button and the email fields. */
export function AuthDivider() {
  return (
    <div className="my-6 flex items-center gap-3" aria-hidden="true">
      <span className="h-px grow bg-border" />
      <span className="text-xs text-foreground-muted">{studentAuth.or}</span>
      <span className="h-px grow bg-border" />
    </div>
  )
}
