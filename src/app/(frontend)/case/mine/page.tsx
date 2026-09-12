import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { auth } from '@/lib/auth'
import { listCasesForPatient } from '@/db/queries/patient-cases'
import { getAllTreatmentTypes, getCityById } from '@/lib/config'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardRibbon, Chip, MetaRow, statusTone } from '@/components/ui/card'
import { CalendarIcon, PinIcon } from '@/components/ui/icon'
import { caseStatus, caseTracking, patientAccount } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { isGoogleConfigured } from '@/lib/oauth'
import { PatientSignIn } from './patient-sign-in'
import { patientSignOutAction } from './actions'

/**
 * A patient's own cases.
 *
 * Optional, and that is the whole design: a case is submitted, a link is issued,
 * and that is the product. This page exists for someone who would rather not
 * depend on a link.
 *
 * No contact details on it. `listCasesForPatient` has no phone column in its
 * projection — a patient knows their own number, and a column that is never
 * selected is a column that cannot leak through this path later.
 *
 * Never indexed and never cached: it is a list of someone's dental cases.
 */
export const metadata: Metadata = {
  title: patientAccount.title,
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function MyCasesPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return (
      <PageShell>
        <>
          <PageHeader
            eyebrow={patientAccount.eyebrow}
            title={patientAccount.optionalTitle}
            lead={patientAccount.optionalBody}
          />
          {isGoogleConfigured() ? (
            <PatientSignIn />
          ) : (
            <p className="text-sm text-foreground-muted">{patientAccount.emptyBody}</p>
          )}
          {/* The way in for the far more common patient: no account, a lost
              link, and a case they think has been forgotten. */}
          <div className="mt-6">
            <ButtonLink href="/case/find" variant="quiet" className="text-sm">
              {caseTracking.recoverLink}
            </ButtonLink>
          </div>
        </>
      </PageShell>
    )
  }

  const [rows, treatments] = await Promise.all([
    listCasesForPatient(session.user.id),
    getAllTreatmentTypes(),
  ])
  const cities = new Map(
    await Promise.all(
      [...new Set(rows.map((row) => row.cityId))].map(
        async (id) => [id, (await getCityById(id))?.nameAr ?? id] as const,
      ),
    ),
  )

  return (
    <PageShell
      action={
        <form action={patientSignOutAction}>
          <button type="submit" className="text-sm text-foreground-muted underline">
            {patientAccount.signOut}
          </button>
        </form>
      }
    >
      <>
        <PageHeader
          eyebrow={patientAccount.eyebrow}
          title={patientAccount.title}
          lead={patientAccount.lead}
        />

        {rows.length === 0 ? (
          <Card>
            <CardBody className="p-5">
              <h2 className="font-bold">{patientAccount.emptyTitle}</h2>
              <p className="mt-2 text-sm text-foreground-muted">{patientAccount.emptyBody}</p>
              <div className="mt-4">
                <ButtonLink href="/case/new">{patientAccount.submitCase}</ButtonLink>
              </div>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-4">
            {rows.map((row) => (
              <Card key={row.id}>
                <CardRibbon label={caseStatus[row.status]} tone={statusTone[row.status]} />
                <CardBody>
                  <p className="text-xs text-foreground-muted">
                    {caseTracking.referenceLabel}{' '}
                    <span className="reference-code font-bold text-foreground">
                      {row.referenceCode}
                    </span>
                  </p>

                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {row.treatmentTypeIds.map((id) => {
                      const name = treatments.find((t) => t.id === id)?.nameAr ?? id
                      return (
                        <li key={id}>
                          <Chip>{name}</Chip>
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-3 space-y-1.5">
                    <MetaRow icon={<PinIcon />} label={caseTracking.cityLabel}>
                      {cities.get(row.cityId) ?? row.cityId}
                    </MetaRow>
                    <MetaRow icon={<CalendarIcon />} label={caseTracking.submittedAtLabel}>
                      <span className="text-foreground-muted">{formatCaseDate(row.createdAt)}</span>
                    </MetaRow>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}

        {/* Said once, where somebody would reasonably wonder why an old case
            stopped appearing. */}
        <p className="mt-6 text-xs text-foreground-muted">{patientAccount.retentionNote}</p>
      </>
    </PageShell>
  )
}
