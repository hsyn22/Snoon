import { getCaseExpiryDays, getPhotoRetentionDays } from '@/lib/config/settings'
import { deleteExpiredCasePhotos } from '@/lib/images/retention'
import { expireOverdueClaimsAndNotify } from './expiry'
import { expireStaleRequestedCases } from './lifecycle'

/**
 * Everything that has to happen on a timer rather than because someone clicked.
 *
 * Two jobs, run together because they are cheap and both want the same cadence:
 *
 * 1. Claims whose contact window ran out — the case goes back to the queue and
 *    both sides are told. Without this a student who never called holds a
 *    patient's case indefinitely, which is the failure the whole window exists
 *    to prevent.
 * 2. Cases nobody ever claimed, past their useful life.
 *
 * Idempotent by construction: every transition inside is a conditional update
 * guarded by the status it may come from, so running this twice in a minute — or
 * two schedulers racing — changes nothing the first run already did.
 */
export type ScheduledRunReport = {
  claimsExpired: number
  claimNotificationsSent: number
  casesExpired: number
  photosDeleted: number
  ranAt: string
}

export async function runScheduledJobs(now: Date = new Date()): Promise<ScheduledRunReport> {
  const expiryDays = await getCaseExpiryDays()
  const cutoff = new Date(now.getTime() - expiryDays * 24 * 60 * 60 * 1000)

  // Contact windows first: a claim released here puts its case back to
  // REQUESTED, and an old case doing that should still be eligible to expire on
  // the same run rather than lingering an extra cycle.
  const claims = await expireOverdueClaimsAndNotify(now)
  const casesExpired = await expireStaleRequestedCases(cutoff)

  const retentionDays = await getPhotoRetentionDays()
  const photoCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000)
  const photosDeleted = await deleteExpiredCasePhotos(photoCutoff)

  return {
    claimsExpired: claims.released,
    claimNotificationsSent: claims.notified,
    casesExpired,
    photosDeleted,
    ranAt: now.toISOString(),
  }
}
