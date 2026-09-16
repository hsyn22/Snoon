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
import { Card, CardBody } from '@/components/ui/card'
import { studentProfile } from '@/lib/copy'
import { ProfileForm } from './profile-form'

export const metadata: Metadata = { title: studentProfile.title }

/** Depends on who is asking and on Payload configuration; never pre-rendered. */
export const dynamic = 'force-dynamic'

export default async function StudentProfilePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')
  if (!session.user.emailVerified) redirect('/student')

  // One profile per account. Someone who already submitted goes back to their
  // status rather than to a form that would refuse them.
  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (existing) redirect('/student')

  const [universities, stages] = await Promise.all([getUniversities(), getStages()])

  const ready = universities.length > 0 && stages.length > 0

  /*
   * Which of the three is actually missing.
   *
   * The card used to say "universities and colleges are not added yet"
   * regardless, so an admin who had added a university and not a college read
   * it as the site ignoring what they had entered — the same failure this
   * project already warns about for cities, where an admin who sees no change
   * reasonably concludes the admin panel is broken.
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
          // The universities and colleges are entered by an admin in Payload. Until
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
