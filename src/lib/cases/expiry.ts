import { and, eq, lte } from 'drizzle-orm'
import { db } from '@/db'
import { cases, claims } from '@/db/schema'
import { releaseClaim } from '@/db/queries/claims'
import { telegramCopy } from '@/lib/copy'
import { sendNotification } from '@/lib/notifications/send'
import { CASE_REASON } from './reasons'

/**
 * The scheduled job that returns uncontacted cases to the queue.
 *
 * Runs over an indexed query rather than a timer set at claim time — a timer
 * would not survive a deploy. Notification happens after each release and is
 * best-effort: a case that was correctly returned to the queue must not stay
 * claimed because a message failed to send.
 */
export type ExpiryReport = { released: number; notified: number }

export async function expireOverdueClaimsAndNotify(
  now: Date = new Date(),
): Promise<ExpiryReport> {
  const overdue = await db
    .select({
      claimId: claims.id,
      caseId: claims.caseId,
      studentId: claims.studentId,
      referenceCode: cases.referenceCode,
    })
    .from(claims)
    .innerJoin(cases, eq(cases.id, claims.caseId))
    .where(and(eq(claims.status, 'ACTIVE'), lte(claims.contactDeadlineAt, now)))

  let released = 0
  let notified = 0

  for (const entry of overdue) {
    const ok = await releaseClaim(entry.claimId, {
      reason: CASE_REASON.CONTACT_WINDOW_EXPIRED,
      actorType: 'SYSTEM',
    })
    if (!ok) continue
    released += 1

    // Both sides are told, and neither send can undo the release above.
    const results = await Promise.all([
      sendNotification({
        recipient: { kind: 'PATIENT_CASE', caseId: entry.caseId },
        text: telegramCopy.caseReturned(entry.referenceCode),
      }),
      sendNotification({
        recipient: { kind: 'STUDENT', studentId: entry.studentId },
        text: telegramCopy.claimExpired,
      }),
    ])
    notified += results.filter((result) => result === 'SENT').length
  }

  return { released, notified }
}
