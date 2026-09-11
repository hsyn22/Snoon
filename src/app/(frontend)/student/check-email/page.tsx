import type { Metadata } from 'next'
import { PageShell } from '@/components/site-chrome'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { studentAuth, studentStatus } from '@/lib/copy'

export const metadata: Metadata = { title: studentStatus.checkEmailTitle }

export default function CheckEmailPage() {
  return (
    <PageShell>
      <>
        <Card tone="accent">
          <CardBody className="p-5">
            <h1 className="text-xl font-bold">{studentStatus.checkEmailTitle}</h1>
            <p className="mt-2 text-sm">{studentStatus.checkEmailBody}</p>
            <p className="mt-3 text-xs text-foreground-muted">{studentStatus.checkEmailSpam}</p>
          </CardBody>
        </Card>

        <p className="mt-6 text-sm text-foreground-muted">{studentStatus.checkEmailAlready}</p>
        <div className="mt-3">
          <ButtonLink href="/student/login" variant="secondary">
            {studentAuth.loginAction}
          </ButtonLink>
        </div>
      </>
    </PageShell>
  )
}
