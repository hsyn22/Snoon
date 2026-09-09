import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { casePhotos, cases, claims, students } from '@/db/schema'
import { hashTrackingToken } from '@/lib/tracking-token'

/**
 * Who may look at an intraoral photograph.
 *
 * The access table in CLAUDE.md allows three: an admin, a verified student
 * (before claiming as well as after — it is how they judge whether they can
 * treat the case), and the patient themselves through their tracking token.
 * Nobody else, ever, and there is no unauthenticated URL that serves one.
 */

export type PhotoViewer =
  | { kind: 'ADMIN' }
  | { kind: 'STUDENT'; authUserId: string }
  | { kind: 'PATIENT'; trackingToken: string }

/** The live photographs on a case, oldest first. */
export async function listCasePhotos(caseId: string): Promise<{ id: string; mediaId: string }[]> {
  return db
    .select({ id: casePhotos.id, mediaId: casePhotos.mediaId })
    .from(casePhotos)
    .where(and(eq(casePhotos.caseId, caseId), isNull(casePhotos.deletedAt)))
    .orderBy(casePhotos.createdAt)
}

/**
 * Whether this viewer may see this specific photograph.
 *
 * Resolved from the photograph rather than trusting a case id from the caller:
 * the request names a photo, so the case it belongs to is looked up here.
 */
export async function canViewCasePhoto(photoId: string, viewer: PhotoViewer): Promise<boolean> {
  const [photo] = await db
    .select({ caseId: casePhotos.caseId })
    .from(casePhotos)
    .where(and(eq(casePhotos.id, photoId), isNull(casePhotos.deletedAt)))
    .limit(1)

  if (!photo) return false
  if (viewer.kind === 'ADMIN') return true

  if (viewer.kind === 'STUDENT') {
    // Verification is re-read now, not taken from the session: a student
    // suspended a moment ago must stop seeing photographs immediately.
    const [student] = await db
      .select({ verificationStatus: students.verificationStatus })
      .from(students)
      .where(eq(students.authUserId, viewer.authUserId))
      .limit(1)

    return student?.verificationStatus === 'VERIFIED'
  }

  // The patient, identified by the tracking token for their own case.
  const [owned] = await db
    .select({ id: cases.id })
    .from(cases)
    .where(
      and(
        eq(cases.id, photo.caseId),
        eq(cases.trackingTokenHash, hashTrackingToken(viewer.trackingToken)),
        isNull(cases.trackingTokenRevokedAt),
      ),
    )
    .limit(1)

  return Boolean(owned)
}

/** The Payload media id behind a photograph, once the viewer has been allowed. */
export async function getPhotoMediaId(photoId: string): Promise<string | null> {
  const [row] = await db
    .select({ mediaId: casePhotos.mediaId })
    .from(casePhotos)
    .where(and(eq(casePhotos.id, photoId), isNull(casePhotos.deletedAt)))
    .limit(1)

  return row?.mediaId ?? null
}

/** Whether a student currently holds an active claim on the photo's case. */
export async function studentHoldsCaseForPhoto(
  photoId: string,
  studentId: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: claims.id })
    .from(casePhotos)
    .innerJoin(claims, eq(claims.caseId, casePhotos.caseId))
    .where(
      and(
        eq(casePhotos.id, photoId),
        eq(claims.studentId, studentId),
        eq(claims.status, 'ACTIVE'),
      ),
    )
    .limit(1)

  return Boolean(row)
}
