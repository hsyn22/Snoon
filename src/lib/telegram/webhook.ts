import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { linkChat, revokeLinksForChat } from '@/db/queries/telegram'
import { telegramCopy } from '@/lib/copy'
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
}

export type WebhookOutcome = {
  /** Reply to send back, or null to stay silent. */
  reply: { chatId: string; text: string } | null
}

const NO_REPLY: WebhookOutcome = { reply: null }

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<WebhookOutcome> {
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
