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
      collegeId: students.collegeId,
      stageId: students.stageId,
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
    .where(eq(students.verificationStatus, 'VERIFIED'))

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
    const scope = await getStudentCaseScope(student.collegeId, student.stageId)
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
