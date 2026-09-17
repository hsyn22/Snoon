import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getAllTreatmentTypes } from '@/lib/config'
import { studentNotifications } from '@/lib/copy'
import { isSubjectLinked } from '@/db/queries/telegram'
import { isTelegramConfigured } from '@/lib/telegram/config'
import { PageShell } from '@/components/site-chrome'
import { PageHeader } from '@/components/ui/section'
import { Card, CardBody } from '@/components/ui/card'
import { AlertIcon } from '@/components/ui/icon'
import { NotificationSettingsForm } from './settings-form'

/**
 * A student's notification settings.
 *
 * Asked for by Haider: "do you want alerts for new cases? yes or no — and if
 * yes, a list of every treatment, all ticked, and they untick what they do not
 * want."
 *
 * **These are alert settings and never a filter**, and the page says so in as
 * many words. The distinction is worth the sentence: a student who muted
 * cleanings a month ago and later finds their queue short would have no way to
 * connect the two, and a notification preference that quietly shrinks somebody's
 * queue is how a case sits unclaimed for reasons nobody can see.
 */
export const metadata: Metadata = {
  title: studentNotifications.title,
  robots: { index: false, follow: false, nocache: true },
}

export const dynamic = 'force-dynamic'

export default async function StudentNotificationsPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({
      id: students.id,
      notifyNewCases: students.notifyNewCases,
      mutedTreatmentTypeIds: students.mutedTreatmentTypeIds,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) redirect('/student')

  const treatments = await getAllTreatmentTypes()

  /*
   * Every treatment, not only this stage's.
   *
   * A student's stage can change — a fourth year becomes a fifth year — and the
   * muted set has to survive that without silently re-enabling everything they
   * had turned off. Listing the lot also means the page does not need the scope,
   * which is one fewer thing that has to be right for a settings screen to draw.
   */
  const telegramLinked =
    isTelegramConfigured() && (await isSubjectLinked({ type: 'STUDENT', id: student.id }))

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentNotifications.eyebrow}
          title={studentNotifications.title}
          lead={studentNotifications.intro}
        />

        {/* The settings are real whether or not the bot is linked — they are
            stored on the student, not on the chat — but saying nothing would
            leave somebody tuning alerts that have nowhere to arrive. */}
        {!telegramLinked ? (
          <Card className="mb-4">
            <CardBody className="p-4">
              <p className="flex items-start gap-2 text-sm">
                <AlertIcon className="mt-0.5 text-warm" />
                <span>
                  <span className="block font-bold">{studentNotifications.notLinkedTitle}</span>
                  <span className="mt-1 block text-xs text-foreground-muted">
                    {studentNotifications.notLinkedBody}
                  </span>
                </span>
              </p>
            </CardBody>
          </Card>
        ) : null}

        <NotificationSettingsForm
          treatments={treatments}
          notifyNewCases={student.notifyNewCases}
          mutedTreatmentTypeIds={student.mutedTreatmentTypeIds}
        />

        <p className="mt-4 text-xs text-foreground-muted">{studentNotifications.stillVisible}</p>
      </>
    </PageShell>
  )
}
