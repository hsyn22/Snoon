/**
 * Notifications, behind an interface.
 *
 * A case status change must not know or care which channel carried the message.
 * Today the only channel is Telegram; the send path is deliberately narrow so a
 * second one is added here rather than threaded through the domain.
 *
 * Every send is best-effort. Notifying is never a precondition for a state
 * change: a claim that succeeded must not be undone because a message failed to
 * deliver, and a patient who never opted in must be unaffected.
 */

export type NotificationRecipient =
  | { kind: 'PATIENT_CASE'; caseId: string }
  | { kind: 'STUDENT'; studentId: string }

export type Notification = {
  recipient: NotificationRecipient
  /** Plain text, already in Arabic. Never contains a phone number. */
  text: string
}

export type NotificationResult = 'SENT' | 'NO_CHANNEL' | 'FAILED'

export type NotificationChannel = {
  name: string
  send: (notification: Notification) => Promise<NotificationResult>
}

const channels: NotificationChannel[] = []

export function registerChannel(channel: NotificationChannel): void {
  if (!channels.some((existing) => existing.name === channel.name)) channels.push(channel)
}

export function registeredChannelNames(): readonly string[] {
  return channels.map((channel) => channel.name)
}

/**
 * Send on every configured channel that has a route to this recipient.
 *
 * Never throws. A failure is logged and swallowed — see the note above about
 * notification never being a precondition for anything.
 */
export async function notify(notification: Notification): Promise<NotificationResult> {
  if (channels.length === 0) return 'NO_CHANNEL'

  const results = await Promise.all(
    channels.map(async (channel) => {
      try {
        return await channel.send(notification)
      } catch (error) {
        console.error(
          `Notification channel ${channel.name} failed:`,
          error instanceof Error ? error.message : 'unknown error',
        )
        return 'FAILED' as const
      }
    }),
  )

  if (results.includes('SENT')) return 'SENT'
  if (results.includes('FAILED')) return 'FAILED'
  return 'NO_CHANNEL'
}

/** Test seam: drops every registered channel. */
export function clearChannels(): void {
  channels.length = 0
}
