import { answerCallbackQuery, sendTelegramMessage } from './client'
import { getTelegramConfig } from './config'
import { handleTelegramUpdate, type TelegramUpdate } from './webhook'

/**
 * Long-polling for local development.
 *
 * Telegram delivers updates by calling a webhook, which needs a public URL the
 * site does not have while it runs on a laptop. `getUpdates` is the documented
 * alternative and lets the whole bot be exercised against real Telegram before
 * anything is deployed.
 *
 * It shares `handleTelegramUpdate` with the webhook route, so what is tested
 * here is the same code that will run in production — only the delivery
 * mechanism differs. Never run this alongside a registered webhook: Telegram
 * refuses getUpdates while one is set, which is a useful safeguard rather than
 * a nuisance.
 */

const POLL_TIMEOUT_SECONDS = 25

async function main(): Promise<void> {
  const config = getTelegramConfig()
  if (!config) {
    console.error('No bot configured. Set TELEGRAM_BOT_TOKEN, _USERNAME and _WEBHOOK_SECRET.')
    process.exit(1)
  }

  const me = await fetch(`https://api.telegram.org/bot${config.botToken}/getMe`).then((r) =>
    r.json(),
  )
  console.info(`Polling as @${me?.result?.username ?? 'unknown'}. Ctrl-C to stop.`)

  let offset = 0

  for (;;) {
    const updates: TelegramUpdate[] = []

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${config.botToken}/getUpdates?timeout=${POLL_TIMEOUT_SECONDS}&offset=${offset}`,
        { signal: AbortSignal.timeout((POLL_TIMEOUT_SECONDS + 10) * 1000) },
      )
      const body = (await response.json()) as {
        ok?: boolean
        description?: string
        result?: (TelegramUpdate & { update_id: number })[]
      }

      if (!body.ok) {
        console.error('getUpdates rejected:', body.description)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        continue
      }

      for (const update of body.result ?? []) {
        // Acknowledged by advancing past it, so a crash mid-handling replays it
        // rather than losing it.
        offset = Math.max(offset, update.update_id + 1)
        updates.push(update)
      }
    } catch (error) {
      console.error('poll failed:', error instanceof Error ? error.message : 'unknown')
      await new Promise((resolve) => setTimeout(resolve, 3000))
      continue
    }

    for (const update of updates) {
      try {
        const outcome = await handleTelegramUpdate(update)
        if (outcome.answerCallbackId) await answerCallbackQuery(outcome.answerCallbackId)
        if (outcome.reply) {
          const sent = await sendTelegramMessage(outcome.reply.chatId, outcome.reply.text)
          console.info(
            sent.ok
              ? `replied to chat ${outcome.reply.chatId}`
              : `reply to ${outcome.reply.chatId} failed: ${sent.reason}`,
          )
        } else {
          console.info('update handled with no reply')
        }
      } catch (error) {
        // Never log the update itself: it carries whatever a stranger typed.
        console.error(
          'update handling failed:',
          error instanceof Error ? error.message : 'unknown error',
        )
      }
    }
  }
}

await main()
