import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { linkChat, revokeLinksForChat, getSubjectForChat } from '@/db/queries/telegram'
import { telegramConfirm, telegramCopy, telegramStudentDoc } from '@/lib/copy'
import {
  attachVerificationDocument,
  MAX_DOCUMENT_BYTES,
} from '@/lib/students/document-intake'
import { downloadTelegramFile } from './client'
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

export type TelegramPhotoSize = { file_id?: string; file_size?: number; width?: number }

export type TelegramUpdate = {
  message?: {
    chat?: { id?: number | string }
    text?: string
    /** Telegram sends several rendered sizes; the last is the largest. */
    photo?: TelegramPhotoSize[]
    document?: { file_id?: string; file_name?: string; mime_type?: string; file_size?: number }
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

/**
 * A student sending their proof of enrolment.
 *
 * Photographing a card and sending it in Telegram is far less work on a cheap
 * phone than a web file picker, and this is the step students drop off at. The
 * decision is still an admin's — the bot only carries the photo.
 *
 * The student is identified by the chat binding, never by anything in the
 * message: everything a stranger sends is attacker-controlled.
 */
async function handleStudentDocument(
  chatId: string,
  message: NonNullable<TelegramUpdate['message']>,
): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject) return { reply: { chatId, text: telegramCopy.startWithoutToken } }
  if (subject.type !== 'STUDENT') {
    return { reply: { chatId, text: telegramStudentDoc.notAStudent } }
  }

  // A photo comes as a list of rendered sizes; the last is the largest and the
  // only one legible enough to read a student number off.
  const largestPhoto = message.photo?.at(-1)
  const fileId = largestPhoto?.file_id ?? message.document?.file_id
  if (!fileId) return { reply: { chatId, text: telegramStudentDoc.prompt } }

  const declaredType = largestPhoto ? 'image/jpeg' : (message.document?.mime_type ?? '')
  const name = largestPhoto
    ? 'telegram-photo.jpg'
    : (message.document?.file_name ?? 'telegram-document')

  const downloaded = await downloadTelegramFile(fileId, MAX_DOCUMENT_BYTES)
  if (!downloaded.ok) {
    return {
      reply: {
        chatId,
        text:
          downloaded.reason === 'too-large'
            ? telegramStudentDoc.tooLarge
            : telegramStudentDoc.failed,
      },
    }
  }

  const result = await attachVerificationDocument(subject.id, {
    data: downloaded.file.data,
    mimetype: declaredType,
    name,
    size: downloaded.file.size,
  })

  if (result.ok) return { reply: { chatId, text: telegramStudentDoc.received } }

  const messages: Record<string, string> = {
    ALREADY_VERIFIED: telegramStudentDoc.alreadyVerified,
    SUSPENDED: telegramStudentDoc.suspended,
    TOO_LARGE: telegramStudentDoc.tooLarge,
    WRONG_TYPE: telegramStudentDoc.wrongType,
  }

  return { reply: { chatId, text: messages[result.reason] ?? telegramStudentDoc.failed } }
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

  if (chatIdRaw === undefined || chatIdRaw === null) return NO_REPLY

  // A photo or file carries no text, so this branch comes before the text one.
  if (update.message && (update.message.photo || update.message.document)) {
    return handleStudentDocument(String(chatIdRaw), update.message)
  }

  if (typeof text !== 'string') return NO_REPLY

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
