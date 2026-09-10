import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { getChatIdFor } from '@/db/queries/telegram'
import { caseForm, dayRequest, telegramCopy } from '@/lib/copy'
import { sendTelegramMessage } from '@/lib/telegram/client'
import { sendNotification } from './send'
import { DAY_ANSWER_PREFIX } from '@/lib/telegram/day-answers'

/**
 * Ask the patient, once per day, whether they could come.
 *
 * Sent after the request rows exist, never instead of them: a patient who never
 * linked Telegram sees exactly the same question on their tracking page, and a
 * message that fails to send must not lose the question.
 *
 * One message per day, each with its own yes/no, because a day is the unit the
 * patient answers and the unit the "whoever asked first" rule settles.
 *
 * Sent through the Telegram client directly rather than through
 * `sendNotification`, for the same reason the contact confirmation is: the
 * notification interface carries text, and this needs buttons. A tap is the only
 * reply the median user on a cheap phone will give.
 */
export async function notifyPatientOfDayRequests(
  caseId: string,
  days: readonly string[],
): Promise<void> {
  const chatId = await getChatIdFor({ kind: 'PATIENT_CASE', caseId })
  if (!chatId) return

  const [record] = await db
    .select({ referenceCode: cases.referenceCode })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  if (!record) return

  for (const day of days) {
    const label = caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day

    await sendTelegramMessage(chatId, telegramCopy.dayRequest(record.referenceCode, label), [
      { text: dayRequest.yes(label), callbackData: `${DAY_ANSWER_PREFIX}yes:${day}` },
      { text: dayRequest.no, callbackData: `${DAY_ANSWER_PREFIX}no:${day}` },
    ])
  }
}

/**
 * Tell the student the patient said yes, and the case is theirs.
 *
 * Sent after the claim exists, never before: the message is news about a thing
 * that already happened, and a student told they have a case they do not hold
 * would ring a patient with no right to the number.
 */
export async function notifyStudentOfDayAnswer(
  studentId: string,
  referenceCode: string,
  day: string,
): Promise<void> {
  const label = caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day

  await sendNotification({
    recipient: { kind: 'STUDENT', studentId },
    text: telegramCopy.dayRequestAccepted(referenceCode, label),
  })
}
