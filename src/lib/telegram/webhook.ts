import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { linkChat, revokeLinksForChat, getSubjectForChat } from '@/db/queries/telegram'
import { caseStatus, dayRequest, telegramConfirm, telegramCopy, telegramStudentDoc } from '@/lib/copy'
import {
  attachVerificationDocument,
  MAX_DOCUMENT_BYTES,
} from '@/lib/students/document-intake'
import { downloadTelegramFile, type InlineButton } from './client'
import { confirmContactByPatient, reportNoContactByPatient } from '@/lib/cases/contact'
import { sendNotification } from '@/lib/notifications/send'
import { acceptDay, declineDay } from '@/db/queries/day-requests'
import { notifyStudentOfDayAnswer } from '@/lib/notifications/day-requests'
import { DAY_ANSWER_PREFIX, parseDayAnswer } from './day-answers'
import { looksLikeInviteToken } from './invite-token'
import { claimCaseForStudent } from '@/lib/cases/claim'
import { siteUrl } from '@/lib/site-url'
import { CLAIM_PREFIX, NEXT_PREFIX, nextCaseForStudent } from './student-queue'

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
  /**
   * Reply to send back, or null to stay silent.
   *
   * `buttons` is one row under the message. The queue uses it for "take it" and
   * "show me the next one", which is the whole interaction: a list with five
   * buttons and no cards to tell them apart is not something a thumb can use.
   */
  reply: { chatId: string; text: string; buttons?: readonly InlineButton[] } | null
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
 * The patient answering "could you come on <day>?".
 *
 * As with the contact buttons, the case comes from the chat's binding and never
 * from the payload — callback data is attacker-controlled. The payload names the
 * *day* and the answer, neither of which identifies anyone.
 *
 * A yes claims the case for whoever asked about that day first, through the same
 * atomic path an ordinary claim uses, and tells them. A no closes that day so
 * the patient is not asked it again by the next student with the same timetable.
 */
async function handleDayCallback(
  chatId: string,
  data: string,
  callbackId: string | undefined,
): Promise<WebhookOutcome> {
  const parsed = parseDayAnswer(data)
  if (!parsed) return NO_REPLY

  const subject = await getSubjectForChat(chatId)
  if (!subject || subject.type !== 'PATIENT_CASE') {
    return {
      reply: { chatId, text: telegramConfirm.nothingToConfirm },
      answerCallbackId: callbackId,
    }
  }

  if (parsed.answer === 'no') {
    await declineDay(subject.id, parsed.day)
    return { reply: { chatId, text: dayRequest.declined }, answerCallbackId: callbackId }
  }

  const result = await acceptDay(subject.id, parsed.day)

  if (!result.ok) {
    return {
      reply: {
        chatId,
        text: result.reason === 'CASE_UNAVAILABLE' ? dayRequest.gone : dayRequest.failed,
      },
      answerCallbackId: callbackId,
    }
  }

  // The student is told they have the case. Best-effort, and after the claim:
  // a message that fails must not undo a claim the patient just granted.
  await notifyStudentOfDayAnswer(result.studentId, result.referenceCode, parsed.day)

  return { reply: { chatId, text: dayRequest.accepted }, answerCallbackId: callbackId }
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

/**
 * Turn a queue state into something to send.
 *
 * Shared by `/cases` and the "next" button so the two cannot describe the same
 * queue differently.
 */
function queueReply(chatId: string, state: Awaited<ReturnType<typeof nextCaseForStudent>>) {
  switch (state.kind) {
    case 'not-verified':
      return { chatId, text: telegramCopy.queueNotVerified }
    case 'no-scope':
      return { chatId, text: telegramCopy.queueEmpty }
    case 'empty':
      return { chatId, text: telegramCopy.queueEmpty }
    case 'end':
      return { chatId, text: telegramCopy.queueEnd }
    case 'case':
      return { chatId, text: state.card.text, buttons: state.buttons }
  }
}

/**
 * The student asks to see the queue.
 *
 * Who is asking comes from the chat binding and never from the message, like
 * everything else here: a stranger can type `/cases` at the bot all day.
 */
async function handleCasesCommand(chatId: string): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject) return { reply: { chatId, text: telegramCopy.startWithoutToken } }
  if (subject.type !== 'STUDENT') {
    return { reply: { chatId, text: telegramCopy.casesNotAStudent } }
  }

  return { reply: queueReply(chatId, await nextCaseForStudent(subject.id)) }
}

/**
 * The "next case" button.
 *
 * The callback carries the case the student is looking *at*, which is
 * attacker-controlled and harmless: it is a cursor into a list the server builds
 * for this student, so the worst a forged one does is show them the first case
 * in their own queue.
 */
async function handleNextCallback(
  chatId: string,
  data: string,
  callbackId?: string,
): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject || subject.type !== 'STUDENT') {
    return { reply: null, answerCallbackId: callbackId }
  }

  const afterId = data.slice(NEXT_PREFIX.length)
  const state = await nextCaseForStudent(subject.id, afterId)
  return { reply: queueReply(chatId, state), answerCallbackId: callbackId }
}

/**
 * The claim button.
 *
 * **This is the one callback where the payload names something that grants
 * access**, so it goes through `claimCaseForStudent` rather than `claimCase`:
 * the case id in `callback_data` is attacker-controlled, and the only thing
 * standing between a forged one and a stranger's phone number is that
 * authorisation check. The student, as always, comes from the chat binding.
 *
 * The reply carries no contact detail. The student has earned it at this moment
 * and it still stays on the case page behind their session — Telegram keeps
 * message history on its own servers, where سنون cannot scrub a number when the
 * retention period runs out.
 */
async function handleClaimCallback(
  chatId: string,
  data: string,
  callbackId?: string,
): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject || subject.type !== 'STUDENT') {
    return { reply: null, answerCallbackId: callbackId }
  }

  const caseId = data.slice(CLAIM_PREFIX.length)
  const result = await claimCaseForStudent(caseId, subject.id)

  if (!result.ok) {
    const text =
      result.reason === 'CASE_UNAVAILABLE'
        ? telegramCopy.claimTakenByBot
        : result.reason === 'DAYS_DO_NOT_MATCH'
          ? telegramCopy.caseCardDays
          : telegramCopy.queueNotVerified
    return { reply: { chatId, text }, answerCallbackId: callbackId }
  }

  const [row] = await db
    .select({ referenceCode: cases.referenceCode })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  // Best effort and after the fact, exactly as on the site: the patient is told
  // somebody is coming, and a message that fails to send must not undo a claim.
  if (row) {
    await sendNotification({
      recipient: { kind: 'PATIENT_CASE', caseId },
      text: telegramCopy.caseClaimed(row.referenceCode),
    })
  }

  return {
    reply: {
      chatId,
      text: telegramCopy.claimedByBot(
        row?.referenceCode ?? '',
        `${siteUrl()}/student/case/${caseId}`,
      ),
    },
    answerCallbackId: callbackId,
  }
}

/** The patient asking where their case has got to. */
async function handleStatusCommand(chatId: string): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject) return { reply: { chatId, text: telegramCopy.startWithoutToken } }
  if (subject.type !== 'PATIENT_CASE') {
    return { reply: { chatId, text: telegramCopy.statusNotAPatient } }
  }

  const [row] = await db
    .select({ referenceCode: cases.referenceCode, status: cases.status })
    .from(cases)
    .where(eq(cases.id, subject.id))
    .limit(1)

  if (!row) return { reply: { chatId, text: telegramCopy.startWithoutToken } }

  return {
    reply: {
      chatId,
      text: telegramCopy.patientStatus(row.referenceCode, caseStatus[row.status]),
    },
  }
}

/** Which help to send is decided by what this chat is bound to. */
async function handleHelpCommand(chatId: string): Promise<WebhookOutcome> {
  const subject = await getSubjectForChat(chatId)
  if (!subject) return { reply: { chatId, text: telegramCopy.helpUnlinked } }
  return {
    reply: {
      chatId,
      text: subject.type === 'STUDENT' ? telegramCopy.helpStudent : telegramCopy.helpPatient,
    },
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
    if (data.startsWith(DAY_ANSWER_PREFIX)) {
      return handleDayCallback(String(callbackChatId), data, callback.id)
    }
    if (data.startsWith(CLAIM_PREFIX)) {
      return handleClaimCallback(String(callbackChatId), data, callback.id)
    }
    if (data.startsWith(NEXT_PREFIX)) {
      return handleNextCallback(String(callbackChatId), data, callback.id)
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

  if (trimmed === '/help') return handleHelpCommand(chatId)
  if (trimmed === '/cases') return handleCasesCommand(chatId)
  if (trimmed === '/status') return handleStatusCommand(chatId)

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
