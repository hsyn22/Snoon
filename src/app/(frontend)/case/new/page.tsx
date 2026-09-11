import type { Metadata } from 'next'
import { getCities, getTreatmentTypes } from '@/lib/config'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { caseForm, common } from '@/lib/copy'
import { CaseForm } from './case-form'

export const metadata: Metadata = { title: caseForm.title }

/**
 * The city and treatment lists come from Payload, so this page cannot be baked
 * once at build time — an admin adding a city would see nothing change until the
 * next deployment. Re-generated at most every five minutes instead: the page
 * stays pre-rendered and fast for a patient on a slow connection, and a config
 * edit appears without a deploy.
 */
export const revalidate = 300

export default async function NewCasePage() {
  // Configuration is read on the server; the client component only receives the
  // options it needs to render.
  const [cities, treatmentTypes] = await Promise.all([getCities(), getTreatmentTypes()])

  return (
    <PageShell>
      <>
        {/* A question a person would ask, not the name of a form. This is the
            single cheapest thing that stops the page reading as paperwork — and
            the lead underneath answers what a patient is actually worried about,
            which is who ends up with their phone number. */}
        <PageHeader eyebrow={caseForm.eyebrow} title={caseForm.title} lead={caseForm.intro} />

        <CaseForm cities={cities} treatmentTypes={treatmentTypes} />

        <div className="mt-8">
          <ButtonLink href="/" variant="quiet" className="text-sm">
            {common.backHome}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}
