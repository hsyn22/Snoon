'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { studentProfile } from '@/lib/copy'
import { attachVerificationDocument } from '@/lib/students/document-intake'

export type DocumentState = { error?: string }

/**
 * Upload the enrolment document on the site, for a student who did not attach
 * one when they filled in their profile — or is replacing a rejected one.
 *
 * Shares `attachVerificationDocument` with the bot, so both routes obey the same
 * rules about what may be accepted and what it does to their standing.
 */
export async function uploadDocumentAction(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const file = formData.get('document')
  if (!(file instanceof File) || file.size === 0) {
    return { error: studentProfile.errors.documentRequired }
  }

  const result = await attachVerificationDocument(student.id, {
    data: Buffer.from(await file.arrayBuffer()),
    mimetype: file.type,
    name: file.name,
    size: file.size,
  })

  if (!result.ok) {
    const messages: Record<string, string> = {
      TOO_LARGE: studentProfile.errors.documentTooBig,
      WRONG_TYPE: studentProfile.errors.documentWrongType,
    }
    return { error: messages[result.reason] ?? studentProfile.errors.generic }
  }

  redirect('/student')
}
