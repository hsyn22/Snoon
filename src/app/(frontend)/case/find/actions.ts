'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { recoverTrackingLink } from '@/db/queries/case-recovery'
import { caseRecovery } from '@/lib/copy'
import { normalisePhone } from '@/lib/phone'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'

export type RecoveryFormState = {
  error?: string
  /** Handed back so a rejected attempt does not empty the form. */
  values?: { referenceCode?: string }
}

/**
 * Getting a lost tracking link back.
 *
 * The rate limit is the real security control here, not the comparison. Someone
 * who knows a phone number could otherwise walk the reference-code space from
 * one address; at ten attempts an hour they cannot.
 *
 * The submitted phone number is deliberately NOT handed back to the form on
 * failure. Everywhere else in سنون a rejected form keeps what was typed, because
 * losing a filled-in case form is where a patient gives up — but this form is
 * two fields, and echoing a phone number into the HTML of a page that just
 * refused is how a number ends up in a shared browser's cache for the next
 * person. The code comes back; the number is retyped.
 */
export async function findCaseAction(
  _previous: RecoveryFormState,
  formData: FormData,
): Promise<RecoveryFormState> {
  const referenceCode = String(formData.get('referenceCode') ?? '').trim()
  const phoneInput = String(formData.get('patientPhone') ?? '').trim()

  if (!referenceCode || !phoneInput) {
    return { error: caseRecovery.errors.bothRequired, values: { referenceCode } }
  }

  const limited = checkRateLimit(`case-find:${clientIp(await headers())}`, RATE_LIMITS.caseRecovery)
  if (!limited.ok) return { error: caseRecovery.errors.tooMany, values: { referenceCode } }

  const result = await recoverTrackingLink({
    referenceCode,
    // An unparseable number is simply a number that matches nothing. Reporting
    // "that is not a valid Iraqi mobile" separately would tell an attacker which
    // half of their guess to keep.
    patientPhone: normalisePhone(phoneInput),
  })

  // One message for every failure — a wrong code, a wrong number, a case that
  // never existed, a link that was revoked. Any difference between them turns
  // this form into a way to ask "does this case exist" or "is this the number
  // on it".
  if (!result.ok) return { error: caseRecovery.errors.noMatch, values: { referenceCode } }

  redirect(`/case/track/${result.trackingToken}`)
}
