'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { confirmAppointment, recordOutcome, type CaseOutcome } from '@/lib/cases/lifecycle'
import { studentLifecycle, telegramCopy } from '@/lib/copy'
import { parseBaghdadDateTime } from '@/lib/dates'
import { sendNotification } from '@/lib/notifications/send'
import { formatAppointment } from '@/lib/dates'

export type LifecycleState = { error?: string }

/** Resolve the acting student from the session, never from the form. */
async function currentStudentId(): Promise<string> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) redirect('/student')
  return student.id
}

export async function confirmAppointmentAction(
  _previous: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const caseId = String(formData.get('caseId') ?? '')
  const raw = String(formData.get('scheduledFor') ?? '')

  // Read as Baghdad time, not the device's: a phone set to another zone would
  // otherwise book the patient hours from the time the student typed.
  const scheduledFor = parseBaghdadDateTime(raw)
  if (!caseId || !scheduledFor) return { error: studentLifecycle.errors.invalidDate }

  const studentId = await currentStudentId()
  const result = await confirmAppointment(studentId, caseId, scheduledFor)

  if (!result.ok) {
    if (result.reason === 'APPOINTMENT_IN_PAST') return { error: studentLifecycle.errors.inPast }
    if (result.reason === 'WRONG_STATUS') return { error: studentLifecycle.errors.wrongStatus }
    return { error: studentLifecycle.errors.generic }
  }

  await sendNotification({
    recipient: { kind: 'PATIENT_CASE', caseId },
    text: telegramCopy.appointmentSet(result.value.referenceCode, formatAppointment(scheduledFor)),
  })

  revalidatePath(`/student/case/${caseId}`)
  return {}
}

export async function recordOutcomeAction(
  _previous: LifecycleState,
  formData: FormData,
): Promise<LifecycleState> {
  const caseId = String(formData.get('caseId') ?? '')
  const outcome = String(formData.get('outcome') ?? '')

  if (!caseId || (outcome !== 'COMPLETED' && outcome !== 'NO_SHOW' && outcome !== 'CANCELLED')) {
    return { error: studentLifecycle.errors.generic }
  }

  const studentId = await currentStudentId()
  const result = await recordOutcome(studentId, caseId, outcome as CaseOutcome)

  if (!result.ok) {
    return {
      error:
        result.reason === 'WRONG_STATUS'
          ? studentLifecycle.errors.wrongStatus
          : studentLifecycle.errors.generic,
    }
  }

  revalidatePath(`/student/case/${caseId}`)
  return {}
}
