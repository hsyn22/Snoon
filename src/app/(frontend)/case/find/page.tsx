import type { Metadata } from 'next'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { caseRecovery, common } from '@/lib/copy'
import { FindCaseForm } from './find-form'

/**
 * "I lost my link."
 *
 * A patient needs no account, so the tracking link is the only thing that opens
 * their case — and losing it used to mean ringing an admin, which most people
 * would not do. They would simply assume سنون had forgotten them.
 *
 * Not indexed: nothing here is secret, but a search engine sending people to a
 * form that asks for a phone number is not a page we want ranking.
 */
export const metadata: Metadata = {
  title: caseRecovery.title,
  robots: { index: false, follow: false },
}

export default function FindCasePage() {
  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={caseRecovery.eyebrow}
          title={caseRecovery.title}
          lead={caseRecovery.lead}
        />

        <FindCaseForm />

        <div className="mt-8">
          <ButtonLink href="/" variant="quiet" className="text-sm">
            {common.backHome}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}
