import { and, eq, inArray, isNull, lte } from 'drizzle-orm'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { casePhotos, cases } from '@/db/schema'

/**
 * Deleting intraoral photographs once a case is over.
 *
 * They exist to help a student treat someone. After that they are pictures
 * inside a stranger's mouth sitting on a disk, and every day they stay is
 * exposure with no remaining purpose.
 *
 * The row is kept and marked deleted rather than removed, so the audit trail
 * still shows a photograph existed and when it went — a case that silently has
 * no photographs is indistinguishable from one that never had any.
 */

/** Cases past treating. NO_SHOW and CANCELLED count: nobody is coming back to them. */
const TERMINAL_STATUSES = ['COMPLETED', 'NO_SHOW', 'CANCELLED', 'EXPIRED'] as const

export async function deleteExpiredCasePhotos(olderThan: Date): Promise<number> {
  const due = await db
    .select({ id: casePhotos.id, mediaId: casePhotos.mediaId })
    .from(casePhotos)
    .innerJoin(cases, eq(cases.id, casePhotos.caseId))
    .where(
      and(
        isNull(casePhotos.deletedAt),
        inArray(cases.status, [...TERMINAL_STATUSES]),
        // Measured from when the case ended, not when the photograph arrived.
        lte(cases.updatedAt, olderThan),
      ),
    )

  if (due.length === 0) return 0

  const payload = await getPayload({ config })
  let deleted = 0

  for (const photo of due) {
    try {
      await payload.delete({ collection: 'case-photos', id: photo.mediaId, overrideAccess: true })
    } catch {
      // Already gone — an admin may have removed it by hand. Still mark the row,
      // so it is not retried forever.
    }

    await db
      .update(casePhotos)
      .set({ deletedAt: new Date(), deletedReason: 'Retention period elapsed after the case closed.' })
      .where(eq(casePhotos.id, photo.id))

    deleted += 1
  }

  return deleted
}
