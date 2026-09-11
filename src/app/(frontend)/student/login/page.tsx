import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { studentAuth } from '@/lib/copy'
import { AuthForm } from '../auth-form'
import { loginAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.loginTitle }

export default function StudentLoginPage() {
  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentAuth.eyebrow}
          title={studentAuth.welcomeBack}
          lead={studentAuth.loginLead}
        />

        <AuthForm action={loginAction} submitLabel={studentAuth.loginAction} withName={false} />

        <p className="mt-6 text-sm text-foreground-muted">
          {studentAuth.noAccount}{' '}
          <Link href="/student/signup" className="font-bold text-accent underline">
            {studentAuth.goToSignUp}
          </Link>
        </p>
      </>
    </PageShell>
  )
}
