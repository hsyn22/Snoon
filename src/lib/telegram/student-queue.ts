import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { students } from '@/db/schema'
import { listOpenCasesForStudent, type StudentCaseListItem } from '@/db/queries/cases'
import { getAllTreatmentTypes, getCities, getStudentCaseScope } from '@/lib/config'
import { caseForm, telegramCopy } from '@/lib/copy'
import type { InlineButton } from './client'

/**
 * The student's queue, read through Telegram.
 *
 * **One case per message, and the bot walks the list rather than printing it.**
 * Telegram stacks buttons under a single message, so a list of five cases means
 * five buttons with nothing to tell them apart; and a student reads a queue one
 * case at a time anyway. So: here is a case, take it or show me the next.
 *
 * Two rules this file exists to keep, both of which a second listing
 * implementation would have quietly broken:
 *
 * - **It does not decide what a student may see.** `listOpenCasesForStudent` and
 *   `getStudentCaseScope` do, exactly as they do for the site. This formats what
 *   they return and nothing more. The moment the bot had its own idea of "cases
 *   near me" there would be two answers to that question, and the one that goes
 *   wrong hands a phone number to somebody it was never meant for.
 * - **No contact detail appears in a Telegram message, ever.** Not even to the
 *   student who has just claimed the case and is entitled to it. Telegram keeps
 *   message history on its own servers; a phone number sent once is there for
 *   good, in a place سنون cannot scrub when the retention period runs out. The
 *   claim reply is a link to the case page, where the number sits behind a
 *   session, and that is one tap.
 */

export type BotCase = {
  entry: StudentCaseListItem
  text: string
  /** Absent when the days do not overlap — the student must ask, not claim. */
  claimable: boolean
}

export const CLAIM_PREFIX = 'c:'
export const NEXT_PREFIX = 'n:'

export type StudentQueueState =
  | { kind: 'not-verified' }
  | { kind: 'no-scope' }
  | { kind: 'empty' }
  | { kind: 'end' }
  | { kind: 'case'; card: BotCase; buttons: InlineButton[] }

/**
 * The next case after `afterId`, or the first when it is absent.
 *
 * "After" is by the same `createdAt` ordering the queue uses, so walking with
 * the button and scrolling the site's list visit cases in the same order. The
 * cursor is a case id rather than an index because the queue changes under the
 * reader — somebody else claims one mid-walk — and an index would then skip a
 * case or repeat one.
 */
export async function nextCaseForStudent(
  studentId: string,
  afterId?: string,
): Promise<StudentQueueState> {
  const [profile] = await db
    .select({
      collegeId: students.collegeId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
      verificationStatus: students.verificationStatus,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!profile || profile.verificationStatus !== 'VERIFIED') return { kind: 'not-verified' }

  const scope = await getStudentCaseScope(profile.collegeId, profile.stageId)
  if (scope.cityIds.length === 0 || scope.treatmentTypeIds.length === 0) return { kind: 'no-scope' }

  const list = await listOpenCasesForStudent(studentId, scope)
  if (list.length === 0) return { kind: 'empty' }

  const start = afterId ? list.findIndex((entry) => entry.id === afterId) + 1 : 0
  // findIndex returns -1 for a case that has been claimed since it was shown, so
  // start lands on 0 and the walk restarts rather than dead-ending. Restarting
  // is the better failure: the alternative is a student tapping "next" and being
  // told there is nothing, while the queue is full.
  const entry = list[start]
  if (!entry) return { kind: 'end' }

  const [treatments, cities] = await Promise.all([getAllTreatmentTypes(), getCities()])
  const nameFor = (id: string) => treatments.find((t) => t.id === id)?.nameAr ?? id
  const cityName = cities.find((c) => c.id === entry.cityId)?.nameAr ?? entry.cityId

  const clinic = new Set(profile.clinicDays ?? [])
  // Empty clinic days means "any day", which is every student recorded before
  // the field existed. Adding it must not silently empty anybody's queue.
  const claimable = clinic.size === 0 || entry.availabilityDays.some((day) => clinic.has(day))

  const capable = new Set(scope.treatmentTypeIds)
  const partial = entry.treatmentTypeIds.some((id) => !capable.has(id))

  const lines = [
    telegramCopy.caseCard({
      referenceCode: entry.referenceCode,
      treatments: entry.treatmentTypeIds.map(nameFor).join(' · '),
      city: cityName,
      days: entry.availabilityDays
        .map((day) => caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day)
        .join('، '),
    }),
  ]
  if (partial) lines.push('', telegramCopy.caseCardPartial)
  if (!claimable) lines.push('', telegramCopy.caseCardDays)

  const buttons: InlineButton[] = []
  if (claimable) {
    buttons.push({ text: telegramCopy.claimButton, callbackData: `${CLAIM_PREFIX}${entry.id}` })
  }
  if (list[start + 1]) {
    buttons.push({ text: telegramCopy.nextButton, callbackData: `${NEXT_PREFIX}${entry.id}` })
  }

  return {
    kind: 'case',
    card: { entry, text: lines.join('\n'), claimable },
    buttons,
  }
}
