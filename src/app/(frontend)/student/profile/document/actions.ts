'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getUniversities } from '@/lib/config'
import { studentProfile } from '@/lib/copy'
import { attachVerificationDocument } from '@/lib/students/document-intake'
import { validateVerificationDetails, type ProfileFieldErrors } from '@/lib/students/validation'

export type DocumentState = {
  errors?: ProfileFieldErrors
  formError?: string
  /** Handed back so a rejected submission does not empty the form. */
  values?: { fullName?: string; universityId?: string }
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * The verification step on the site: the student's name, their university, and
 * the paper that proves both — for a student who did not attach one when they
 * filled in their profile, is replacing a rejected one, or sent theirs to the
 * bot and is correcting what an admin will read beside it.
 *
 * Shares `attachVerificationDocument` with the bot, so both routes obey the same
 * rules about what may be accepted and what it does to their standing.
 *
 * **The status check here is a rule, not a redirect.** The page already sends a
 * VERIFIED or SUSPENDED student away, but every export from a `'use server'`
 * file is a public POST endpoint and a rendering decision stops nobody: without
 * the check below, a suspended student could post this form by hand and put
 * themselves back in the review queue. `attachVerificationDocument` refuses them
 * for the same reason — this one guards the name and university, which are
 * written here rather than there.
 */
export async function uploadDocumentAction(
  _previous: DocumentState,
  formData: FormData,
): Promise<DocumentState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({
      id: students.id,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  if (student.verificationStatus === 'VERIFIED' || student.verificationStatus === 'SUSPENDED') {
    redirect('/student')
  }

  const values = {
    fullName: read(formData, 'fullName'),
    universityId: read(formData, 'universityId'),
  }

  const universities = await getUniversities()
  const validated = validateVerificationDetails(values, universities)
  if (!validated.ok) return { errors: validated.errors, values }

  const file = formData.get('document')
  const uploaded = file instanceof File && file.size > 0 ? file : null

  // The document is required only when there is not one already. A student who
  // sent theirs to the bot is here to correct a name, not to photograph the same
  // card twice.
  if (!uploaded && !student.verificationDocumentPath) {
    return { errors: { document: studentProfile.errors.documentRequired }, values }
  }

  try {
    await db
      .update(students)
      .set({
        fullName: validated.value.fullName,
        universityId: validated.value.universityId,
        updatedAt: new Date(),
        // A rejected student correcting their name has to land back in the
        // review queue, exactly as one sending a clearer photograph does.
        // Without this they would fix the thing they were refused for and sit
        // in REJECTED for ever, with nothing on any admin's screen to say so —
        // and the wrong name is a realistic reason to have been refused in the
        // first place. The reviewer is cleared for the same reason
        // `attachVerificationDocument` clears it: that decision no longer
        // describes what an admin is being asked to look at.
        //
        // Only from REJECTED. PENDING is already in the queue, and VERIFIED and
        // SUSPENDED never reach this line.
        ...(student.verificationStatus === 'REJECTED'
          ? {
              verificationStatus: 'PENDING' as const,
              verificationReviewedBy: null,
              verificationReviewedAt: null,
            }
          : {}),
      })
      .where(eq(students.id, student.id))
  } catch (error) {
    console.error(
      'Student verification details update failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { formError: studentProfile.errors.generic, values }
  }

  if (uploaded) {
    const result = await attachVerificationDocument(student.id, {
      data: Buffer.from(await uploaded.arrayBuffer()),
      mimetype: uploaded.type,
      name: uploaded.name,
      size: uploaded.size,
    })

    if (!result.ok) {
      const messages: Record<string, string> = {
        TOO_LARGE: studentProfile.errors.documentTooBig,
        WRONG_TYPE: studentProfile.errors.documentWrongType,
      }
      return { errors: { document: messages[result.reason] ?? studentProfile.errors.generic }, values }
    }
  }

  redirect('/student')
}
