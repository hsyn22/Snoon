import { registerTelegramChannel } from '@/lib/telegram/channel'
import { notify, type Notification, type NotificationResult } from './index'

/**
 * The entry point every caller should use.
 *
 * Channel registration is idempotent and happens here rather than at startup,
 * because a serverless runtime may start a fresh process for any request and a
 * channel registered only in one of them is a channel that silently stops
 * working.
 */
let registered = false

function ensureChannels(): void {
  if (registered) return
  registerTelegramChannel()
  registered = true
}

export async function sendNotification(notification: Notification): Promise<NotificationResult> {
  ensureChannels()
  return notify(notification)
}
