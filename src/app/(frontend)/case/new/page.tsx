import type { Metadata } from 'next'
import { getCities, getTreatmentTypes } from '@/lib/config'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { caseForm, common, fees } from '@/lib/copy'
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
        {/* The other half of the shared-element transition. The landing page's
            primary button carries the same `data-flip-id`, so on a capable
            phone the button grows into this block rather than the page cutting
            to it. Inert everywhere else — it is one attribute. */}
        <div data-flip-id="case-entry">
          <PageHeader eyebrow={caseForm.eyebrow} title={caseForm.title} lead={caseForm.intro} />
        </div>

        {/* What it costs, above the form rather than after it. Somebody filling
            this in is deciding whether to go; finding out about a fee on the
            other side of a submit button is how a person arrives at a clinic
            expecting free treatment and is asked for money. Same string as the
            landing page and the FAQ — three wordings would drift, and the one
            that drifts is the one somebody reads. */}
        <p className="mb-6 text-pretty rounded-lg border border-warm/40 bg-warm-muted px-4 py-3 text-sm">
          {fees.long}
        </p>

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
