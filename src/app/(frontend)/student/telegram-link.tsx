'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { studentTelegram } from '@/lib/copy'
import { createStudentInviteAction, type StudentInviteState } from './telegram-actions'
import { buttonClass } from '@/components/ui/button'

const INITIAL: StudentInviteState = {}

function Button({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className={buttonClass('primary', 'mt-3 w-full text-sm')}
    >
      {label}
    </button>
  )
}

/**
 * Offers the bot to a student.
 *
 * Two jobs at once: it is how they get notified, and — more usefully — how they
 * send their student ID without wrestling a web file picker on a cheap phone.
 */
export function TelegramLink({ needsDocument }: { needsDocument: boolean }) {
  const [state, formAction] = useActionState(createStudentInviteAction, INITIAL)

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface p-4">
      <h2 className="font-semibold">
        {needsDocument ? studentTelegram.sendDocTitle : studentTelegram.title}
      </h2>
      <p className="mt-1 text-sm text-foreground-muted">
        {needsDocument ? studentTelegram.sendDocBody : studentTelegram.body}
      </p>

      {state.deepLink ? (
        <a
          href={state.deepLink}
          // Leaves for telegram.org, and this page's URL is itself a credential
          // on the patient's side. No referrer, and no window.opener either.
          rel="noreferrer"
          className={buttonClass('primary', 'mt-3 w-full text-sm')}
        >
          {studentTelegram.open}
        </a>
      ) : (
        <form action={formAction}>
          <Button label={studentTelegram.action} />
        </form>
      )}

      {state.error ? (
        <p className="mt-2 text-xs text-foreground-muted">{studentTelegram.unavailable}</p>
      ) : null}
    </section>
  )
}
