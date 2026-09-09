/**
 * Telegram configuration.
 *
 * Telegram is what replaces SMS: free to send on, which is the whole reason it
 * is here. Nothing in the product may *require* it — a patient who never opts in
 * must still be reachable by phone and must still be able to use their tracking
 * link — so every caller has to cope with it being unconfigured.
 */

export type TelegramConfig = {
  botToken: string
  botUsername: string
  /** Verifies that an incoming webhook really came from Telegram. */
  webhookSecret: string
}

/** Null when no bot has been set up, which is a normal state, not an error. */
export function getTelegramConfig(): TelegramConfig | null {
  const botToken = process.env.TELEGRAM_BOT_TOKEN
  const botUsername = process.env.TELEGRAM_BOT_USERNAME
  const webhookSecret = process.env.TELEGRAM_WEBHOOK_SECRET

  if (!botToken || !botUsername || !webhookSecret) return null

  return { botToken, botUsername, webhookSecret }
}

export function isTelegramConfigured(): boolean {
  return getTelegramConfig() !== null
}

/**
 * The link a person opens to turn notifications on.
 *
 * Telegram passes whatever follows `start=` to the bot as the first message, and
 * limits it to 64 characters of `A-Za-z0-9_-`. The invite token is base64url of
 * 32 random bytes — 43 characters — so it fits without encoding tricks.
 */
export function buildDeepLink(config: TelegramConfig, inviteToken: string): string {
  return `https://t.me/${config.botUsername}?start=${inviteToken}`
}
