import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { studentAuth, studentSignUpClosed } from '@/lib/copy'
import { isEmailConfigured } from '@/lib/email'
import { isGoogleConfigured } from '@/lib/oauth'
import { AuthForm } from '../auth-form'
import { GoogleButton, AuthDivider } from '../google-button'
import { signUpAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.signUpTitle }

/** Whether sign-up can work depends on the runtime environment, not the build. */
export const dynamic = 'force-dynamic'

/**
 * Three states, because two independent things can each be missing.
 *
 * Password sign-up needs a verification email to be deliverable — without one it
 * writes an account nobody can ever verify or log into, which is why
 * `signUpAction` refuses it outright. Google sign-up needs neither: Google has
 * already verified the address, so there is no message to send.
 *
 * That makes "Google configured, email not" a real and currently likely state,
 * and the one that matters most: it is the difference between registration being
 * open and سنون waiting on a domain.
 */
export default function StudentSignUpPage() {
  const google = isGoogleConfigured()
  const email = isEmailConfigured()

  if (!google && !email) {
    return (
      <PageShell>
        <Card>
          <CardBody className="p-5">
            <h1 className="text-xl font-bold">{studentSignUpClosed.title}</h1>
            <p className="mt-2 text-sm text-foreground-muted">{studentSignUpClosed.body}</p>
          </CardBody>
        </Card>
        <div className="mt-4">
          <ButtonLink href="/student/login" variant="secondary">
            {studentAuth.loginAction}
          </ButtonLink>
        </div>
      </PageShell>
    )
  }

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentAuth.eyebrow}
          title={studentAuth.signUpTitle}
          lead={studentAuth.signUpIntro}
        />

        {google ? <GoogleButton /> : null}
        {google && email ? <AuthDivider /> : null}

        {email ? (
          <AuthForm action={signUpAction} submitLabel={studentAuth.signUpAction} withName />
        ) : (
          // Say why the fields are absent. A form that is simply missing reads as
          // a broken page, and a student who came expecting a password will look
          // for it rather than press the button that works.
          <p className="mt-6 text-sm text-foreground-muted">{studentAuth.passwordSignUpClosed}</p>
        )}

        <p className="mt-6 text-sm text-foreground-muted">
          {studentAuth.haveAccount}{' '}
          <Link href="/student/login" className="font-bold text-accent underline">
            {studentAuth.goToLogin}
          </Link>
        </p>
      </>
    </PageShell>
  )
}
