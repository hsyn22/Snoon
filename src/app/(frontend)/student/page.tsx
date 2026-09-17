import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/db'
import { students } from '@/db/schema'
import { listActiveClaimsForStudent } from '@/db/queries/claims'
import { auth } from '@/lib/auth'
import {
  studentActiveClaims,
  studentAuth,
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

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
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
      universityId: students.universityId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  /*
   * The cases this student is holding. They are listed *above* the queue rather
   * than instead of it.
   *
   * The page used to read `activeClaim ? <the case> : <the queue>`, so a student
   * who claimed one case watched every other case vanish — which Haider hit
   * within a day of the site going up, and reasonably read as سنون breaking. The
   * cap on how many a student may hold is real and now lives where a rule has to
   * live: `claimCaseForStudent`, checked on the site and in the bot alike. What
   * it switches off is the claim button, with a sentence saying why.
   */
  const activeClaims = profile ? await listActiveClaimsForStudent(profile.id) : []

  // The queue's filter lives in the query string, so it survives a reload, can
  // be shared, and needs no JavaScript to apply. It is handed over raw: the
  // queue knows this student's scope and is the only thing that can say which
  // values are theirs to filter by.
  const params = await searchParams

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
        ) : (
          <>
            {activeClaims.length > 0 ? (
              <Card tone="accent" className="mb-4">
                <CardBody className="p-5">
                  <h1 className="text-xl font-bold">
                    {activeClaims.length === 1
                      ? studentActiveClaims.one
                      : studentActiveClaims.title}
                  </h1>
                  <p className="mt-2 text-sm">{studentActiveClaims.intro}</p>
                  <ul className="mt-4 space-y-2">
                    {activeClaims.map((claim) => (
                      <li key={claim.id}>
                        <ButtonLink
                          href={`/student/case/${claim.caseId}`}
                          className="w-full justify-between"
                        >
                          {/* A reference code is Latin and digits inside an
                              Arabic button; without its own run it re-orders. */}
                          <span className="ltr-run font-mono text-sm">{claim.referenceCode}</span>
                          <span className="text-sm">{studentActiveClaims.open}</span>
                        </ButtonLink>
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            ) : null}
            {/*
              * Above the queue, not below it.
              *
              * The offer used to sit at the bottom of the page, under a list a
              * student scrolls and rarely reaches the end of — so the one
              * feature that reaches a student who is *not* looking was itself
              * only visible to a student who was. For everybody else the
              * placement further down is the correct one — a pending student's
              * first question is about their own account, not notifications.
              */}
            {telegramAvailable && !telegramLinked ? (
              <div className="mb-4">
                <TelegramLink needsDocument={false} />
              </div>
            ) : null}
            <CaseQueue
              studentId={profile.id}
              universityId={profile.universityId}
              stageId={profile.stageId}
              clinicDays={profile.clinicDays}
              heldCount={activeClaims.length}
              params={params}
            />
          </>
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

        {/* Skipped once verified, where it has already been offered above the
            queue. Still shown while a student is waiting, because the pitch
            there is the document rather than the case alerts. */}
        {telegramAvailable &&
        !telegramLinked &&
        profile &&
        profile.verificationStatus !== 'VERIFIED' ? (
          <TelegramLink needsDocument={needsDocument} />
        ) : null}

        {telegramLinked ? (
          <p className="mt-4 text-xs text-foreground-muted">{studentTelegram.linked}</p>
        ) : null}
      </>
    </PageShell>
  )
}
