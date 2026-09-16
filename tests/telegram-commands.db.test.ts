import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * The bot as an input channel, against a real Postgres.
 *
 * The bot gained three things a stranger can reach: a queue, a claim button, and
 * a status command. Everything in a Telegram update is attacker-controlled —
 * anyone can message a bot and anyone can forge `callback_data` — so what these
 * check is not that the happy path works but that **who is asking always comes
 * from the chat binding, and never from the message**.
 *
 * The rule that matters most is the last block: no phone number, no patient
 * name, in any message the bot sends. Telegram keeps history on its own servers,
 * where سنون cannot scrub a number when the retention period runs out.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('the bot as an input channel', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, students, telegramLinks } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { createInvite, linkChat } = await import('@/db/queries/telegram')
  const { handleTelegramUpdate } = await import('@/lib/telegram/webhook')
  const { CLAIM_PREFIX, NEXT_PREFIX } = await import('@/lib/telegram/student-queue')
  const { telegramCopy } = await import('@/lib/copy')

  const caseIds: string[] = []
  const studentIds: string[] = []
  const PHONE = '07701234567'
  const NAME = 'أم علي'

  async function makeCase() {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: NAME,
      patientPhone: PHONE,
      notes: null,
    })
    const [row] = await db
      .select({ id: cases.id, referenceCode: cases.referenceCode })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))
    caseIds.push(row!.id)
    return row!
  }

  async function makeStudent(status: 'PENDING' | 'VERIFIED' = 'VERIFIED') {
    const [row] = await db
      .insert(students)
      .values({
        authUserId: `test-${crypto.randomUUID()}`,
        fullName: 'طالب تجريبي',
        universityId: 'test-university',
        stageId: 'stage-4',
        verificationStatus: status,
      })
      .returning({ id: students.id })
    studentIds.push(row!.id)
    return row!.id
  }

  /** Bind a chat the way a real one is bound: mint an invite and redeem it. */
  async function bind(subject: { type: 'PATIENT_CASE' | 'STUDENT'; id: string }, chatId: string) {
    const token = await createInvite(subject)
    await linkChat(token, chatId)
  }

  const text = (chatId: string, body: string) => ({
    message: { chat: { id: chatId }, text: body },
  })
  const tap = (chatId: string, data: string) => ({
    callback_query: { id: 'cb-1', data, message: { chat: { id: chatId } } },
  })

  afterAll(async () => {
    const subjects = [...caseIds, ...studentIds]
    if (subjects.length > 0) {
      await db.delete(telegramLinks).where(inArray(telegramLinks.subjectId, subjects))
    }
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    if (studentIds.length > 0) await db.delete(students).where(inArray(students.id, studentIds))
  })

  describe('who is asking comes from the chat, never from the message', () => {
    it('refuses /cases to an unbound chat', async () => {
      const outcome = await handleTelegramUpdate(text('chat-unbound-1', '/cases'))
      expect(outcome.reply?.text).toBe(telegramCopy.startWithoutToken)
    })

    it('refuses /cases to a patient', async () => {
      const record = await makeCase()
      await bind({ type: 'PATIENT_CASE', id: record.id }, 'chat-patient-1')
      const outcome = await handleTelegramUpdate(text('chat-patient-1', '/cases'))
      expect(outcome.reply?.text).toBe(telegramCopy.casesNotAStudent)
    })

    it('refuses /status to a student', async () => {
      const studentId = await makeStudent()
      await bind({ type: 'STUDENT', id: studentId }, 'chat-student-1')
      const outcome = await handleTelegramUpdate(text('chat-student-1', '/status'))
      expect(outcome.reply?.text).toBe(telegramCopy.statusNotAPatient)
    })

    it('ignores a claim tap from a chat bound to nothing', async () => {
      const record = await makeCase()
      const outcome = await handleTelegramUpdate(
        tap('chat-unbound-2', `${CLAIM_PREFIX}${record.id}`),
      )
      expect(outcome.reply).toBeNull()
      // Still acknowledged, or Telegram leaves a spinner on the button forever.
      expect(outcome.answerCallbackId).toBe('cb-1')

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, record.id))
      expect(row!.status).toBe('REQUESTED')
    })

    it('ignores a claim tap from a chat bound to a patient', async () => {
      const mine = await makeCase()
      const victim = await makeCase()
      await bind({ type: 'PATIENT_CASE', id: mine.id }, 'chat-patient-2')

      const outcome = await handleTelegramUpdate(tap('chat-patient-2', `${CLAIM_PREFIX}${victim.id}`))
      expect(outcome.reply).toBeNull()

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, victim.id))
      expect(row!.status).toBe('REQUESTED')
    })
  })

  describe('a forged claim payload claims nothing', () => {
    it('refuses a case the student was never shown', async () => {
      // `test-college` maps to no city, so this student has no scope at all —
      // the same shape as a half-finished admin setup, and it must fail closed.
      const record = await makeCase()
      const studentId = await makeStudent()
      await bind({ type: 'STUDENT', id: studentId }, 'chat-student-2')

      const outcome = await handleTelegramUpdate(tap('chat-student-2', `${CLAIM_PREFIX}${record.id}`))
      expect(outcome.answerCallbackId).toBe('cb-1')

      const [row] = await db.select({ status: cases.status }).from(cases).where(eq(cases.id, record.id))
      expect(row!.status).toBe('REQUESTED')
    })

    it('refuses a case id that is not a case at all', async () => {
      const studentId = await makeStudent()
      await bind({ type: 'STUDENT', id: studentId }, 'chat-student-3')
      const outcome = await handleTelegramUpdate(
        tap('chat-student-3', `${CLAIM_PREFIX}${crypto.randomUUID()}`),
      )
      expect(outcome.reply?.text).toBeTruthy()
    })

    it('treats an unverified student as having nothing to see', async () => {
      const studentId = await makeStudent('PENDING')
      await bind({ type: 'STUDENT', id: studentId }, 'chat-student-4')
      const outcome = await handleTelegramUpdate(text('chat-student-4', '/cases'))
      expect(outcome.reply?.text).toBe(telegramCopy.queueNotVerified)
    })

    it('answers a next-case tap without falling over on a junk cursor', async () => {
      const studentId = await makeStudent()
      await bind({ type: 'STUDENT', id: studentId }, 'chat-student-5')
      const outcome = await handleTelegramUpdate(tap('chat-student-5', `${NEXT_PREFIX}not-a-case`))
      expect(outcome.answerCallbackId).toBe('cb-1')
    })
  })

  describe('nothing the bot says carries contact details', () => {
    it('answers a patient asking for their status without their own number', async () => {
      const record = await makeCase()
      await bind({ type: 'PATIENT_CASE', id: record.id }, 'chat-patient-3')

      const outcome = await handleTelegramUpdate(text('chat-patient-3', '/status'))
      expect(outcome.reply?.text).toContain(record.referenceCode)
      expect(outcome.reply?.text).not.toContain(PHONE)
      expect(outcome.reply?.text).not.toContain(NAME)
    })

    it('keeps every canned message free of a phone number or a name', () => {
      // The claim reply is the one that would be tempting to fill in: the
      // student has earned the number at that moment. It is a link instead.
      const claimed = telegramCopy.claimedByBot('SN-TEST', 'https://example.com/student/case/x')
      expect(claimed).not.toMatch(/07\d{9}/)
      expect(claimed).toContain('https://example.com/student/case/x')

      const card = telegramCopy.caseCard({
        referenceCode: 'SN-TEST',
        treatments: 'حشوة',
        days: 'الأحد',
        city: 'البصرة',
      })
      expect(card).not.toMatch(/07\d{9}/)

      const alert = telegramCopy.newCaseForStudent({
        referenceCode: 'SN-TEST',
        treatments: 'حشوة',
        city: 'البصرة',
      })
      expect(alert).not.toMatch(/07\d{9}/)
    })
  })

  describe('help is answered per audience', () => {
    it('sends the students their commands and the patients theirs', async () => {
      const record = await makeCase()
      const studentId = await makeStudent()
      await bind({ type: 'PATIENT_CASE', id: record.id }, 'chat-help-patient')
      await bind({ type: 'STUDENT', id: studentId }, 'chat-help-student')

      expect((await handleTelegramUpdate(text('chat-help-patient', '/help'))).reply?.text).toBe(
        telegramCopy.helpPatient,
      )
      expect((await handleTelegramUpdate(text('chat-help-student', '/help'))).reply?.text).toBe(
        telegramCopy.helpStudent,
      )
      expect((await handleTelegramUpdate(text('chat-help-none', '/help'))).reply?.text).toBe(
        telegramCopy.helpUnlinked,
      )
    })
  })
})
