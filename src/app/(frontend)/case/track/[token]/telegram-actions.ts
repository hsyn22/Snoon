'use server'

import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { cases, telegramLinks } from '@/db/schema'
import { createInvite } from '@/db/queries/telegram'
import { hashTrackingToken } from '@/lib/tracking-token'
import { buildDeepLink, getTelegramConfig } from '@/lib/telegram/config'

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

/** Whether this case already has a chat bound, so the page can say so. */
export async function isPatientLinked(caseId: string): Promise<boolean> {
  const [row] = await db
    .select({ chatId: telegramLinks.chatId })
    .from(telegramLinks)
    .where(
      and(
        eq(telegramLinks.subjectType, 'PATIENT_CASE'),
        eq(telegramLinks.subjectId, caseId),
        isNull(telegramLinks.revokedAt),
      ),
    )
    .limit(1)

  return Boolean(row?.chatId)
}
