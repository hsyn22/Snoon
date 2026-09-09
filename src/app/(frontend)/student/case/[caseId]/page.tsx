import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { getCaseForClaimant } from '@/db/queries/cases'
import { auth } from '@/lib/auth'
import { getAllTreatmentTypes } from '@/lib/config'
import { caseForm, site, studentClaim } from '@/lib/copy'
import { formatCaseDateTime } from '@/lib/dates'
import { formatPhoneForDisplay } from '@/lib/phone'

export const metadata: Metadata = {
  title: studentClaim.title,
  // Contact details. Never indexed, never cached.
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

/**
 * The claimant's view of a case — the only screen in the product that shows a
 * patient's phone number to a student.
 *
 * Authorisation is `getCaseForClaimant`, which joins to an ACTIVE claim by this
 * student. There is no argument combination that yields contact details to
 * anyone else, so a student who lost the case to the contact window sees the
 * not-found panel rather than a stale phone number.
 */
export default async function ClaimedCasePage({
  params,
}: {
  params: Promise<{ caseId: string }>
}) {
  const { caseId } = await params

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const record = await getCaseForClaimant(caseId, student.id)

  if (!record) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4">
        <h1 className="text-2xl font-bold">{studentClaim.notFoundTitle}</h1>
        <p className="mt-2 text-foreground-muted">{studentClaim.notFoundBody}</p>
        <Link href="/student" className="mt-6 text-sm text-accent underline">
          {studentClaim.backToQueue}
        </Link>
      </main>
    )
  }

  const treatments = await getAllTreatmentTypes()
  const treatmentNames = record.treatmentTypeIds
    .map((id) => treatments.find((t) => t.id === id)?.nameAr ?? id)
    .join('، ')
  const days = record.availabilityDays
    .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
    .map((day) => caseForm.weekDays[day])
    .join('، ')

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/student" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-xl font-bold">{studentClaim.title}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{studentClaim.intro}</p>

        <section
          className={`mt-4 rounded-lg border p-4 ${
            record.isPastContactDeadline ? 'border-danger' : 'border-border bg-accent-muted'
          }`}
        >
          <p className="text-xs text-foreground-muted">{studentClaim.deadlineLabel}</p>
          <p className="mt-1 text-sm font-medium">
            {record.isPastContactDeadline
              ? studentClaim.deadlinePassed
              : formatCaseDateTime(record.contactDeadlineAt)}
          </p>
          <p className="mt-2 text-xs text-foreground-muted">{studentClaim.deadlineHint}</p>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{studentClaim.phoneLabel}</p>
          {/* tel: so one tap dials — this screen exists to produce a phone call. */}
          <a
            href={`tel:${record.patientPhone}`}
            className="ltr-run mt-1 block text-2xl font-bold text-accent"
          >
            {formatPhoneForDisplay(record.patientPhone)}
          </a>
          <p className="mt-3 text-xs font-medium text-warning">{studentClaim.phonePrivacy}</p>
        </section>

        <dl className="mt-4 rounded-lg border border-border bg-surface px-4">
          <Row label={studentClaim.nameLabel} value={record.patientName} />
          <Row label={studentClaim.treatmentsLabel} value={treatmentNames} />
          <Row label={studentClaim.daysLabel} value={days} />
          {record.notes ? <Row label={studentClaim.notesLabel} value={record.notes} /> : null}
        </dl>

        <Link href="/student" className="mt-6 inline-block text-sm text-foreground-muted underline">
          {studentClaim.backToQueue}
        </Link>
      </main>
    </div>
  )
}
