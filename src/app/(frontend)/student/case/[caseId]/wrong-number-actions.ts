'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { reportWrongNumber } from '@/lib/cases/lifecycle'
import { getWrongNumberBlockDays } from '@/lib/config/settings'
import { studentClaim } from '@/lib/copy'

export type WrongNumberState = { done?: boolean; error?: string }

/**
 * "The person who answered never asked for treatment."
 *
 * The acting student comes from the session, never from the form: this closes a
 * case and takes a phone number out of use, so who is asking has to be the
 * person holding the claim. `reportWrongNumber` re-checks that too.
 */
export async function reportWrongNumberAction(
  _previous: WrongNumberState,
  formData: FormData,
): Promise<WrongNumberState> {
  const caseId = String(formData.get('caseId') ?? '')
  if (!caseId) return { error: studentClaim.wrongNumberFailed }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)
  if (!student) redirect('/student')

  const result = await reportWrongNumber(student.id, caseId, await getWrongNumberBlockDays())
  if (!result.ok) return { error: studentClaim.wrongNumberFailed }

  revalidatePath(`/student/case/${caseId}`)
  return { done: true }
}
