import { eq, inArray } from 'drizzle-orm'
import { afterAll, describe, expect, it } from 'vitest'

/**
 * Telegram linking, against a real Postgres.
 *
 * The invite link is a credential: whoever holds it receives that patient's
 * notifications. These cover the rules that keep it from being replayed,
 * forwarded, or guessed.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('telegram links', async () => {
  if (!hasDatabase) return

  const { db } = await import('@/db')
  const { cases, telegramLinks } = await import('@/db/schema')
  const { submitCase } = await import('@/db/queries/cases')
  const { createInvite, linkChat, getChatIdFor, revokeLinksForChat } = await import(
    '@/db/queries/telegram'
  )
  const { generateInviteToken, hashInviteToken } = await import('@/lib/telegram/invite-token')
  const { handleTelegramUpdate } = await import('@/lib/telegram/webhook')
  const { telegramCopy } = await import('@/lib/copy')

  const caseIds: string[] = []

  async function makeCase() {
    const { referenceCode } = await submitCase({
      cityId: 'basra',
      treatmentTypeIds: ['filling'],
      availabilityDays: ['sun'],
      patientName: 'مريض تجريبي',
      patientPhone: '07701234567',
      notes: null,
    })
    const [row] = await db
      .select({ id: cases.id, referenceCode: cases.referenceCode })
      .from(cases)
      .where(eq(cases.referenceCode, referenceCode))
    caseIds.push(row!.id)
    return row!
  }

  afterAll(async () => {
    if (caseIds.length > 0) {
      await db.delete(telegramLinks).where(inArray(telegramLinks.subjectId, caseIds))
      await db.delete(cases).where(inArray(cases.id, caseIds))
    }
  })

  describe('the invite token', () => {
    it('fits inside a Telegram start parameter', () => {
      const token = generateInviteToken()
      expect(token.length).toBeLessThanOrEqual(64)
      expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
    })

    it('is stored hashed, never in plaintext', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })

      const [row] = await db
        .select({ hash: telegramLinks.inviteTokenHash })
        .from(telegramLinks)
        .where(eq(telegramLinks.subjectId, record.id))

      expect(row?.hash).not.toBe(token)
      expect(row?.hash).toBe(hashInviteToken(token))
    })

    it('cannot be replayed as a patient tracking token', async () => {
      const { hashTrackingToken } = await import('@/lib/tracking-token')
      const token = generateInviteToken()
      // Same secret, different label — a token minted for one purpose must not
      // authenticate for the other.
      expect(hashInviteToken(token)).not.toBe(hashTrackingToken(token))
    })
  })

  describe('binding a chat', () => {
    it('links the chat named by the invite', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })

      const result = await linkChat(token, '111')
      expect(result).toEqual({ ok: true, subject: { type: 'PATIENT_CASE', id: record.id } })
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: record.id })).toBe('111')
    })

    it('refuses a token nobody issued', async () => {
      expect(await linkChat(generateInviteToken(), '222')).toEqual({
        ok: false,
        reason: 'UNKNOWN_TOKEN',
      })
    })

    it('refuses a forwarded link that another chat already used', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })

      expect((await linkChat(token, '333')).ok).toBe(true)
      // Someone the patient forwarded the link to must not take over the case.
      expect(await linkChat(token, '444')).toEqual({ ok: false, reason: 'ALREADY_USED' })
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: record.id })).toBe('333')
    })

    it('is idempotent for the same chat pressing start twice', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })
      expect((await linkChat(token, '555')).ok).toBe(true)
      expect((await linkChat(token, '555')).ok).toBe(true)
    })

    it('invalidates the previous invite when a new one is requested', async () => {
      const record = await makeCase()
      const first = await createInvite({ type: 'PATIENT_CASE', id: record.id })
      const second = await createInvite({ type: 'PATIENT_CASE', id: record.id })

      expect(await linkChat(first, '666')).toEqual({ ok: false, reason: 'UNKNOWN_TOKEN' })
      expect((await linkChat(second, '666')).ok).toBe(true)
    })

    it('reports no chat for a case nobody opted in for', async () => {
      const record = await makeCase()
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: record.id })).toBeNull()
    })
  })

  describe('the webhook handler', () => {
    it('binds on /start with a valid token and greets by reference code', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })

      const outcome = await handleTelegramUpdate({
        message: { chat: { id: 777 }, text: `/start ${token}` },
      })

      expect(outcome.reply?.chatId).toBe('777')
      expect(outcome.reply?.text).toContain(record.referenceCode)
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: record.id })).toBe('777')
    })

    it('rejects a token it never issued', async () => {
      const outcome = await handleTelegramUpdate({
        message: { chat: { id: 888 }, text: `/start ${generateInviteToken()}` },
      })
      expect(outcome.reply?.text).toBe(telegramCopy.unknownToken)
    })

    it.each([
      ['/start ../../etc/passwd'],
      ["/start '; drop table snoon.cases; --"],
      ['/start <script>alert(1)</script>'],
      [`/start ${'a'.repeat(200)}`],
    ])('rejects the junk token in %j without touching the database', async (text) => {
      const outcome = await handleTelegramUpdate({ message: { chat: { id: 999 }, text } })
      expect(outcome.reply?.text).toBe(telegramCopy.unknownToken)
    })

    it('explains itself on a bare /start', async () => {
      const outcome = await handleTelegramUpdate({ message: { chat: { id: 1 }, text: '/start' } })
      expect(outcome.reply?.text).toBe(telegramCopy.startWithoutToken)
    })

    it('stops notifications on /stop and says so only when there were any', async () => {
      const record = await makeCase()
      const token = await createInvite({ type: 'PATIENT_CASE', id: record.id })
      await linkChat(token, '1010')

      const stopped = await handleTelegramUpdate({ message: { chat: { id: 1010 }, text: '/stop' } })
      expect(stopped.reply?.text).toBe(telegramCopy.stopped)
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: record.id })).toBeNull()

      const again = await handleTelegramUpdate({ message: { chat: { id: 1010 }, text: '/stop' } })
      expect(again.reply?.text).toBe(telegramCopy.nothingToStop)
    })

    it('stays silent on an update with no message', async () => {
      expect(await handleTelegramUpdate({})).toEqual({ reply: null })
      expect(await handleTelegramUpdate({ message: {} })).toEqual({ reply: null })
    })

    it('answers anything else with the available commands', async () => {
      const outcome = await handleTelegramUpdate({ message: { chat: { id: 2 }, text: 'مرحبا' } })
      expect(outcome.reply?.text).toBe(telegramCopy.unknownCommand)
    })
  })

  describe('revocation', () => {
    it('stops every link a chat holds', async () => {
      const a = await makeCase()
      const b = await makeCase()
      await linkChat(await createInvite({ type: 'PATIENT_CASE', id: a.id }), '2020')
      await linkChat(await createInvite({ type: 'PATIENT_CASE', id: b.id }), '2020')

      expect(await revokeLinksForChat('2020')).toBe(2)
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: a.id })).toBeNull()
      expect(await getChatIdFor({ kind: 'PATIENT_CASE', caseId: b.id })).toBeNull()
    })
  })
})
