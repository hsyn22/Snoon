import { NextResponse } from 'next/server'
import { getTelegramConfig } from '@/lib/telegram/config'
import { answerCallbackQuery, sendTelegramMessage } from '@/lib/telegram/client'
import { handleTelegramUpdate, type TelegramUpdate } from '@/lib/telegram/webhook'

/**
 * Telegram's webhook.
 *
 * This URL is public, so the only thing separating a real update from a forged
 * one is the secret header Telegram is configured to send. Without it, anyone
 * could post a synthetic `/start <token>` and bind their own chat to a case.
 *
 * Always answers 200 once authenticated: Telegram retries on any other status,
 * and retrying will not fix a malformed update.
 */
export async function POST(request: Request): Promise<Response> {
  const config = getTelegramConfig()
  if (!config) return NextResponse.json({ ok: false }, { status: 404 })

  const presented = request.headers.get('x-telegram-bot-api-secret-token')
  if (presented !== config.webhookSecret) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  let update: TelegramUpdate
  try {
    update = (await request.json()) as TelegramUpdate
  } catch {
    return NextResponse.json({ ok: true })
  }

  try {
    const outcome = await handleTelegramUpdate(update)
    // Acknowledge first: Telegram spins the button until this lands.
    if (outcome.answerCallbackId) await answerCallbackQuery(outcome.answerCallbackId)
    if (outcome.reply) await sendTelegramMessage(outcome.reply.chatId, outcome.reply.text)
  } catch (error) {
    // Never echo the update: it carries whatever a stranger typed.
    console.error(
      'Telegram update handling failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
  }

  return NextResponse.json({ ok: true })
}
