'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { telegramInvite } from '@/lib/copy'
import { createPatientInviteAction, type InviteState } from './telegram-actions'

const INITIAL: InviteState = {}

function Button() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-3 min-h-11 w-full rounded-md border border-border bg-surface px-4 text-sm font-medium disabled:opacity-60"
    >
      {telegramInvite.action}
    </button>
  )
}

export function TelegramInvite({
  trackingToken,
  alreadyLinked,
}: {
  trackingToken: string
  alreadyLinked: boolean
}) {
  const [state, formAction] = useActionState(createPatientInviteAction, INITIAL)

  if (alreadyLinked) {
    return (
      <section className="mt-4 rounded-lg border border-border bg-surface p-4">
        <p className="text-sm font-medium">{telegramInvite.linked}</p>
      </section>
    )
  }

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">{telegramInvite.title}</h2>
      <p className="mt-1 text-sm text-foreground-muted">{telegramInvite.patientBody}</p>

      {state.deepLink ? (
        // Opens Telegram, which hands the token to the bot as /start <token>.
        <a
          href={state.deepLink}
          // Leaves for telegram.org, and this page's URL is itself a credential
          // on the patient's side. No referrer, and no window.opener either.
          rel="noreferrer"
          className="mt-3 flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          {telegramInvite.action}
        </a>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="trackingToken" value={trackingToken} />
          <Button />
        </form>
      )}

      {state.error ? (
        <p className="mt-2 text-xs text-foreground-muted">{telegramInvite.unavailable}</p>
      ) : null}
    </section>
  )
}
