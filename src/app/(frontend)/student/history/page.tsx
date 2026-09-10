import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { countTreatedCasesForStudent, listCaseHistoryForStudent } from '@/db/queries/claims'
import { auth } from '@/lib/auth'
import { CASE_REASON } from '@/lib/cases/reasons'
import { getAllTreatmentTypes } from '@/lib/config'
import { site, studentClaim, studentHistory } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'

/**
 * A student's own record of the cases they have held.
 *
 * Contains no contact details and cannot: `listCaseHistoryForStudent` has no
 * such column in its projection. The grant of a patient's name and number was
 * for the active claim, and a student who finished a case last month has no more
 * claim on that number than anyone else.
 */
export const metadata: Metadata = {
  title: studentHistory.title,
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function StudentHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const [entries, treated, treatments] = await Promise.all([
    listCaseHistoryForStudent(student.id),
    countTreatedCasesForStudent(student.id),
    getAllTreatmentTypes(),
  ])

  const nameOf = (id: string) => treatments.find((t) => t.id === id)?.nameAr ?? id

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/student" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-xl font-bold">{studentHistory.title}</h1>
        <p className="mt-1 text-sm text-foreground-muted">{studentHistory.intro}</p>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-foreground-muted">{studentHistory.treatedLabel}</p>
            {/* Western digits inside Arabic need their own run or they re-order. */}
            <p className="ltr-run mt-1 text-2xl font-bold">{treated}</p>
          </div>
          <div className="rounded-lg border border-border bg-surface p-4">
            <p className="text-xs text-foreground-muted">{studentHistory.totalLabel}</p>
            <p className="ltr-run mt-1 text-2xl font-bold">{entries.length}</p>
          </div>
        </div>

        {entries.length === 0 ? (
          <section className="mt-4 rounded-lg border border-border bg-surface p-5">
            <h2 className="font-semibold">{studentHistory.emptyTitle}</h2>
            <p className="mt-2 text-sm text-foreground-muted">{studentHistory.emptyBody}</p>
          </section>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => {
              // A claim closed as COMPLETED can mean two different things: the
              // case is finished, or this student did their stage's share and
              // handed the rest on. Both are treated cases; only one is an end.
              const handedOn = entry.releaseReason === CASE_REASON.PART_COMPLETED

              return (
                <article
                  key={entry.claimId}
                  className="rounded-lg border border-border bg-surface p-4"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="reference-code text-sm font-bold">{entry.referenceCode}</p>
                    <p className="text-xs font-medium">
                      {handedOn
                        ? studentHistory.handedOn
                        : studentHistory.outcome[entry.claimStatus]}
                    </p>
                  </div>

                  <dl className="mt-3 space-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-foreground-muted">{studentHistory.treatments}</dt>
                      <dd>{entry.treatmentTypeIds.map(nameOf).join('، ')}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-foreground-muted">{studentHistory.claimedAt}</dt>
                      <dd className="text-foreground-muted">{formatCaseDate(entry.claimedAt)}</dd>
                    </div>
                    {entry.closedAt ? (
                      <div>
                        <dt className="text-xs text-foreground-muted">{studentHistory.closedAt}</dt>
                        <dd className="text-foreground-muted">{formatCaseDate(entry.closedAt)}</dd>
                      </div>
                    ) : null}
                  </dl>

                  {entry.claimStatus === 'ACTIVE' ? (
                    <Link
                      href={`/student/case/${entry.caseId}`}
                      className="mt-3 inline-block text-sm text-accent underline"
                    >
                      {studentClaim.title}
                    </Link>
                  ) : null}
                </article>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-foreground-muted">{studentHistory.note}</p>

        <Link href="/student" className="mt-6 inline-block text-sm text-foreground-muted underline">
          {studentClaim.backToQueue}
        </Link>
      </main>
    </div>
  )
}
