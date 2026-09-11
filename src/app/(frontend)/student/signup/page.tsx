import type { Metadata } from 'next'
import Link from 'next/link'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { studentAuth, studentSignUpClosed } from '@/lib/copy'
import { isEmailConfigured } from '@/lib/email'
import { AuthForm } from '../auth-form'
import { signUpAction } from '../actions'

export const metadata: Metadata = { title: studentAuth.signUpTitle }

/** Whether sign-up can work depends on the runtime environment, not the build. */
export const dynamic = 'force-dynamic'

export default function StudentSignUpPage() {
  // No email provider means no verification link, and an unverifiable account is
  // worse than no account. Say so instead of showing a form that cannot work.
  if (!isEmailConfigured()) {
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

  return <SignUpForm />
}

function SignUpForm() {
  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentAuth.eyebrow}
          title={studentAuth.signUpTitle}
          lead={studentAuth.signUpIntro}
        />

        <AuthForm action={signUpAction} submitLabel={studentAuth.signUpAction} withName />

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
