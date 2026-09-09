'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
import { studentAuth } from '@/lib/copy'
import type { AuthFormState } from './actions'

const INITIAL: AuthFormState = {}

const labelClass = 'block text-sm font-medium text-foreground'
const hintClass = 'mt-1 text-xs text-foreground-muted'
const controlClass =
  'mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground'

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null
  return (
    <p id={id} role="alert" className="mt-1 text-sm text-danger">
      {message}
    </p>
  )
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="min-h-11 w-full rounded-md bg-accent px-4 font-medium text-accent-foreground disabled:opacity-60"
    >
      {pending ? studentAuth.signingIn : label}
    </button>
  )
}

export function AuthForm({
  action,
  submitLabel,
  withName,
}: {
  action: (state: AuthFormState, formData: FormData) => Promise<AuthFormState>
  submitLabel: string
  /** Sign-up collects a name; login does not. */
  withName: boolean
}) {
  const [state, formAction] = useActionState(action, INITIAL)
  const errors = state.errors ?? {}
  // Clear a field's error as soon as it is edited.
  const { onInput, errorFor } = useDismissibleErrors(state)
  // Re-submitting after an error must not mean typing everything again.
  const values = state.values

  return (
    <form action={formAction} onInput={onInput} className="space-y-5" noValidate>
      {withName ? (
        <div>
          <label htmlFor="name" className={labelClass}>
            {studentAuth.nameLabel}
          </label>
          <p className={hintClass}>{studentAuth.nameHint}</p>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            defaultValue={values?.name ?? ''}
            className={controlClass}
            aria-invalid={Boolean(errors.name)}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
          <FieldError id="name-error" message={errorFor('name', errors.name)} />
        </div>
      ) : null}

      <div>
        <label htmlFor="email" className={labelClass}>
          {studentAuth.emailLabel}
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          dir="ltr"
          defaultValue={values?.email ?? ''}
          className={`${controlClass} text-start`}
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
        />
        <FieldError id="email-error" message={errorFor('email', errors.email)} />
      </div>

      <div>
        <label htmlFor="password" className={labelClass}>
          {studentAuth.passwordLabel}
        </label>
        {withName ? <p className={hintClass}>{studentAuth.passwordHint}</p> : null}
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={withName ? 'new-password' : 'current-password'}
          dir="ltr"
          className={`${controlClass} text-start`}
          aria-invalid={Boolean(errors.password)}
          aria-describedby={errors.password ? 'password-error' : undefined}
        />
        <FieldError id="password-error" message={errorFor('password', errors.password)} />
      </div>

      {state.formError ? (
        <p role="alert" className="rounded-md bg-surface-muted p-3 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  )
}
