import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getColleges, getStages, getUniversities } from '@/lib/config'
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

  const [universities, colleges, stages] = await Promise.all([
    getUniversities(),
    getColleges(),
    getStages(),
  ])

  const ready = universities.length > 0 && colleges.length > 0 && stages.length > 0

  return (
    <PageShell>
      <>
        <PageHeader
          eyebrow={studentProfile.eyebrow}
          title={studentProfile.title}
          lead={ready ? studentProfile.intro : undefined}
        />

        {ready ? (
          <ProfileForm universities={universities} colleges={colleges} stages={stages} />
        ) : (
          // The universities and colleges are entered by an admin in Payload. Until
          // they exist there is nothing truthful to put in these dropdowns, and a
          // form the student cannot complete is worse than saying so.
          <Card>
            <CardBody className="p-5">
              <h2 className="font-bold">{studentProfile.notReadyTitle}</h2>
              <p className="mt-2 text-sm text-foreground-muted">{studentProfile.notReadyBody}</p>
            </CardBody>
          </Card>
        )}
      </>
    </PageShell>
  )
}
