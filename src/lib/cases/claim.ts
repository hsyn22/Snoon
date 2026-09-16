import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { students } from '@/db/schema'
import { listOpenCasesForStudent } from '@/db/queries/cases'
import { claimCase, type ClaimResult } from '@/db/queries/claims'
import { getStudentCaseScope } from '@/lib/config'

/**
 * Claiming a case, with the authorisation that `claimCase` deliberately does
 * not do.
 *
 * `claimCase` is the atomic part: it re-reads verification inside the
 * transaction, flips the case with a conditional update, inserts the claim and
 * writes the audit row. What it never knew is **whether this student was ever
 * meant to be offered this case at all** — it takes a case id and trusts it.
 *
 * On the web that looked safe because the only place a student sees a case id is
 * the queue that was drawn for them. It was not: the claim is a server action,
 * every server action is a public POST endpoint, and the case id comes off the
 * form. A verified student in Basra could post a case id from Mosul and see that
 * patient's phone number. Nothing enforced the city or the stage; the queue
 * merely never showed it to them.
 *
 * It became impossible to ignore when the Telegram bot gained a claim button,
 * because `callback_data` is attacker-controlled in exactly the same way and
 * there is no rendered page in front of it to make the gap feel theoretical.
 *
 * **The check is the queue itself.** Rather than restate "same city, overlapping
 * treatments, not a child's case unless the stage does paediatrics", this asks
 * `listOpenCasesForStudent` for that one id and requires it to come back. One
 * implementation of visibility, used both to draw the list and to authorise
 * acting on it — so the two cannot drift, and a future change to what a student
 * may see changes what they may claim in the same edit.
 *
 * Day overlap is enforced here too, and only here: the queue shows a case whose
 * days do not match and offers to *ask* the patient instead of claiming, which
 * grants nothing. Without this the bot's button would have been a way round that
 * whole mechanism.
 */
export type StudentClaimResult =
  | ClaimResult
  /** The case is real, but not one this student was ever shown. */
  | { ok: false; reason: 'NOT_IN_SCOPE' }
  /** In scope, but on days this student is not in clinic. They may ask instead. */
  | { ok: false; reason: 'DAYS_DO_NOT_MATCH' }

export async function claimCaseForStudent(
  caseId: string,
  studentId: string,
): Promise<StudentClaimResult> {
  const [profile] = await db
    .select({
      collegeId: students.collegeId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!profile) return { ok: false, reason: 'STUDENT_NOT_VERIFIED' }

  const scope = await getStudentCaseScope(profile.collegeId, profile.stageId)
  if (scope.cityIds.length === 0 || scope.treatmentTypeIds.length === 0) {
    return { ok: false, reason: 'NOT_IN_SCOPE' }
  }

  const [visible] = await listOpenCasesForStudent(studentId, {
    ...scope,
    onlyCaseIds: [caseId],
    limit: 1,
  })

  if (!visible) return { ok: false, reason: 'NOT_IN_SCOPE' }

  // Empty clinic days means "any day" — every student recorded before the field
  // existed looks like this, and adding it must not silently stop them claiming.
  const clinic = new Set(profile.clinicDays ?? [])
  const attendable = clinic.size === 0 || visible.availabilityDays.some((day) => clinic.has(day))
  if (!attendable) return { ok: false, reason: 'DAYS_DO_NOT_MATCH' }

  return claimCase(caseId, studentId)
}
