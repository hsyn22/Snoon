import type { Metadata } from 'next'
import { headers } from 'next/headers'
import Link from 'next/link'
import { getCaseByTrackingToken } from '@/db/queries/cases'
import { getCityById, getTreatmentTypes } from '@/lib/config'
import { caseForm, caseStatus, caseTracking, common, site } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { formatPhoneForDisplay } from '@/lib/phone'

/**
 * The patient's view of their own case, opened by the tracking token in the URL.
 *
 * Never cached and never indexed: the URL is the credential, so a cached copy or
 * a search-engine crawl of it would leak the case.
 */
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: caseTracking.statusLabel,
  robots: { index: false, follow: false, nocache: true },
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="border-b border-border py-3 last:border-b-0">
      <dt className="text-xs text-foreground-muted">{label}</dt>
      <dd className="mt-1 text-sm text-foreground">{value}</dd>
    </div>
  )
}

export default async function TrackCasePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ new?: string }>
}) {
  const { token } = await params
  const { new: isNew } = await searchParams

  const record = await getCaseByTrackingToken(token)

  if (!record) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center px-4">
        <h1 className="text-2xl font-bold">{caseTracking.invalidTitle}</h1>
        <p className="mt-2 text-foreground-muted">{caseTracking.invalidBody}</p>
        <Link href="/" className="mt-6 text-sm text-accent underline">
          {common.backHome}
        </Link>
      </main>
    )
  }

  const [city, allTreatments] = await Promise.all([getCityById(record.cityId), getTreatmentTypes()])

  // Resolve the stored IDs to Arabic names, keeping any unknown ID visible
  // rather than silently dropping a treatment the patient asked for.
  const treatments = record.treatmentTypeIds
    .map((id) => allTreatments.find((treatment) => treatment.id === id)?.nameAr ?? id)
    .join('، ')

  const headerList = await headers()
  const host = headerList.get('host') ?? ''
  const protocol = headerList.get('x-forwarded-proto') ?? 'http'
  const trackingUrl = `${protocol}://${host}/case/track/${token}`

  const days = record.availabilityDays
    .filter((day): day is keyof typeof caseForm.weekDays => day in caseForm.weekDays)
    .map((day) => caseForm.weekDays[day])
    .join('، ')

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        {isNew ? (
          <section className="rounded-lg border border-border bg-accent-muted p-4">
            <h1 className="text-xl font-bold">{caseTracking.successTitle}</h1>
            <p className="mt-2 text-sm">{caseTracking.successBody}</p>
          </section>
        ) : (
          <h1 className="text-xl font-bold">{caseTracking.statusLabel}</h1>
        )}

        <section className="mt-6 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{caseTracking.referenceLabel}</p>
          <p className="reference-code mt-1 text-2xl font-bold">{record.referenceCode}</p>
          <p className="mt-2 text-xs text-foreground-muted">{caseTracking.referenceHint}</p>
        </section>

        <section className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs text-foreground-muted">{caseTracking.linkLabel}</p>
          {/* break-all so a long token wraps instead of forcing the page to
              scroll sideways on a narrow phone. */}
          <p className="ltr-run mt-1 block break-all text-xs text-foreground">{trackingUrl}</p>
          <p className="mt-2 text-xs text-foreground-muted">{caseTracking.linkHint}</p>
          <p className="mt-2 text-xs font-medium text-warning">{caseTracking.linkWarning}</p>
        </section>

        <dl className="mt-6 rounded-lg border border-border bg-surface px-4">
          <Row label={caseTracking.statusLabel} value={caseStatus[record.status]} />
          <Row label={caseTracking.cityLabel} value={city?.nameAr ?? record.cityId} />
          <Row label={caseTracking.treatmentLabel} value={treatments} />
          <Row label={caseTracking.daysLabel} value={days} />
          <Row label={caseTracking.nameLabel} value={record.patientName} />
          <Row
            label={caseTracking.phoneLabel}
            value={<span className="ltr-run">{formatPhoneForDisplay(record.patientPhone)}</span>}
          />
          {record.notes ? <Row label={caseTracking.notesLabel} value={record.notes} /> : null}
          {/* No direction wrapper: formatCaseDate spells the month in Arabic, so
              the string is naturally RTL. Forcing LTR here is what scrambled it. */}
          <Row label={caseTracking.submittedAtLabel} value={formatCaseDate(record.createdAt)} />
        </dl>
      </main>
    </div>
  )
}
