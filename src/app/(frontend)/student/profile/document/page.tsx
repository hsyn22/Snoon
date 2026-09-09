import type { Metadata } from 'next'
import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { site, studentProfile } from '@/lib/copy'
import { DocumentForm } from './document-form'

export const metadata: Metadata = { title: studentProfile.documentLabel }
export const dynamic = 'force-dynamic'

export default async function UploadDocumentPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ verificationStatus: students.verificationStatus })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  // No profile yet: the study details come first, so there is something for a
  // document to attach to.
  if (!student) redirect('/student/profile')
  // An approved student has nothing to upload, and a suspended one cannot lift
  // their own suspension by re-uploading.
  if (student.verificationStatus === 'VERIFIED' || student.verificationStatus === 'SUSPENDED') {
    redirect('/student')
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-4">
      <header className="py-6">
        <Link href="/student" className="text-sm text-foreground-muted">
          {site.name}
        </Link>
      </header>

      <main id="main" className="grow pb-10">
        <h1 className="text-2xl font-bold">{studentProfile.documentLabel}</h1>
        <div className="mt-6">
          <DocumentForm />
        </div>
      </main>
    </div>
  )
}
