'use client'

import Link from 'next/link'
import { common } from '@/lib/copy'

/**
 * What a patient or student sees when something throws.
 *
 * Without this, Next renders its own screen: English, on a Latin layout, saying
 * "Application error: a client-side exception has occurred". Someone halfway
 * through submitting a case has no idea whether their case was saved or what to
 * do next.
 *
 * `reset()` re-renders the segment without a full page load, which is the right
 * first thing to try on a flaky connection — the median user's connection.
 */
export default function FrontendError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
      <h1 className="text-2xl font-bold">{common.errorTitle}</h1>
      <p className="mt-2 text-foreground-muted">{common.errorBody}</p>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={reset}
          className="min-h-11 rounded-md bg-accent px-4 font-medium text-accent-foreground"
        >
          {common.errorRetry}
        </button>
        <Link href="/" className="text-sm font-medium text-accent underline">
          {common.backHome}
        </Link>
      </div>

      {/* The digest is a hash Next also writes to the server log, so it is the
          one thing that connects "it broke for me" to what actually happened.
          It carries nothing about the error itself, so it is safe to show. */}
      {error.digest ? (
        <p className="mt-8 text-xs text-foreground-muted">
          {common.errorReference}: <span className="ltr-run">{error.digest}</span>
          <br />
          {common.errorReferenceHint}
        </p>
      ) : null}
    </main>
  )
}
