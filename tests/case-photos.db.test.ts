import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'
import sharp from 'sharp'

/**
 * Intraoral photographs: who may see them, and when they are destroyed.
 *
 * These are pictures inside a patient's mouth. The access rules are the point of
 * the feature being safe to have at all.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('case photographs', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { casePhotos, cases, students } = await import('@/db/schema')
  const { submitCase, attachCasePhoto } = await import('@/db/queries/cases')
  const { canViewCasePhoto, listCasePhotos } = await import('@/db/queries/case-photos')
  const { deleteExpiredCasePhotos } = await import('@/lib/images/retention')
  const { processCasePhoto } = await import('@/lib/images/process')
  const { getPayload } = await import('payload')
  const { default: payloadConfig } = await import('@payload-config')

  const caseIds: string[] = []
  const studentIds: string[] = []
  const tokens = new Map<string, string>()

  async function makeCaseWithPhoto() {
    const submitted = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض',
      patientPhone: '07701234567',
      notes: null,
    })
    caseIds.push(submitted.caseId)
    tokens.set(submitted.caseId, submitted.trackingToken)

    const source = await sharp({
      create: { width: 60, height: 40, channels: 3, background: { r: 180, g: 120, b: 120 } },
    })
      .jpeg()
      .toBuffer()

    const processed = await processCasePhoto(source)
    expect(processed.ok).toBe(true)
    if (!processed.ok) throw new Error('processing failed')

    const payload = await getPayload({ config: payloadConfig })
    const media = await payload.create({
      collection: 'case-photos',
      data: {},
      file: {
        data: processed.photo.data,
        mimetype: 'image/webp',
        name: 'case-photo-1.webp',
        size: processed.photo.bytes,
      },
    })
    await attachCasePhoto(submitted.caseId, String(media.id))

    const [photo] = await listCasePhotos(submitted.caseId)
    return { caseId: submitted.caseId, photoId: photo!.id, token: submitted.trackingToken }
  }

  async function makeStudent(
    status: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED' = 'VERIFIED',
  ) {
    const authUserId = `photo-${crypto.randomUUID()}`
    const [row] = await db
      .insert(students)
      .values({
        authUserId,
        fullName: 'طالب',
        universityId: 'u',
        collegeId: 'c',
        stageId: 'stage-4',
        verificationStatus: status,
      })
      .returning({ id: students.id })
    studentIds.push(row!.id)
    return authUserId
  }

  afterAll(async () => {
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    if (studentIds.length > 0) await db.delete(students).where(inArray(students.id, studentIds))
  })

  describe('who may look', () => {
    it('allows an admin', async () => {
      const { photoId } = await makeCaseWithPhoto()
      expect(await canViewCasePhoto(photoId, { kind: 'ADMIN' })).toBe(true)
    })

    it('allows a verified student, before claiming as well as after', async () => {
      // Photographs are how a student judges whether they can treat a case, so
      // the access table allows them before the claim.
      const { photoId } = await makeCaseWithPhoto()
      const authUserId = await makeStudent('VERIFIED')
      expect(await canViewCasePhoto(photoId, { kind: 'STUDENT', authUserId })).toBe(true)
    })

    it.each(['PENDING', 'REJECTED', 'SUSPENDED'] as const)('refuses a %s student', async (status) => {
      const { photoId } = await makeCaseWithPhoto()
      const authUserId = await makeStudent(status)
      expect(await canViewCasePhoto(photoId, { kind: 'STUDENT', authUserId })).toBe(false)
    })

    it('refuses a session that belongs to no student at all', async () => {
      const { photoId } = await makeCaseWithPhoto()
      expect(
        await canViewCasePhoto(photoId, { kind: 'STUDENT', authUserId: 'nobody' }),
      ).toBe(false)
    })

    it('allows the patient holding the tracking token for that case', async () => {
      const { photoId, token } = await makeCaseWithPhoto()
      expect(await canViewCasePhoto(photoId, { kind: 'PATIENT', trackingToken: token })).toBe(true)
    })

    it("refuses another patient's tracking token", async () => {
      const mine = await makeCaseWithPhoto()
      const theirs = await makeCaseWithPhoto()
      expect(
        await canViewCasePhoto(mine.photoId, { kind: 'PATIENT', trackingToken: theirs.token }),
      ).toBe(false)
    })

    it('refuses a junk tracking token', async () => {
      const { photoId } = await makeCaseWithPhoto()
      expect(
        await canViewCasePhoto(photoId, { kind: 'PATIENT', trackingToken: 'not-a-token' }),
      ).toBe(false)
    })

    it('refuses a photograph that does not exist', async () => {
      expect(await canViewCasePhoto(crypto.randomUUID(), { kind: 'ADMIN' })).toBe(false)
    })
  })

  describe('retention', () => {
    it('deletes photographs once a closed case is past the retention period', async () => {
      const { caseId, photoId } = await makeCaseWithPhoto()
      await db
        .update(cases)
        .set({ status: 'COMPLETED', updatedAt: new Date('2020-01-01') })
        .where(eq(cases.id, caseId))

      expect(await deleteExpiredCasePhotos(new Date('2021-01-01'))).toBeGreaterThanOrEqual(1)

      // The row survives, marked: a case with no photographs must not be
      // indistinguishable from one that never had any.
      const [row] = await db
        .select({ deletedAt: casePhotos.deletedAt })
        .from(casePhotos)
        .where(eq(casePhotos.id, photoId))
      expect(row?.deletedAt).not.toBeNull()

      expect(await canViewCasePhoto(photoId, { kind: 'ADMIN' })).toBe(false)
      expect(await listCasePhotos(caseId)).toEqual([])
    })

    it('never deletes photographs on a case still being treated', async () => {
      const { caseId, photoId } = await makeCaseWithPhoto()
      await db
        .update(cases)
        .set({ status: 'APPOINTMENT_CONFIRMED', updatedAt: new Date('2020-01-01') })
        .where(eq(cases.id, caseId))

      await deleteExpiredCasePhotos(new Date('2021-01-01'))

      expect(await canViewCasePhoto(photoId, { kind: 'ADMIN' })).toBe(true)
    })

    it('leaves a recently closed case alone', async () => {
      const { caseId, photoId } = await makeCaseWithPhoto()
      await db.update(cases).set({ status: 'COMPLETED' }).where(eq(cases.id, caseId))

      await deleteExpiredCasePhotos(new Date('2020-01-01'))
      expect(await canViewCasePhoto(photoId, { kind: 'ADMIN' })).toBe(true)
    })
  })
})
