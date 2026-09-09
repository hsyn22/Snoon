'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { assertContactMade } from '@/lib/cases/contact'
import { studentContact } from '@/lib/copy'
import { askPatientToConfirmContact } from '@/lib/notifications/ask-patient-to-confirm'

export type AssertContactState = { error?: string }

/**
 * The student reports having reached the patient.
 *
 * This does not advance the case. It records the claim and asks the patient to
 * confirm — the student's word alone must never be able to hide a case.
 */
export async function assertContactAction(
  _previous: AssertContactState,
  formData: FormData,
): Promise<AssertContactState> {
  const caseId = String(formData.get('caseId') ?? '')
  if (!caseId) return { error: studentContact.assertFailed }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const result = await assertContactMade(student.id, caseId)
  if (!result.ok) return { error: studentContact.assertFailed }

  // Best-effort: the patient may not use Telegram, and their tracking link
  // carries the same question.
  await askPatientToConfirmContact(result.caseId, result.referenceCode)

  revalidatePath(`/student/case/${caseId}`)
  return {}
}
