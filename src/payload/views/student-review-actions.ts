'use server'

import { eq } from 'drizzle-orm'
import { headers as nextHeaders } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { students } from '@/db/schema'
import { telegramStudentDoc } from '@/lib/copy'
import { sendNotification } from '@/lib/notifications/send'

/**
 * Approving, rejecting and suspending students.
 *
 * Reached only from the admin view, but the caller is never trusted: every
 * action re-checks that the request carries a logged-in Payload admin. A server
 * action is a public endpoint — being rendered inside the admin proves nothing
 * about who is calling it.
 */

export type ReviewDecision = 'VERIFIED' | 'REJECTED' | 'SUSPENDED' | 'PENDING'

async function requireAdmin(): Promise<{ id: string; email: string }> {
  const payload = await getPayload({ config })
  const { user } = await payload.auth({ headers: await nextHeaders() })

  if (!user || user.collection !== 'admins') {
    throw new Error('Not authorised.')
  }
  return { id: String(user.id), email: String(user.email) }
}

export async function decideStudentVerification(
  studentId: string,
  decision: ReviewDecision,
  note?: string,
): Promise<void> {
  const admin = await requireAdmin()

  await db
    .update(students)
    .set({
      verificationStatus: decision,
      verificationReviewedBy: admin.email,
      verificationReviewedAt: new Date(),
      // Kept as the admin-facing record of why. Never shown to the student
      // verbatim, and never contains anything from the document itself.
      verificationNote: note?.trim() || null,
      updatedAt: new Date(),
    })
    .where(eq(students.id, studentId))

  // Best-effort and after the decision is written: a student who never linked
  // Telegram simply sees the outcome next time they open the site.
  if (decision === 'VERIFIED' || decision === 'REJECTED') {
    await sendNotification({
      recipient: { kind: 'STUDENT', studentId },
      text:
        decision === 'VERIFIED' ? telegramStudentDoc.verified : telegramStudentDoc.rejected,
    })
  }

  revalidatePath('/admin/students')
}
