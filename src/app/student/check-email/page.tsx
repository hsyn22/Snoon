import type { Metadata } from 'next'
import Link from 'next/link'
import { site, studentAuth, studentStatus } from '@/lib/copy'

export const metadata: Metadata = { title: studentStatus.checkEmailTitle }

export default function CheckEmailPage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow">
        <section className="rounded-lg border border-border bg-accent-muted p-5">
          <h1 className="text-xl font-bold">{studentStatus.checkEmailTitle}</h1>
          <p className="mt-2 text-sm">{studentStatus.checkEmailBody}</p>
          <p className="mt-3 text-xs text-foreground-muted">{studentStatus.checkEmailSpam}</p>
        </section>

        <p className="mt-6 text-sm text-foreground-muted">{studentStatus.checkEmailAlready}</p>
        <Link
          href="/student/login"
          className="mt-3 flex min-h-11 items-center justify-center rounded-md border border-border px-4 font-medium"
        >
          {studentAuth.loginAction}
        </Link>
      </main>
    </div>
  )
}
