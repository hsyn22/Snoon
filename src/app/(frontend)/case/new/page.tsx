import type { Metadata } from 'next'
import Link from 'next/link'
import { getCities, getTreatmentTypes } from '@/lib/config'
import { Wordmark } from '@/components/brand/wordmark'
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
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-xl px-4 py-4">
          <Link href="/">
            <Wordmark className="text-accent" />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-xl grow px-4 pb-12 pt-8">
        <h1 className="text-2xl font-bold text-accent sm:text-3xl">{caseForm.title}</h1>
        <p className="mt-2 text-pretty text-sm text-foreground-muted">{caseForm.intro}</p>

        <div className="mt-7">
          <CaseForm cities={cities} treatmentTypes={treatmentTypes} />
        </div>

        <Link href="/" className="mt-8 inline-block text-sm text-foreground-muted underline">
          {common.backHome}
        </Link>
      </main>
    </div>
  )
}
