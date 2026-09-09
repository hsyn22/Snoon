import { getChatIdFor } from '@/db/queries/telegram'
import { telegramConfirm } from '@/lib/copy'
import { sendTelegramMessage } from '@/lib/telegram/client'
import { CONFIRM_CONTACT_NO, CONFIRM_CONTACT_YES } from '@/lib/telegram/webhook'

/**
 * Ask the patient to confirm that a student reached them.
 *
 * Sent with buttons rather than as plain text, because the answer has to come
 * back as one tap: the median user is on a cheap phone and will not type a
 * reply. Goes only to a patient who opted in — everyone else confirms on their
 * tracking link instead, and nothing about the case depends on Telegram.
 */
export async function askPatientToConfirmContact(
  caseId: string,
  referenceCode: string,
): Promise<'ASKED' | 'NO_CHANNEL' | 'FAILED'> {
  const chatId = await getChatIdFor({ kind: 'PATIENT_CASE', caseId })
  if (!chatId) return 'NO_CHANNEL'

  const result = await sendTelegramMessage(chatId, telegramConfirm.ask(referenceCode), [
    { text: telegramConfirm.yesButton, callbackData: CONFIRM_CONTACT_YES },
    { text: telegramConfirm.noButton, callbackData: CONFIRM_CONTACT_NO },
  ])

  return result.ok ? 'ASKED' : 'FAILED'
}
