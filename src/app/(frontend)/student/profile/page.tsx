import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getStages, getUniversities } from '@/lib/config'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { ButtonLink } from '@/components/ui/button'
import { Card, CardBody, CardRibbon } from '@/components/ui/card'
import { caseForm, studentProfile } from '@/lib/copy'
import { ProfileForm } from './profile-form'
import { ProfileEditForm } from './edit-form'

export const metadata: Metadata = { title: studentProfile.title }

/** Depends on who is asking and on Payload configuration; never pre-rendered. */
export const dynamic = 'force-dynamic'

/** Which colour each standing reads as. Never colour alone — the chip carries
 *  its Arabic label too, and the label is the part that has to be right. */
const STANDING_TONE = {
  PENDING: 'warning',
  VERIFIED: 'positive',
  REJECTED: 'danger',
  SUSPENDED: 'neutral',
} as const

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-foreground-muted">{label}</span>
      <span className="font-bold">{value}</span>
    </div>
  )
}

export default async function StudentProfilePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')
  if (!session.user.emailVerified) redirect('/student')

  const [existing] = await db
    .select({
      fullName: students.fullName,
      universityId: students.universityId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  const [universities, stages] = await Promise.all([getUniversities(), getStages()])
  const ready = universities.length > 0 && stages.length > 0

  /*
   * A student who already has a profile used to be redirected away from here,
   * which made the record write-once: a fourth year who became a fifth year
   * could not say so, a mistyped name was permanent, and there was no page
   * anywhere showing a student what سنون holds about them. Now the route shows
   * the record and, unless they are suspended, lets it be corrected.
   */
  if (existing) {
    const saved = (await searchParams).saved
    const nameOf = (list: readonly { id: string; nameAr: string }[], id: string) =>
      list.find((entry) => entry.id === id)?.nameAr ?? id
    const suspended = existing.verificationStatus === 'SUSPENDED'

    return (
      <PageShell>
        <>
          <PageHeader
            eyebrow={studentProfile.viewEyebrow}
            title={studentProfile.viewTitle}
            lead={suspended ? undefined : studentProfile.viewLead}
          />

          {saved ? (
            <p
              role="status"
              className="mb-4 rounded-md bg-accent-muted p-3 text-sm text-accent-strong"
            >
              {saved === 'reverify' ? studentProfile.savedReverify : studentProfile.saved}
            </p>
          ) : null}

          <Card className="mb-5">
            <CardRibbon
              label={studentProfile.statusLabels[existing.verificationStatus]}
              detail={studentProfile.statusLabel}
              tone={STANDING_TONE[existing.verificationStatus]}
            />
            <CardBody className="p-5">
              <Row label={studentProfile.nameLabel} value={existing.fullName} />
              <Row
                label={studentProfile.universityLabel}
                value={nameOf(universities, existing.universityId)}
              />
              <Row label={studentProfile.stageLabel} value={nameOf(stages, existing.stageId)} />
              <Row
                label={studentProfile.clinicDaysLabel}
                value={
                  existing.clinicDays.length > 0
                    ? existing.clinicDays
                        .map((day) => caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day)
                        .join('، ')
                    : studentProfile.anyDay
                }
              />

              <div className="mt-4">
                <ButtonLink
                  href="/student/profile/document"
                  variant="secondary"
                  className="text-sm"
                >
                  {studentProfile.documentAction}
                </ButtonLink>
              </div>
            </CardBody>
          </Card>

          {/* A suspension is a decision about a person, and an edit is not an
              appeal — so there is no form here at all. The action refuses a
              suspended student too: hiding a form stops nobody, since every
              server action is a public POST endpoint. */}
          {suspended ? (
            <p className="rounded-md bg-surface-muted p-3 text-sm">
              {studentProfile.suspendedNotice}
            </p>
          ) : ready ? (
            <ProfileEditForm universities={universities} stages={stages} current={existing} />
          ) : null}
        </>
      </PageShell>
    )
  }

  /*
   * Which of the two lists is actually missing.
   *
   * The card used to say "universities and colleges are not added yet"
   * regardless, so an admin who had added a university and not a college read it
   * as the site ignoring what they had entered — the same failure this project
   * already warns about for cities, where an admin who sees no change reasonably
   * concludes the admin is broken.
   *
   * The college used to be the third of these and was the one actually missing
   * when Haider hit it. It no longer exists, which removes that case — but two
   * lists can still be empty, so the message stays.
   */
  const missing =
    universities.length === 0
      ? studentProfile.notReadyUniversities
      : stages.length === 0
        ? studentProfile.notReadyStages
        : null

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentProfile.eyebrow}
          title={studentProfile.title}
          lead={ready ? studentProfile.intro : undefined}
        />

        {ready ? (
          <ProfileForm universities={universities} stages={stages} />
        ) : (
          // The universities and stages are entered by an admin in Payload. Until
          // they exist there is nothing truthful to put in these dropdowns, and a
          // form the student cannot complete is worse than saying so.
          <Card>
            <CardBody className="p-5">
              <h2 className="font-bold">{studentProfile.notReadyTitle}</h2>
              {missing ? <p className="mt-2 text-sm">{missing}</p> : null}
              <p className="mt-2 text-sm text-foreground-muted">{studentProfile.notReadyBody}</p>
            </CardBody>
          </Card>
        )}
      </>
    </PageShell>
  )
}
