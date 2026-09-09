'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { returnRemainderToQueue } from '@/lib/cases/lifecycle'
import { getStageCapabilityTreatmentIds } from '@/lib/config'
import { studentLifecycle, telegramCopy } from '@/lib/copy'
import { sendNotification } from '@/lib/notifications/send'

export type RemainderState = { done?: boolean; error?: string }

/**
 * "I finished my part — put the rest back."
 *
 * What counts as "my part" is read from the student's own stage capability on
 * the server. Taking it from the form would let a student hand back work their
 * stage is perfectly able to do, which would quietly turn a shared case into
 * somebody else's problem.
 */
export async function returnRemainderAction(
  _previous: RemainderState,
  formData: FormData,
): Promise<RemainderState> {
  const caseId = String(formData.get('caseId') ?? '')
  if (!caseId) return { error: studentLifecycle.errors.generic }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id, collegeId: students.collegeId, stageId: students.stageId })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const capable = await getStageCapabilityTreatmentIds(student.collegeId, student.stageId)
  const result = await returnRemainderToQueue(student.id, caseId, capable)

  if (!result.ok) {
    return {
      error:
        result.reason === 'WRONG_STATUS'
          ? studentLifecycle.errors.wrongStatus
          : studentLifecycle.errors.generic,
    }
  }

  // The patient is told their case is waiting again rather than finished, so
  // they are not left wondering why nobody has called about the rest.
  await sendNotification({
    recipient: { kind: 'PATIENT_CASE', caseId },
    text: telegramCopy.remainderQueued(result.value.referenceCode),
  })

  revalidatePath(`/student/case/${caseId}`)
  return { done: true }
}
