import { eq } from 'drizzle-orm'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { students } from '@/db/schema'

/**
 * Accepting a proof-of-enrolment document, whatever route it arrived by.
 *
 * The website upload and the Telegram bot both end here, so the rules about what
 * is accepted and what it does to a student's status live in one place rather
 * than being written twice and drifting apart.
 */

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024
export const ALLOWED_DOCUMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const

export type IntakeFailure =
  | 'NO_STUDENT'
  /** Already approved. A new document must not quietly undo that. */
  | 'ALREADY_VERIFIED'
  | 'SUSPENDED'
  | 'TOO_LARGE'
  | 'WRONG_TYPE'
  | 'FAILED'

export type IntakeResult = { ok: true } | { ok: false; reason: IntakeFailure }

export type IncomingDocument = {
  data: Buffer
  mimetype: string
  name: string
  size: number
}

/**
 * Attach a document to a student and put them back in the review queue.
 *
 * Accepted only while they are PENDING or REJECTED. A VERIFIED student sending
 * another photograph must not reset their own approval, and a SUSPENDED one must
 * not be able to re-enter the queue by uploading again — that is an admin
 * decision to reverse, not theirs.
 */
export async function attachVerificationDocument(
  studentId: string,
  document: IncomingDocument,
): Promise<IntakeResult> {
  if (document.size > MAX_DOCUMENT_BYTES) return { ok: false, reason: 'TOO_LARGE' }
  if (!(ALLOWED_DOCUMENT_TYPES as readonly string[]).includes(document.mimetype)) {
    return { ok: false, reason: 'WRONG_TYPE' }
  }

  const [student] = await db
    .select({ verificationStatus: students.verificationStatus })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!student) return { ok: false, reason: 'NO_STUDENT' }
  if (student.verificationStatus === 'VERIFIED') return { ok: false, reason: 'ALREADY_VERIFIED' }
  if (student.verificationStatus === 'SUSPENDED') return { ok: false, reason: 'SUSPENDED' }

  try {
    const payload = await getPayload({ config })

    const uploaded = await payload.create({
      collection: 'student-documents',
      data: {},
      file: {
        data: document.data,
        mimetype: document.mimetype,
        name: document.name,
        size: document.size,
      },
    })

    await db
      .update(students)
      .set({
        verificationDocumentPath: String(uploaded.id),
        // Back to PENDING: a rejected student who sends a better photograph is
        // asking to be looked at again, and an admin decision is cleared with it.
        verificationStatus: 'PENDING',
        verificationReviewedBy: null,
        verificationReviewedAt: null,
        updatedAt: new Date(),
      })
      .where(eq(students.id, studentId))

    return { ok: true }
  } catch (error) {
    // The document is an identity paper. Nothing about its contents is logged.
    console.error(
      'Storing a verification document failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { ok: false, reason: 'FAILED' }
  }
}
