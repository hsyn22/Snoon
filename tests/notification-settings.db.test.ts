import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A student's notification preferences.
 *
 * Haider's ask: "do you want alerts for new cases? yes or no — and if yes, a
 * list of every treatment, all ticked, and they untick what they do not want."
 *
 * Three properties matter here and none of them is the happy path:
 *
 * 1. **Muting silences a message; it never hides a case.** A muted treatment
 *    still appears in the student's queue and is still theirs to claim. If
 *    these two ever merge, a checkbox somebody ticked a month ago quietly
 *    shrinks their queue and nobody can connect the two.
 * 2. **A case is silenced only when *every* treatment on it is muted.** A case
 *    wanting a cleaning and a root canal must still reach a student who muted
 *    cleanings — the root canal is what they were waiting for.
 * 3. **The stored value is the exclusion list, not the inclusion list.** An
 *    inclusion list is a snapshot of the treatments that existed the day it was
 *    saved, so a treatment added later would go to nobody. That is the
 *    `ensureStageDefaults` failure again, and its symptom is an empty inbox that
 *    reads as "there are no patients".
 */

const hasDatabase = Boolean(process.env.DATABASE_URL)

/** Every message the alert tries to send, instead of a Telegram call. */
const sent = vi.hoisted(() => [] as { recipient: unknown; text: string }[])

vi.mock('@/lib/notifications/send', () => ({
  sendNotification: async (message: { recipient: unknown; text: string }) => {
    sent.push(message)
    return { ok: true }
  },
}))

vi.mock('@/lib/config', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/config')>()
  return {
    ...actual,
    getStudentCaseScope: async () => ({
      cityIds: ['basra'],
      treatmentTypeIds: ['filling', 'extraction', 'scaling'],
    }),
  }
})

describe.skipIf(!hasDatabase)('new-case alerts and what a student muted', async () => {
  if (!hasDatabase) return

  const { eq, inArray } = await import('drizzle-orm')
  const { db } = await import('@/db')
  const { cases, students, telegramLinks } = await import('@/db/schema')
  const { notifyStudentsOfNewCase } = await import('@/lib/notifications/new-case')
  const { listOpenCasesForStudent } = await import('@/db/queries/cases')

  let studentId = ''
  const caseIds: string[] = []

  async function seedCase(reference: string, treatmentTypeIds: string[]): Promise<string> {
    const [row] = await db
      .insert(cases)
      .values({
        referenceCode: reference,
        cityId: 'basra',
        treatmentTypeIds,
        availabilityDays: ['sun'],
        patientName: 'اختبار الإشعارات',
        patientPhone: '',
        trackingTokenHash: `notify-test-${crypto.randomUUID()}`,
        status: 'REQUESTED',
      })
      .returning({ id: cases.id })
    if (!row) throw new Error('case insert returned no row')
    caseIds.push(row.id)
    return row.id
  }

  async function setPreferences(notifyNewCases: boolean, muted: string[]) {
    await db
      .update(students)
      .set({ notifyNewCases, mutedTreatmentTypeIds: muted })
      .where(eq(students.id, studentId))
  }

  const [student] = await db
    .insert(students)
    .values({
      authUserId: `notify-${crypto.randomUUID()}`,
      fullName: 'طالب اختبار الإشعارات',
      universityId: 'test-university',
      stageId: 'stage-4',
      clinicDays: [],
      verificationStatus: 'VERIFIED',
    })
    .returning({ id: students.id })
  if (!student) throw new Error('student insert returned no row')
  studentId = student.id

  // The alert only considers students with a live chat binding, so one is
  // needed for any of this to be observable at all.
  await db.insert(telegramLinks).values({
    subjectType: 'STUDENT',
    subjectId: studentId,
    inviteTokenHash: `notify-invite-${crypto.randomUUID()}`,
    chatId: '4242424242',
  })

  beforeEach(() => {
    sent.length = 0
  })

  afterAll(async () => {
    await db.delete(telegramLinks).where(eq(telegramLinks.subjectId, studentId))
    if (caseIds.length > 0) await db.delete(cases).where(inArray(cases.id, caseIds))
    await db.delete(students).where(eq(students.id, studentId))
  })

  it('sends by default', async () => {
    await setPreferences(true, [])
    await notifyStudentsOfNewCase(await seedCase('SN-NOTIF1', ['filling']))
    expect(sent).toHaveLength(1)
  })

  it('sends nothing once the student turns alerts off', async () => {
    await setPreferences(false, [])
    await notifyStudentsOfNewCase(await seedCase('SN-NOTIF2', ['filling']))
    expect(sent).toHaveLength(0)
  })

  it('sends nothing for a case whose only treatment is muted', async () => {
    await setPreferences(true, ['scaling'])
    await notifyStudentsOfNewCase(await seedCase('SN-NOTIF3', ['scaling']))
    expect(sent).toHaveLength(0)
  })

  /**
   * The one that would be got wrong.
   *
   * "Silence if any treatment is muted" is the easier condition to write and it
   * loses the case this student actually wanted.
   */
  it('still sends when a muted treatment shares a case with one they want', async () => {
    await setPreferences(true, ['scaling'])
    await notifyStudentsOfNewCase(await seedCase('SN-NOTIF4', ['scaling', 'filling']))
    expect(sent).toHaveLength(1)
  })

  it('never hides a case from the queue, whatever is muted', async () => {
    // The whole point of the distinction: this is a notification setting and
    // not a filter. Both of the cases muted above are still this student's to
    // see and to claim.
    await setPreferences(false, ['scaling', 'filling', 'extraction'])

    const visible = await listOpenCasesForStudent(studentId, {
      cityIds: ['basra'],
      treatmentTypeIds: ['filling', 'extraction', 'scaling'],
      onlyCaseIds: caseIds,
    })

    expect(visible.length).toBe(caseIds.length)
  })
})
