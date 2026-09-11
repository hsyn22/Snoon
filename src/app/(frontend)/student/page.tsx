import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/db'
import { students } from '@/db/schema'
import { getActiveClaimForStudent } from '@/db/queries/claims'
import { auth } from '@/lib/auth'
import {
  studentAuth,
  studentClaim,
  studentHistory,
  studentStatus,
  studentTelegram,
} from '@/lib/copy'
import { Card, CardBody } from '@/components/ui/card'
import { ButtonLink } from '@/components/ui/button'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { isTelegramConfigured } from '@/lib/telegram/config'
import { isSubjectLinked } from '@/db/queries/telegram'
import { TelegramLink } from './telegram-link'
import { logoutAction } from './actions'
import { CaseQueue } from './case-queue'

export const metadata: Metadata = { title: studentAuth.loginTitle }

/** Session state is read per request; nothing about a student is cached. */
export const dynamic = 'force-dynamic'

/** Where a student stands, when it is not yet a queue: waiting on email, on a
 *  profile, on an admin. One card, one sentence, and the one thing to do next. */
function Panel({
  title,
  body,
  note,
  action,
}: {
  title: string
  body: string
  note?: string
  action?: { href: string; label: string }
}) {
  return (
    <Card>
      <CardBody className="p-5">
        <h1 className="text-xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-foreground-muted">{body}</p>
        {note ? <p className="mt-3 text-xs text-foreground-muted">{note}</p> : null}
        {action ? (
          <div className="mt-4">
            <ButtonLink href={action.href}>{action.label}</ButtonLink>
          </div>
        ) : null}
      </CardBody>
    </Card>
  )
}

export default async function StudentHomePage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return (
      <PageShell>
        <PageHeader
          eyebrow={studentAuth.eyebrow}
          title={studentAuth.loginTitle}
          lead={studentAuth.loginLead}
        />
        <div className="space-y-3">
          <ButtonLink href="/student/login">{studentAuth.loginAction}</ButtonLink>
          <ButtonLink href="/student/signup" variant="secondary">
            {studentAuth.signUpAction}
          </ButtonLink>
        </div>
      </PageShell>
    )
  }

  // Logging in is not the same as being allowed to see cases. The verification
  // status below is read from the database, never inferred from the session.
  const [profile] = await db
    .select({
      id: students.id,
      collegeId: students.collegeId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  // A student holds at most one case at a time, and the case they hold matters
  // more than the queue: someone is waiting for their call.
  const activeClaim = profile ? await getActiveClaimForStudent(profile.id) : null

  // The bot is offered for two reasons: notifications, and — more usefully —
  // sending the enrolment document without a web file picker.
  const telegramAvailable = isTelegramConfigured()
  const telegramLinked = telegramAvailable && profile ? await isSubjectLinked({ type: 'STUDENT', id: profile.id }) : false
  const needsDocument = Boolean(profile) && !profile?.verificationDocumentPath

  return (
    <PageShell
      width="wide"
      action={
        <form action={logoutAction}>
          <button type="submit" className="text-sm text-foreground-muted underline">
            {studentAuth.logout}
          </button>
        </form>
      }
    >
      <>
        {!session.user.emailVerified ? (
          <Panel
            title={studentStatus.checkEmailTitle}
            body={studentStatus.checkEmailBody}
            note={session.user.email}
          />
        ) : !profile ? (
          <Panel
            title={studentStatus.profileNeededTitle}
            body={studentStatus.profileNeededBody}
            action={{ href: '/student/profile', label: studentStatus.profileNeededAction }}
          />
        ) : profile.verificationStatus === 'PENDING' ? (
          <>
            <Panel
              title={
                needsDocument ? studentTelegram.documentMissingTitle : studentStatus.pendingTitle
              }
              body={needsDocument ? studentTelegram.documentMissingBody : studentStatus.pendingBody}
            />
            {needsDocument ? (
              <div className="mt-3">
                <ButtonLink href="/student/profile/document" variant="secondary" className="text-sm">
                  {studentStatus.uploadOnSite}
                </ButtonLink>
              </div>
            ) : null}
          </>
        ) : profile.verificationStatus === 'REJECTED' ? (
          <Panel title={studentStatus.rejectedTitle} body={studentStatus.rejectedBody} />
        ) : profile.verificationStatus === 'SUSPENDED' ? (
          <Panel title={studentStatus.suspendedTitle} body={studentStatus.suspendedBody} />
        ) : activeClaim ? (
          <Card tone="accent">
            <CardBody className="p-5">
              <h1 className="text-xl font-bold">{studentClaim.title}</h1>
              <p className="mt-2 text-sm">{studentClaim.intro}</p>
              <div className="mt-4">
                <ButtonLink href={`/student/case/${activeClaim.caseId}`}>
                  {studentClaim.title}
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ) : (
          <CaseQueue
            studentId={profile.id}
            collegeId={profile.collegeId}
            stageId={profile.stageId}
            clinicDays={profile.clinicDays}
          />
        )}
        {/* Only once verified: before that there is nothing to have a record of,
            and the student has a more pressing step in front of them. */}
        {profile?.verificationStatus === 'VERIFIED' ? (
          <div className="mt-4">
            <ButtonLink href="/student/history" variant="secondary" className="text-sm">
              {studentHistory.link}
            </ButtonLink>
          </div>
        ) : null}

        {telegramAvailable && !telegramLinked && profile ? (
          <TelegramLink needsDocument={needsDocument} />
        ) : null}

        {telegramLinked ? (
          <p className="mt-4 text-xs text-foreground-muted">{studentTelegram.linked}</p>
        ) : null}
      </>
    </PageShell>
  )
}
