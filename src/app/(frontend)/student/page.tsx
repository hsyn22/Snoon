import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { db } from '@/db'
import { students } from '@/db/schema'
import { getActiveClaimForStudent } from '@/db/queries/claims'
import { auth } from '@/lib/auth'
import { site, studentAuth, studentClaim, studentStatus } from '@/lib/copy'
import { logoutAction } from './actions'
import { CaseQueue } from './case-queue'

export const metadata: Metadata = { title: studentAuth.loginTitle }

/** Session state is read per request; nothing about a student is cached. */
export const dynamic = 'force-dynamic'

function Panel({
  title,
  body,
  note,
  action,
}: {
  title: string
  body: string
  note?: string
  action?: { href: string; label: string }
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5">
      <h1 className="text-xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-foreground-muted">{body}</p>
      {note ? <p className="mt-3 text-xs text-foreground-muted">{note}</p> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-foreground"
        >
          {action.label}
        </Link>
      ) : null}
    </section>
  )
}

export default async function StudentHomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
        <header className="py-6">
          <Link href="/" className="text-sm text-foreground-muted">
            {site.name}
          </Link>
        </header>
        <main id="main" className="grow space-y-3">
          <h1 className="text-2xl font-bold">{studentAuth.loginTitle}</h1>
          <Link
            href="/student/login"
            className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-foreground"
          >
            {studentAuth.loginAction}
          </Link>
          <Link
            href="/student/signup"
            className="flex min-h-11 items-center justify-center rounded-md border border-border px-4 font-medium"
          >
            {studentAuth.signUpAction}
          </Link>
        </main>
      </div>
    )
  }

  // Logging in is not the same as being allowed to see cases. The verification
  // status below is read from the database, never inferred from the session.
  const [profile] = await db
    .select({
      id: students.id,
      collegeId: students.collegeId,
      stageId: students.stageId,
      verificationStatus: students.verificationStatus,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  // A student holds at most one case at a time, and the case they hold matters
  // more than the queue: someone is waiting for their call.
  const activeClaim = profile ? await getActiveClaimForStudent(profile.id) : null

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="flex items-center justify-between py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-foreground-muted underline">
            {studentAuth.logout}
          </button>
        </form>
      </header>

      <main id="main" className="grow pb-10">
        {!session.user.emailVerified ? (
          <Panel
            title={studentStatus.checkEmailTitle}
            body={studentStatus.checkEmailBody}
            note={session.user.email}
          />
        ) : !profile ? (
          <Panel
            title={studentStatus.profileNeededTitle}
            body={studentStatus.profileNeededBody}
            action={{ href: '/student/profile', label: studentStatus.profileNeededAction }}
          />
        ) : profile.verificationStatus === 'PENDING' ? (
          <Panel title={studentStatus.pendingTitle} body={studentStatus.pendingBody} />
        ) : profile.verificationStatus === 'REJECTED' ? (
          <Panel title={studentStatus.rejectedTitle} body={studentStatus.rejectedBody} />
        ) : profile.verificationStatus === 'SUSPENDED' ? (
          <Panel title={studentStatus.suspendedTitle} body={studentStatus.suspendedBody} />
        ) : activeClaim ? (
          <section className="rounded-lg border border-border bg-accent-muted p-5">
            <h1 className="text-xl font-bold">{studentClaim.title}</h1>
            <p className="mt-2 text-sm">{studentClaim.intro}</p>
            <Link
              href={`/student/case/${activeClaim.caseId}`}
              className="mt-4 flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-medium text-accent-foreground"
            >
              {studentClaim.title}
            </Link>
          </section>
        ) : (
          <CaseQueue
            studentId={profile.id}
            collegeId={profile.collegeId}
            stageId={profile.stageId}
          />
        )}
      </main>
    </div>
  )
}
