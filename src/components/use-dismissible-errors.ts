'use client'

import { useCallback, useState } from 'react'

/**
 * Hide a field's error once the person has edited that field.
 *
 * `useActionState` holds the previous result until the next submission, so
 * without this a corrected field keeps its old error: "choose your city" stays
 * in red underneath the city they just chose. That reads as broken, and on a
 * small screen it is the difference between a form someone finishes and one they
 * abandon.
 *
 * The listener goes on the form rather than on every input, so a field cannot be
 * added later and silently miss it. `input` fires for text, select, checkbox,
 * radio and file alike.
 */
export function useDismissibleErrors<T extends object>(state: T) {
  const [touched, setTouched] = useState<ReadonlySet<string>>(() => new Set())
  const [lastState, setLastState] = useState(state)

  // A new action result is a fresh set of errors about the current values, so
  // every field is worth complaining about again. Adjusted during render rather
  // than in an effect: React re-runs this component immediately with the new
  // state and never commits the stale one, where an effect would paint the old
  // errors first and then clear them.
  if (lastState !== state) {
    setLastState(state)
    setTouched(new Set())
  }

  const onInput = useCallback((event: React.FormEvent<HTMLFormElement>) => {
    const name = (event.target as Partial<HTMLInputElement>).name
    if (!name) return
    setTouched((previous) => {
      if (previous.has(name)) return previous
      const next = new Set(previous)
      next.add(name)
      return next
    })
  }, [])

  /** The message to render for a field, or undefined once it has been edited. */
  const errorFor = useCallback(
    (name: string, message?: string) => (touched.has(name) ? undefined : message),
    [touched],
  )

  return { onInput, errorFor }
}
