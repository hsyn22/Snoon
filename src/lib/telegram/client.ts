import { getTelegramConfig } from './config'

/**
 * The thin slice of the Telegram Bot API this project uses.
 *
 * Telegram charges nothing per message, which is what makes it the answer to the
 * no-SMS constraint rather than a workaround for it.
 */

const API_TIMEOUT_MS = 10_000

export type SendResult = { ok: true } | { ok: false; reason: string }

export async function sendTelegramMessage(chatId: string, text: string): Promise<SendResult> {
  const config = getTelegramConfig()
  if (!config) return { ok: false, reason: 'not-configured' }

  try {
    const response = await fetch(`https://api.telegram.org/bot${config.botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        // Plain text: message bodies are Arabic copy that may contain characters
        // Telegram's markdown parser would reject, and a failed parse means an
        // undelivered message rather than an ugly one.
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })

    if (!response.ok) {
      // The body can name the chat; the status is enough to act on.
      return { ok: false, reason: `http-${response.status}` }
    }

    const body = (await response.json()) as { ok?: boolean; description?: string }
    if (!body.ok) return { ok: false, reason: body.description ?? 'telegram-rejected' }

    return { ok: true }
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : 'unknown-error' }
  }
}
