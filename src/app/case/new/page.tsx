import type { Metadata } from 'next'
import Link from 'next/link'
import { getCities, getTreatmentTypes } from '@/lib/config'
import { caseForm, common, site } from '@/lib/copy'
import { CaseForm } from './case-form'

export const metadata: Metadata = { title: caseForm.title }

export default async function NewCasePage() {
  // Configuration is read on the server; the client component only receives the
  // options it needs to render.
  const [cities, treatmentTypes] = await Promise.all([getCities(), getTreatmentTypes()])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col px-4">
      <header className="py-6">
        <Link href="/" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{caseForm.title}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{caseForm.intro}</p>

        <div className="mt-8">
          <CaseForm cities={cities} treatmentTypes={treatmentTypes} />
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-foreground-muted underline">
          {common.backHome}
        </Link>
      </main>
    </div>
  )
}
