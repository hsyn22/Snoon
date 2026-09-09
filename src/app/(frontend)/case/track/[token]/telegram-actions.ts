'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { headers } from 'next/headers'
import { db } from '@/db'
import { cases } from '@/db/schema'
import { createInvite } from '@/db/queries/telegram'
import { hashTrackingToken } from '@/lib/tracking-token'
import { buildDeepLink, getTelegramConfig } from '@/lib/telegram/config'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'

export type InviteState = { deepLink?: string; error?: string }

/**
 * Mint a Telegram invite for the patient holding this tracking token.
 *
 * The case is identified by the tracking token, never by an id from the form:
 * a case id would let anyone request an invite for a case they do not hold, and
 * an invite grants that case's notifications.
 */
export async function createPatientInviteAction(
  _previous: InviteState,
  formData: FormData,
): Promise<InviteState> {
  const config = getTelegramConfig()
  if (!config) return { error: 'unavailable' }

  const trackingToken = String(formData.get('trackingToken') ?? '')
  if (!trackingToken) return { error: 'unavailable' }

  // Minting an invite writes a row and costs a Telegram round trip; a token
  // holder refreshing is normal, a script is not.
  const limited = checkRateLimit(
    `telegram-invite:${clientIp(await headers())}`,
    RATE_LIMITS.telegramInvite,
  )
  if (!limited.ok) return { error: 'unavailable' }

  const [record] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(
      and(
        eq(cases.trackingTokenHash, hashTrackingToken(trackingToken)),
        isNull(cases.trackingTokenRevokedAt),
      ),
    )
    .limit(1)

  if (!record) return { error: 'unavailable' }

  const invite = await createInvite({ type: 'PATIENT_CASE', id: record.id })
  return { deepLink: buildDeepLink(config, invite) }
}
