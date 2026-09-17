import { and, eq, isNull } from 'drizzle-orm'
import { db } from '@/db'
import { cases, students, telegramLinks } from '@/db/schema'
import { listOpenCasesForStudent } from '@/db/queries/cases'
import { getAllTreatmentTypes, getCities, getStudentCaseScope } from '@/lib/config'
import { telegramCopy } from '@/lib/copy'
import { sendNotification } from './send'

/**
 * Tell students a case has arrived that they could take.
 *
 * This is the one thing the site structurally cannot do, and the reason students
 * go quiet: the queue is only useful to somebody who thought to open it, and a
 * student with no cases waiting has no reason to look. A free push turns سنون
 * from a page they check into something that reaches them — which is the whole
 * argument for Telegram over SMS, at a cost of nothing per message.
 *
 * Three things it holds to:
 *
 * - **It asks the queue rather than deciding for itself.** For each candidate it
 *   calls `listOpenCasesForStudent` with that one case id, so "would this have
 *   appeared in their queue?" is answered by the code that draws the queue. A
 *   second implementation of the city, stage-capability and paediatric rules is
 *   how a student ends up alerted to a case they must not treat.
 * - **No contact detail, exactly like every other message.** Reference code,
 *   treatments, city. The patient's name and number are not in this and are not
 *   in the claim reply either.
 * - **It is best effort and never a precondition.** It runs after the case is
 *   safely written and outside its transaction; a failed send must not cost a
 *   patient their submission.
 * - **The student's own settings are read here, not in the bot.** A student may
 *   turn the alerts off entirely, or mute particular treatments — a fifth year
 *   who does not want to be woken for every cleaning. Both are filters on
 *   *telling* somebody and never on what they may see: a muted treatment still
 *   appears in their queue and is still theirs to claim. Confusing the two
 *   would make a notification preference quietly shrink somebody's queue, which
 *   nobody would connect to a checkbox they ticked a month ago.
 *
 * **It is a query per linked student, and that is deliberate at this size.** One
 * or two cities means tens of students, so tens of cheap indexed queries once
 * per submitted case. The alternative is reimplementing the visibility filter as
 * a single join, which trades the correctness property above for a saving
 * nobody can measure yet. When there are hundreds of students this becomes one
 * query grouped by (college, stage) with the scope resolved per group — worth
 * doing then, not now.
 */
export async function notifyStudentsOfNewCase(caseId: string): Promise<number> {
  const [record] = await db
    .select({
      referenceCode: cases.referenceCode,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      status: cases.status,
    })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  // Only a case still waiting is worth announcing. A case claimed between
  // submission and this call has nothing to offer anybody.
  if (!record || record.status !== 'REQUESTED') return 0

  // Only students who actually have a bound chat: everyone else would cost a
  // scope lookup to discover there is nowhere to send.
  const candidates = await db
    .select({
      id: students.id,
      universityId: students.universityId,
      stageId: students.stageId,
      mutedTreatmentTypeIds: students.mutedTreatmentTypeIds,
    })
    .from(students)
    .innerJoin(
      telegramLinks,
      and(
        eq(telegramLinks.subjectType, 'STUDENT'),
        eq(telegramLinks.subjectId, students.id),
        isNull(telegramLinks.revokedAt),
      ),
    )
    // Wanting the alerts is part of being a candidate, so a student who turned
    // them off costs nothing per case rather than a scope lookup and a queue
    // query to discover there is nowhere to send.
    .where(and(eq(students.verificationStatus, 'VERIFIED'), eq(students.notifyNewCases, true)))

  if (candidates.length === 0) return 0

  const [treatments, cities] = await Promise.all([getAllTreatmentTypes(), getCities()])
  const text = telegramCopy.newCaseForStudent({
    referenceCode: record.referenceCode,
    treatments: record.treatmentTypeIds
      .map((id) => treatments.find((t) => t.id === id)?.nameAr ?? id)
      .join(' · '),
    city: cities.find((c) => c.id === record.cityId)?.nameAr ?? record.cityId,
  })

  // Scope resolution hits Payload, which caches per request, so students sharing
  // a college and stage cost one lookup between them.
  let sent = 0
  for (const student of candidates) {
    /*
     * Muting is per treatment, and a case asking for several is silenced only
     * when **every** one of them is muted.
     *
     * The other way round — silence if any is muted — would lose a case wanting
     * a cleaning and a root canal to a student who muted cleanings, and it is
     * the root canal they were waiting for. Muting says "do not wake me for
     * this"; it cannot be allowed to mean "and hide anything it is attached to".
     */
    if (
      student.mutedTreatmentTypeIds.length > 0 &&
      record.treatmentTypeIds.every((id) => student.mutedTreatmentTypeIds.includes(id))
    ) {
      continue
    }

    const scope = await getStudentCaseScope(student.universityId, student.stageId)
    if (scope.cityIds.length === 0 || scope.treatmentTypeIds.length === 0) continue

    const [visible] = await listOpenCasesForStudent(student.id, {
      ...scope,
      onlyCaseIds: [caseId],
      limit: 1,
    })
    if (!visible) continue

    const result = await sendNotification({
      recipient: { kind: 'STUDENT', studentId: student.id },
      text,
    })
    if (result === 'SENT') sent += 1
  }

  return sent
}
