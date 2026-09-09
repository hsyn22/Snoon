import type { Metadata } from 'next'
import Link from 'next/link'
import { studentAuth, site } from '@/lib/copy'
import { AuthForm } from '../auth-form'
import { signUpAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.signUpTitle }

export default function StudentSignUpPage() {
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
