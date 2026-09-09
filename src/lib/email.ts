/**
 * Outbound email, through Resend.
 *
 * Students verify their address by link, so the platform has to send mail. The
 * provider is Resend: its free tier covers 3,000 messages a month, which is far
 * beyond what student registration will produce, and it needs no AWS setup.
 *
 * Sent with plain `fetch` rather than the SDK. One POST is the whole API surface
 * used here, and a dependency that ships into the server bundle to build one
 * request is not worth it.
 *
 * A note that matters more than the code: Resend will only deliver to arbitrary
 * addresses once a **sending domain is verified**. Until then it accepts mail
 * only to the account owner's own address, which is enough to test and not
 * enough to launch. `EMAIL_FROM` must be on that verified domain.
 */

export type OutboundEmail = {
  to: string
  subject: string
  /** Plain text. Keep it short — this is read on a phone. */
  text: string
}

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

function resendConfig(): { apiKey: string; from: string } | null {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.EMAIL_FROM

  // Both, or neither. A key with no from address cannot send, and a from address
  // with no key is a deployment that thinks it can send and cannot.
  if (!apiKey || !from) return null
  return { apiKey, from }
}

/**
 * Whether email can actually be delivered right now.
 *
 * Callers must check this BEFORE starting a flow that depends on a message
 * arriving. Better Auth sends its verification email as a background task, so a
 * failure inside `sendEmail` never reaches the caller: sign-up appears to
 * succeed, the account row is written, no message goes out, and the student is
 * left with an account they can never verify or log into. Failing loudly inside
 * the sender is not enough — the flow has to refuse up front.
 *
 * Development counts as configured even with no provider, because the sender
 * prints to the console and that is a real delivery channel for a developer.
 */
export function isEmailConfigured(): boolean {
  if (resendConfig()) return true
  return process.env.NODE_ENV !== 'production'
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('No email provider is configured. Set RESEND_API_KEY and EMAIL_FROM.')
    this.name = 'EmailNotConfiguredError'
  }
}

export class EmailSendError extends Error {
  constructor(detail: string) {
    super(`Resend refused the message: ${detail}`)
    this.name = 'EmailSendError'
  }
}

export async function sendEmail(message: OutboundEmail): Promise<void> {
  const config = resendConfig()

  if (!config) {
    if (process.env.NODE_ENV === 'production') {
      // Failing loudly beats a student never receiving their verification link
      // and having no way to tell why.
      throw new EmailNotConfiguredError()
    }

    // Development only. The address is printed because it is the developer's
    // own; this branch never runs with a provider configured.
    console.info(
      [
        '',
        '─── email (development only, not sent) ───',
        `to:      ${message.to}`,
        `subject: ${message.subject}`,
        '',
        message.text,
        '─────────────────────────────────────────',
        '',
      ].join('\n'),
    )
    return
  }

  const response = await fetch(RESEND_ENDPOINT, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${config.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      from: config.from,
      to: [message.to],
      subject: message.subject,
      text: message.text,
    }),
  })

  if (!response.ok) {
    // The recipient's address is deliberately not in the message: this string
    // reaches logs, and an address is a person.
    const detail = await response.text().catch(() => '')
    throw new EmailSendError(`${response.status} ${detail.slice(0, 200)}`)
  }
}
