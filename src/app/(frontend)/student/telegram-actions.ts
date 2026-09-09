'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/db'
import { students, telegramLinks } from '@/db/schema'
import { createInvite } from '@/db/queries/telegram'
import { auth } from '@/lib/auth'
import { buildDeepLink, getTelegramConfig } from '@/lib/telegram/config'

export type StudentInviteState = { deepLink?: string; error?: boolean }

/**
 * Mint a Telegram invite for the signed-in student.
 *
 * The student is taken from the session, never from the form — an invite binds a
 * chat to an account, and that account must be the one asking.
 */
export async function createStudentInviteAction(
  _previous: StudentInviteState,
  _formData: FormData,
): Promise<StudentInviteState> {
  const config = getTelegramConfig()
  if (!config) return { error: true }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const [student] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (!student) return { error: true }

  const invite = await createInvite({ type: 'STUDENT', id: student.id })
  return { deepLink: buildDeepLink(config, invite) }
}

/** Whether this student already has a chat bound. */
export async function isStudentLinked(studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ chatId: telegramLinks.chatId })
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.subjectType, 'STUDENT'),
        eq(telegramLinks.subjectId, studentId),
        isNull(telegramLinks.revokedAt),
      ),
    )
    .limit(1)

  return Boolean(row?.chatId)
}
