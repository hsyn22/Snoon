import { getChatIdFor } from '@/db/queries/telegram'
import { registerChannel, type Notification, type NotificationResult } from '@/lib/notifications'
import { sendTelegramMessage } from './client'
import { isTelegramConfigured } from './config'

/**
 * Telegram as a notification channel.
 *
 * Registers itself only when a bot is actually configured, so an unconfigured
 * deployment reports NO_CHANNEL rather than failing sends.
 */
export function registerTelegramChannel(): void {
  if (!isTelegramConfigured()) return

  registerChannel({
    name: 'telegram',
    send: async (notification: Notification): Promise<NotificationResult> => {
      const chatId = await getChatIdFor(notification.recipient)
      // Not opted in. Not a failure — Telegram is always optional.
      if (!chatId) return 'NO_CHANNEL'

      const result = await sendTelegramMessage(chatId, notification.text)
      return result.ok ? 'SENT' : 'FAILED'
    },
  })
}
