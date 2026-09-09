/**
 * Outbound email.
 *
 * Students verify their address by link, so the platform needs to send mail —
 * and sending mail costs money or needs an account somewhere. No provider is
 * chosen yet, so this is deliberately a stub with one honest behaviour: in
 * development it prints the message to the server console so the flow is
 * testable, and in production it refuses rather than silently dropping a
 * verification link a student is waiting for.
 *
 * When a provider is chosen (SES is the obvious one given the AWS account
 * already in use; Resend is simpler), replace the body of `sendEmail` and
 * nothing that calls it changes.
 */

export type OutboundEmail = {
  to: string
  subject: string
  /** Plain text. Keep it short — this is read on a phone. */
  text: string
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
 * Development counts as configured because the sender prints to the console,
 * which is a real delivery channel for a developer. Production does not, until a
 * provider is actually implemented in `sendEmail`.
 */
export function isEmailConfigured(): boolean {
  return process.env.NODE_ENV !== 'production'
}

export class EmailNotConfiguredError extends Error {
  constructor() {
    super('No email provider is configured. Set one up before running in production.')
    this.name = 'EmailNotConfiguredError'
  }
}

export async function sendEmail(message: OutboundEmail): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    // Failing loudly beats a student never receiving their verification link and
    // having no way to tell why.
    throw new EmailNotConfiguredError()
  }

  // Development only. The address is printed because it is the developer's own;
  // this branch never runs in production.
  console.info(
    ['', '─── email (development only, not sent) ───', `to:      ${message.to}`, `subject: ${message.subject}`, '', message.text, '─────────────────────────────────────────', ''].join('\n'),
  )
}
