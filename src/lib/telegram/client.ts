import { getTelegramConfig } from './config'

/**
 * The thin slice of the Telegram Bot API this project uses.
 *
 * Telegram charges nothing per message, which is what makes it the answer to the
 * no-SMS constraint rather than a workaround for it.
 */

const API_TIMEOUT_MS = 10_000

export type SendResult = { ok: true } | { ok: false; reason: string }

/** One row of tappable buttons under a message. */
export type InlineButton = { text: string; callbackData: string }

export async function sendTelegramMessage(
  chatId: string,
  text: string,
  buttons?: readonly InlineButton[],
): Promise<SendResult> {
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
        ...(buttons && buttons.length > 0
          ? {
              reply_markup: {
                inline_keyboard: [
                  buttons.map((button) => ({
                    text: button.text,
                    callback_data: button.callbackData,
                  })),
                ],
              },
            }
          : {}),
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

/**
 * Acknowledge a button tap.
 *
 * Telegram shows a loading spinner on the button until this is called, so
 * skipping it leaves the patient looking at a control that appears stuck.
 */
export async function answerCallbackQuery(callbackQueryId: string, text?: string): Promise<void> {
  const config = getTelegramConfig()
  if (!config) return

  try {
    await fetch(`https://api.telegram.org/bot${config.botToken}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    })
  } catch {
    // Cosmetic. A failure here must not affect the decision already recorded.
  }
}

/**
 * Download a file a person sent to the bot.
 *
 * Two steps by Telegram's design: `getFile` resolves an opaque file id to a
 * path, then the file is fetched from a separate host. The size is checked
 * before downloading, not after, so a large file is refused rather than pulled
 * into memory first.
 */
export type DownloadedFile = {
  data: Buffer
  /** Telegram's own name for it, used only to derive an extension. */
  path: string
  size: number
}

export type DownloadResult =
  | { ok: true; file: DownloadedFile }
  | { ok: false; reason: 'not-configured' | 'too-large' | 'unavailable' }

export async function downloadTelegramFile(
  fileId: string,
  maxBytes: number,
): Promise<DownloadResult> {
  const config = getTelegramConfig()
  if (!config) return { ok: false, reason: 'not-configured' }

  try {
    const lookup = await fetch(
      `https://api.telegram.org/bot${config.botToken}/getFile?file_id=${encodeURIComponent(fileId)}`,
      { signal: AbortSignal.timeout(API_TIMEOUT_MS) },
    )
    const body = (await lookup.json()) as {
      ok?: boolean
      result?: { file_path?: string; file_size?: number }
    }

    const filePath = body.result?.file_path
    if (!body.ok || !filePath) return { ok: false, reason: 'unavailable' }

    const declaredSize = body.result?.file_size
    if (typeof declaredSize === 'number' && declaredSize > maxBytes) {
      return { ok: false, reason: 'too-large' }
    }

    const download = await fetch(
      `https://api.telegram.org/file/bot${config.botToken}/${filePath}`,
      { signal: AbortSignal.timeout(API_TIMEOUT_MS * 3) },
    )
    if (!download.ok) return { ok: false, reason: 'unavailable' }

    const data = Buffer.from(await download.arrayBuffer())
    // Checked again against what actually arrived: the declared size is a claim
    // from the same message the file came in.
    if (data.byteLength > maxBytes) return { ok: false, reason: 'too-large' }

    return { ok: true, file: { data, path: filePath, size: data.byteLength } }
  } catch {
    return { ok: false, reason: 'unavailable' }
  }
}
