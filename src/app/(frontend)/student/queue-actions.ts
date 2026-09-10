'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { claimCase } from '@/db/queries/claims'
import { cases } from '@/db/schema'
import { auth } from '@/lib/auth'
import { studentQueue, telegramCopy } from '@/lib/copy'
import { sendNotification } from '@/lib/notifications/send'
import { requestDays } from '@/db/queries/day-requests'
import { notifyPatientOfDayRequests } from '@/lib/notifications/day-requests'

export type ClaimActionState = { error?: string }

/**
 * Claim a case for the signed-in student.
 *
 * The student id is resolved from the session here, never taken from the form:
 * a claim is the moment a phone number becomes visible, so who is claiming must
 * come from the session and nowhere else. Verification is re-checked inside
 * claimCase's transaction as well.
 */
export async function claimCaseAction(
  _previous: ClaimActionState,
  formData: FormData,
): Promise<ClaimActionState> {
  const caseId = String(formData.get('caseId') ?? '')
  if (!caseId) return { error: studentQueue.claimFailedGeneric }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) redirect('/student')

  const result = await claimCase(caseId, student.id)

  if (!result.ok) {
    switch (result.reason) {
      case 'CASE_UNAVAILABLE':
        return { error: studentQueue.claimFailedUnavailable }
      case 'STUDENT_NOT_VERIFIED':
        return { error: studentQueue.claimFailedNotVerified }
      default:
        return { error: studentQueue.claimFailedGeneric }
    }
  }

  // Best-effort, and after the claim has already succeeded: someone is waiting
  // for a call, and a message that fails to send must not undo the claim.
  const [record] = await db
    .select({ referenceCode: cases.referenceCode })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  if (record) {
    await sendNotification({
      recipient: { kind: 'PATIENT_CASE', caseId },
      text: telegramCopy.caseClaimed(record.referenceCode),
    })
  }

  redirect(`/student/case/${caseId}`)
}

export type AskDaysState = { asked?: boolean; error?: string }

/**
 * The student asks the patient about the days they are actually in clinic.
 *
 * This grants nothing. It writes a question, and only the patient's answer can
 * turn it into a claim — so unlike claiming, there is no contact detail on the
 * other side of it and no case is taken off the queue.
 */
export async function askDaysAction(
  _previous: AskDaysState,
  formData: FormData,
): Promise<AskDaysState> {
  const caseId = String(formData.get('caseId') ?? '')
  if (!caseId) return { error: studentQueue.askFailedGeneric }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const result = await requestDays(caseId, student.id)

  if (!result.ok) {
    switch (result.reason) {
      case 'CASE_UNAVAILABLE':
        return { error: studentQueue.askFailedUnavailable }
      case 'NO_DAYS_TO_OFFER':
        return { error: studentQueue.askFailedNoDays }
      case 'ALREADY_ASKED':
        return { asked: true }
      default:
        return { error: studentQueue.askFailedGeneric }
    }
  }

  // Best-effort and after the question is recorded: a patient who never linked
  // Telegram sees the same question on their tracking page.
  await notifyPatientOfDayRequests(caseId, result.days)

  revalidatePath('/student')
  return { asked: true }
}
