'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getAllTreatmentTypes } from '@/lib/config'

export type NotificationSettingsState = { saved?: boolean; error?: string }

/**
 * Save a student's notification preferences.
 *
 * The acting student is resolved from the session and never from the form, like
 * every other server action here — every export from a `'use server'` file is a
 * public POST endpoint, and an id off a form would let anybody silence anybody.
 *
 * **What is saved is the muted set, not the wanted set**, and the form is built
 * the other way round on purpose: the student ticks what they want, and this
 * stores what is left over. An inclusion list would be a snapshot of the
 * treatments that existed the day it was saved, so adding a new treatment type
 * later would silently send its alerts to nobody — the same shape of failure
 * `ensureStageDefaults` already has on record, and whose symptom is an empty
 * inbox that reads as "there are no patients".
 *
 * Nothing here touches what a student may *see*. A muted treatment still
 * appears in their queue and is still theirs to claim.
 */
export async function saveNotificationSettingsAction(
  _previous: NotificationSettingsState,
  formData: FormData,
): Promise<NotificationSettingsState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) redirect('/student')

  const notifyNewCases = formData.get('notifyNewCases') === 'on'

  // Validated against the real list, so an edited form means fewer treatments
  // named rather than junk in a column that is later compared against slugs.
  const treatments = await getAllTreatmentTypes()
  const wanted = new Set(
    formData
      .getAll('treatments')
      .map(String)
      .filter((id) => treatments.some((treatment) => treatment.id === id)),
  )

  const muted = notifyNewCases
    ? treatments.map((treatment) => treatment.id).filter((id) => !wanted.has(id))
    : // Switching the alerts off entirely leaves the per-treatment choices
      // alone — clearing them would mean a student who turns alerts back on a
      // week later silently gets everything again, including what they had
      // deliberately muted.
      undefined

  await db
    .update(students)
    .set({
      notifyNewCases,
      ...(muted ? { mutedTreatmentTypeIds: muted } : {}),
      updatedAt: new Date(),
    })
    .where(eq(students.id, student.id))

  revalidatePath('/student/notifications')
  return { saved: true }
}
