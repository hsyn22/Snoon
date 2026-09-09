import type { Metadata } from 'next'
import Link from 'next/link'
import { studentAuth, studentSignUpClosed, site } from '@/lib/copy'
import { isEmailConfigured } from '@/lib/email'
import { AuthForm } from '../auth-form'
import { signUpAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.signUpTitle }

/** Whether sign-up can work depends on the runtime environment, not the build. */
export const dynamic = 'force-dynamic'

export default function StudentSignUpPage() {
  // No email provider means no verification link, and an unverifiable account is
  // worse than no account. Say so instead of showing a form that cannot work.
  if (!isEmailConfigured()) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
        <header className="py-6">
          <Link href="/" className="text-sm text-foreground-muted">
            {site.name}
          </Link>
        </header>
        <main id="main" className="grow">
          <section className="rounded-lg border border-border bg-surface p-5">
            <h1 className="text-xl font-bold">{studentSignUpClosed.title}</h1>
            <p className="mt-2 text-sm text-foreground-muted">{studentSignUpClosed.body}</p>
          </section>
          <Link
            href="/student/login"
            className="mt-4 flex min-h-11 items-center justify-center rounded-md border border-border px-4 font-medium"
          >
            {studentAuth.loginAction}
          </Link>
        </main>
      </div>
    )
  }

  return <SignUpForm />
}

function SignUpForm() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{studentAuth.signUpTitle}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{studentAuth.signUpIntro}</p>

        <div className="mt-8">
          <AuthForm action={signUpAction} submitLabel={studentAuth.signUpAction} withName />
        </div>

        <p className="mt-6 text-sm text-foreground-muted">
          {studentAuth.haveAccount}{' '}
          <Link href="/student/login" className="text-accent underline">
            {studentAuth.goToLogin}
          </Link>
        </p>
      </main>
    </div>
  )
}
