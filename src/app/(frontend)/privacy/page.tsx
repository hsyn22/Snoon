import { LegalPage, legalMetadata } from '@/components/legal-page'
import { privacy } from '@/lib/legal'

export const metadata = legalMetadata(privacy.title)

export default function PrivacyPage() {
  return <LegalPage title={privacy.title} intro={privacy.intro} sections={privacy.sections} />
}
