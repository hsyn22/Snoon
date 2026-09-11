'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useDismissibleErrors } from '@/components/use-dismissible-errors'
import { studentAuth } from '@/lib/copy'
import type { AuthFormState } from './actions'
import { buttonClass } from '@/components/ui/button'
// One set of field styles for every form in the product — see ui/field.tsx.
import { controlClass, FormSection, hintClass, labelClass } from '@/components/ui/field'

const INITIAL: AuthFormState = {}

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
      className={buttonClass('primary', 'w-full')}
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
      <FormSection title={studentAuth.accountSection}>
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
      </FormSection>

      {state.formError ? (
        <p role="alert" className="rounded-md bg-surface-muted p-3 text-sm text-danger">
          {state.formError}
        </p>
      ) : null}

      <SubmitButton label={submitLabel} />
    </form>
  )
}
