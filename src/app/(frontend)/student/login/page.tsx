import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { studentAuth } from '@/lib/copy'
import { isGoogleConfigured } from '@/lib/oauth'
import { AuthForm } from '../auth-form'
import { GoogleButton, AuthDivider } from '../google-button'
import { loginAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.loginTitle }

/** Whether Google is available is a property of the running deployment, not of
 *  the build, so this page cannot be baked once. */
export const dynamic = 'force-dynamic'

export default function StudentLoginPage() {
  const google = isGoogleConfigured()

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentAuth.eyebrow}
          title={studentAuth.welcomeBack}
          lead={studentAuth.loginLead}
        />

        {/* Above the fields, not below them: for most students this is the way
            they got in, and making them scroll past a password box they never
            set is how a returning visitor ends up on the reset flow. */}
        {google ? (
          <>
            <GoogleButton />
            <AuthDivider />
          </>
        ) : null}

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
