import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * A student sending their enrolment document to the bot.
 *
 * The routing is what matters here: who is allowed to land in the verification
 * queue, and what happens to everything that should not. The rules about what a
 * document does to a student's standing are covered in document-intake.db.test.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('telegram document intake', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, students, telegramLinks } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { createInvite, linkChat } = await import('@/db/queries/telegram')
  const { handleTelegramUpdate } = await import('@/lib/telegram/webhook')
  const { telegramCopy, telegramStudentDoc } = await import('@/lib/copy')

  const caseIds: string[] = []
  const studentIds: string[] = []

  async function makeCaseBoundTo(chatId: string) {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض',
      patientPhone: '07701234567',
      notes: null,
    })
    const [row] = await db.select({ id: cases.id }).from(cases).where(eq(cases.referenceCode, referenceCode))
    caseIds.push(row!.id)
    await linkChat(await createInvite({ type: 'PATIENT_CASE', id: row!.id }), chatId)
    return row!.id
  }

  async function makeStudentBoundTo(chatId: string) {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `tgdoc-${crypto.randomUUID()}`,
        fullName: 'طالب',
        universityId: 'u',
        collegeId: 'c',
        stageId: 'stage-4',
        verificationStatus: 'PENDING',
      })
      .returning({ id: students.id })
    studentIds.push(row!.id)
    await linkChat(await createInvite({ type: 'STUDENT', id: row!.id }), chatId)
    return row!.id
  }

  afterAll(async () => {
    if (caseIds.length > 0) {
      await db.delete(telegramLinks).where(inArray(telegramLinks.subjectId, caseIds))
      await db.delete(cases).where(inArray(cases.id, caseIds))
    }
    if (studentIds.length > 0) {
      await db.delete(telegramLinks).where(inArray(telegramLinks.subjectId, studentIds))
      await db.delete(students).where(inArray(students.id, studentIds))
    }
  })

  it('refuses a photo from a chat bound to a patient case', async () => {
    // A patient photographing something must never land in the student
    // verification queue.
    await makeCaseBoundTo('60601')

    const outcome = await handleTelegramUpdate({
      message: { chat: { id: 60601 }, photo: [{ file_id: 'x', file_size: 100 }] },
    })
    expect(outcome.reply?.text).toBe(telegramStudentDoc.notAStudent)
  })

  it('asks an unbound chat to start from the site first', async () => {
    const outcome = await handleTelegramUpdate({
      message: { chat: { id: 70701 }, photo: [{ file_id: 'x', file_size: 100 }] },
    })
    expect(outcome.reply?.text).toBe(telegramCopy.startWithoutToken)
  })

  it('refuses an oversized file rather than pulling it into memory', async () => {
    await makeStudentBoundTo('80801')

    const outcome = await handleTelegramUpdate({
      message: {
        chat: { id: 80801 },
        document: {
          file_id: 'too-big',
          file_name: 'huge.pdf',
          mime_type: 'application/pdf',
          file_size: 50 * 1024 * 1024,
        },
      },
    })

    expect([telegramStudentDoc.tooLarge, telegramStudentDoc.failed]).toContain(outcome.reply?.text)
  })

  it('leaves a bound student who sends plain text on the command help', async () => {
    await makeStudentBoundTo('90901')
    const outcome = await handleTelegramUpdate({
      message: { chat: { id: 90901 }, text: 'وين أدز الوثيقة؟' },
    })
    expect(outcome.reply?.text).toBe(telegramCopy.unknownCommand)
  })

  it('does not attach anything when the download fails', async () => {
    const studentId = await makeStudentBoundTo('10101')

    await handleTelegramUpdate({
      message: { chat: { id: 10101 }, photo: [{ file_id: 'nonexistent-file-id', file_size: 500 }] },
    })

    const [row] = await db
      .select({ path: students.verificationDocumentPath })
      .from(students)
      .where(eq(students.id, studentId))
    expect(row?.path).toBeNull()
  })
})
