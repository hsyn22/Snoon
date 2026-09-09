import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { linkChat, revokeLinksForChat, getSubjectForChat } from '@/db/queries/telegram'
import { telegramConfirm, telegramCopy } from '@/lib/copy'
import { confirmContactByPatient, reportNoContactByPatient } from '@/lib/cases/contact'
import { looksLikeInviteToken } from './invite-token'

/**
 * Handling one Telegram update.
 *
 * Kept apart from the route so it can be exercised with a synthetic update and
 * no network — there is no bot token in development, and the interesting
 * behaviour is all in here anyway.
 *
 * Everything in an update is attacker-controlled: anyone can message the bot.
 * The chat id is the only thing trusted, and only because Telegram supplies it
 * on a request already authenticated by the webhook secret.
 */

export type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string }
    text?: string
  }
  callback_query?: {
    id?: string
    data?: string
    message?: { chat?: { id?: number | string } }
  }
}

export type WebhookOutcome = {
  /** Reply to send back, or null to stay silent. */
  reply: { chatId: string; text: string } | null
  /** Button tap to acknowledge, so Telegram stops showing a spinner. */
  answerCallbackId?: string
}

const NO_REPLY: WebhookOutcome = { reply: null }

/** Callback payloads. Telegram caps callback_data at 64 bytes, so these stay short. */
export const CONFIRM_CONTACT_YES = 'contact:yes'
export const CONFIRM_CONTACT_NO = 'contact:no'

/**
 * Handle the patient tapping a confirmation button.
 *
 * The case is resolved from the chat's existing binding, never from the callback
 * payload. Callback data is attacker-controlled — anyone can send any string to
 * a bot — so it names the *answer*, never the case.
 */
async function handleContactCallback(
  chatId: string,
  data: string,
  callbackId: string | undefined,
): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)

  if (!subject || subject.type !== 'PATIENT_CASE') {
    return { reply: { chatId, text: telegramConfirm.nothingToConfirm }, answerCallbackId: callbackId }
  }

  if (data === CONFIRM_CONTACT_YES) {
    const result = await confirmContactByPatient(subject.id)
    return {
      reply: {
        chatId,
        text: result.ok ? telegramConfirm.thanksYes : telegramConfirm.alreadyAnswered,
      },
      answerCallbackId: callbackId,
    }
  }

  const recorded = await reportNoContactByPatient(subject.id)
  return {
    reply: {
      chatId,
      text: recorded ? telegramConfirm.thanksNo : telegramConfirm.alreadyAnswered,
    },
    answerCallbackId: callbackId,
  }
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<WebhookOutcome> {
  const callback = update.callback_query
  if (callback) {
    const callbackChatId = callback.message?.chat?.id
    const data = callback.data
    if (callbackChatId === undefined || callbackChatId === null || typeof data !== 'string') {
      return NO_REPLY
    }
    if (data === CONFIRM_CONTACT_YES || data === CONFIRM_CONTACT_NO) {
      return handleContactCallback(String(callbackChatId), data, callback.id)
    }
    return { reply: null, answerCallbackId: callback.id }
  }

  const chatIdRaw = update.message?.chat?.id
  const text = update.message?.text

  if (chatIdRaw === undefined || chatIdRaw === null || typeof text !== 'string') return NO_REPLY

  const chatId = String(chatIdRaw)
  const trimmed = text.trim()

  if (trimmed === '/stop') {
    const revoked = await revokeLinksForChat(chatId)
    return {
      reply: { chatId, text: revoked > 0 ? telegramCopy.stopped : telegramCopy.nothingToStop },
    }
  }

  if (trimmed === '/start') {
    return { reply: { chatId, text: telegramCopy.startWithoutToken } }
  }

  if (trimmed.startsWith('/start ')) {
    const token = trimmed.slice('/start '.length).trim()

    // Shape-checked before touching the database: Telegram only ever sends
    // A-Za-z0-9_- here, so anything else is not a token we minted.
    if (!looksLikeInviteToken(token)) {
      return { reply: { chatId, text: telegramCopy.unknownToken } }
    }

    const result = await linkChat(token, chatId)

    if (!result.ok) {
      return {
        reply: {
          chatId,
          text:
            result.reason === 'ALREADY_USED'
              ? telegramCopy.alreadyUsed
              : telegramCopy.unknownToken,
        },
      }
    }

    if (result.subject.type === 'STUDENT') {
      return { reply: { chatId, text: telegramCopy.welcomeStudent } }
    }

    const [row] = await db
      .select({ referenceCode: cases.referenceCode })
      .from(cases)
      .where(eq(cases.id, result.subject.id))
      .limit(1)

    return {
      reply: { chatId, text: telegramCopy.welcomePatient(row?.referenceCode ?? '') },
    }
  }

  return { reply: { chatId, text: telegramCopy.unknownCommand } }
}
