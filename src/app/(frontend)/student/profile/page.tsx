import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getColleges, getStages, getUniversities } from '@/lib/config'
import { site, studentProfile } from '@/lib/copy'
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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/student" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{studentProfile.title}</h1>

        {ready ? (
          <>
            <p className="mt-2 text-sm text-foreground-muted">{studentProfile.intro}</p>
            <div className="mt-8">
              <ProfileForm universities={universities} colleges={colleges} stages={stages} />
            </div>
          </>
        ) : (
          // The universities and colleges are entered by an admin in Payload. Until
          // they exist there is nothing truthful to put in these dropdowns, and a
          // form the student cannot complete is worse than saying so.
          <section className="mt-6 rounded-lg border border-border bg-surface p-5">
            <h2 className="font-semibold">{studentProfile.notReadyTitle}</h2>
            <p className="mt-2 text-sm text-foreground-muted">{studentProfile.notReadyBody}</p>
          </section>
        )}
      </main>
    </div>
  )
}
