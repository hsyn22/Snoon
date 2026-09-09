import type { Metadata } from 'next'
import Link from 'next/link'
import { studentAuth, site } from '@/lib/copy'
import { AuthForm } from '../auth-form'
import { loginAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.loginTitle }

export default function StudentLoginPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{studentAuth.loginTitle}</h1>

        <div className="mt-8">
          <AuthForm action={loginAction} submitLabel={studentAuth.loginAction} withName={false} />
        </div>

        <p className="mt-6 text-sm text-foreground-muted">
          {studentAuth.noAccount}{' '}
          <Link href="/student/signup" className="text-accent underline">
            {studentAuth.goToSignUp}
          </Link>
        </p>
      </main>
    </div>
  )
}
