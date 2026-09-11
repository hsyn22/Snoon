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
import { studentClaim, studentHistory } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardRibbon, Chip, MetaRow } from '@/components/ui/card'
import { CalendarIcon, CheckIcon, ClockIcon } from '@/components/ui/icon'

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
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentHistory.eyebrow}
          title={studentHistory.title}
          lead={studentHistory.intro}
        />

        {/* The two numbers a student's college actually asks them for, big
            enough to read without looking. ClinMatch puts the same shape at the
            top of their program dashboard and it is the right one. */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardBody>
              <p className="text-xs text-foreground-muted">{studentHistory.treatedLabel}</p>
              {/* Western digits inside Arabic need their own run or they re-order. */}
              <p className="ltr-run mt-1 text-3xl font-bold text-accent">{treated}</p>
            </CardBody>
          </Card>
          <Card>
            <CardBody>
              <p className="text-xs text-foreground-muted">{studentHistory.totalLabel}</p>
              <p className="ltr-run mt-1 text-3xl font-bold">{entries.length}</p>
            </CardBody>
          </Card>
        </div>

        {entries.length === 0 ? (
          <Card className="mt-4">
            <CardBody className="p-5">
              <h2 className="font-bold">{studentHistory.emptyTitle}</h2>
              <p className="mt-2 text-sm text-foreground-muted">{studentHistory.emptyBody}</p>
            </CardBody>
          </Card>
        ) : (
          <div className="mt-4 space-y-3">
            {entries.map((entry) => {
              // A claim closed as COMPLETED can mean two different things: the
              // case is finished, or this student did their stage's share and
              // handed the rest on. Both are treated cases; only one is an end.
              const handedOn = entry.releaseReason === CASE_REASON.PART_COMPLETED

              return (
                <Card key={entry.claimId}>
                  <CardRibbon
                    label={
                      handedOn ? studentHistory.handedOn : studentHistory.outcome[entry.claimStatus]
                    }
                    tone={
                      entry.claimStatus === 'ACTIVE'
                        ? 'accent'
                        : entry.claimStatus === 'COMPLETED'
                          ? 'positive'
                          : 'neutral'
                    }
                  />
                  <CardBody>
                    <p className="reference-code text-sm font-bold">{entry.referenceCode}</p>

                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {entry.treatmentTypeIds.map(nameOf).map((name) => (
                        <li key={name}>
                          <Chip icon={<CheckIcon className="size-3.5" />}>{name}</Chip>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-3 space-y-1.5">
                      <MetaRow icon={<CalendarIcon />} label={studentHistory.claimedAt}>
                        <span className="text-foreground-muted">
                          {formatCaseDate(entry.claimedAt)}
                        </span>
                      </MetaRow>
                      {entry.closedAt ? (
                        <MetaRow icon={<ClockIcon />} label={studentHistory.closedAt}>
                          <span className="text-foreground-muted">
                            {formatCaseDate(entry.closedAt)}
                          </span>
                        </MetaRow>
                      ) : null}
                    </div>

                    {entry.claimStatus === 'ACTIVE' ? (
                      <Link
                        href={`/student/case/${entry.caseId}`}
                        className="mt-3 inline-block text-sm font-bold text-accent underline"
                      >
                        {studentClaim.title}
                      </Link>
                    ) : null}
                  </CardBody>
                </Card>
              )
            })}
          </div>
        )}

        <p className="mt-6 text-xs text-foreground-muted">{studentHistory.note}</p>

        <div className="mt-6">
          <ButtonLink href="/student" variant="quiet" className="text-sm">
            {studentClaim.backToQueue}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}
