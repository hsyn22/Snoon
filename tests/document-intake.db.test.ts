import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Accepting a proof-of-enrolment document.
 *
 * Both routes — the website and the bot — end in `attachVerificationDocument`,
 * so the rules about what it may do to a student's standing are tested once,
 * here.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('verification document intake', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { students } = await import('@/db/schema')
  const { attachVerificationDocument, MAX_DOCUMENT_BYTES } = await import(
    '@/lib/students/document-intake'
  )

  const studentIds: string[] = []

  async function makeStudent(
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' = 'PENDING',
  ) {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `doc-${crypto.randomUUID()}`,
        fullName: 'طالب',
        universityId: 'u',
        collegeId: 'c',
        stageId: 'stage-4',
        verificationStatus: status,
        verificationReviewedBy: status === 'REJECTED' ? 'admin@example.com' : null,
        verificationReviewedAt: status === 'REJECTED' ? new Date() : null,
      })
      .returning({ id: students.id })
    studentIds.push(row!.id)
    return row!.id
  }

  function document(overrides: Partial<{ size: number; mimetype: string }> = {}) {
    // A tiny valid PNG, so Payload's own handling is exercised rather than mocked.
    const data = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
      'base64',
    )
    return {
      data,
      mimetype: overrides.mimetype ?? 'image/png',
      name: 'student-id.png',
      size: overrides.size ?? data.byteLength,
    }
  }

  async function statusOf(studentId: string) {
    const [row] = await db
      .select({
        status: students.verificationStatus,
        path: students.verificationDocumentPath,
        reviewedBy: students.verificationReviewedBy,
      })
      .from(students)
      .where(eq(students.id, studentId))
    return row
  }

  afterAll(async () => {
    if (studentIds.length > 0) await db.delete(students).where(inArray(students.id, studentIds))
  })

  it('attaches the document and leaves the student pending review', async () => {
    const studentId = await makeStudent('PENDING')
    expect(await attachVerificationDocument(studentId, document())).toEqual({ ok: true })

    const after = await statusOf(studentId)
    expect(after?.status).toBe('PENDING')
    expect(after?.path).toBeTruthy()
  })

  it('puts a rejected student back in the queue and clears the old decision', async () => {
    // A rejected student sending a clearer photograph is asking to be looked at
    // again; leaving the previous reviewer on the record would be misleading.
    const studentId = await makeStudent('REJECTED')
    expect(await attachVerificationDocument(studentId, document())).toEqual({ ok: true })

    const after = await statusOf(studentId)
    expect(after?.status).toBe('PENDING')
    expect(after?.reviewedBy).toBeNull()
  })

  it('refuses to undo an approval', async () => {
    const studentId = await makeStudent('VERIFIED')
    expect(await attachVerificationDocument(studentId, document())).toEqual({
      ok: false,
      reason: 'ALREADY_VERIFIED',
    })
    expect((await statusOf(studentId))?.status).toBe('VERIFIED')
  })

  it('refuses a suspended student re-entering the queue on their own', async () => {
    // Reversing a suspension is an admin decision, not the student's.
    const studentId = await makeStudent('SUSPENDED')
    expect(await attachVerificationDocument(studentId, document())).toEqual({
      ok: false,
      reason: 'SUSPENDED',
    })
    expect((await statusOf(studentId))?.status).toBe('SUSPENDED')
  })

  it('refuses a file over the size cap', async () => {
    const studentId = await makeStudent()
    expect(
      await attachVerificationDocument(studentId, document({ size: MAX_DOCUMENT_BYTES + 1 })),
    ).toEqual({ ok: false, reason: 'TOO_LARGE' })
  })

  it.each(['text/html', 'application/zip', 'image/svg+xml'])('refuses %s', async (mimetype) => {
    const studentId = await makeStudent()
    expect(await attachVerificationDocument(studentId, document({ mimetype }))).toEqual({
      ok: false,
      reason: 'WRONG_TYPE',
    })
  })

  it('refuses a student id that does not exist', async () => {
    expect(await attachVerificationDocument(crypto.randomUUID(), document())).toEqual({
      ok: false,
      reason: 'NO_STUDENT',
    })
  })
})
