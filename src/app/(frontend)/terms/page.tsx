import { LegalPage, legalMetadata } from '@/components/legal-page'
import { terms } from '@/lib/legal'

export const metadata = legalMetadata(terms.title)

export default function TermsPage() {
  return <LegalPage title={terms.title} intro={terms.intro} sections={terms.sections} />
}
