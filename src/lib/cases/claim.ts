import { eq } from 'drizzle-orm'
import { db } from '@/db'
import { students } from '@/db/schema'
import { listOpenCasesForStudent } from '@/db/queries/cases'
import { claimCase, countActiveClaimsForStudent, type ClaimResult } from '@/db/queries/claims'
import { getStudentCaseScope } from '@/lib/config'
import { getMaxActiveClaimsPerStudent } from '@/lib/config/settings'

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
 *
 * **So is the cap on how many cases one student may hold**, for the same reason
 * and it is the same shape of hole: the cap used to exist only as a branch in
 * the student page that swapped the queue for the held case, which the bot's
 * claim button and a hand-made POST both walked straight past. A rule that is
 * only a rendering decision is not a rule.
 */
export type StudentClaimResult =
  | ClaimResult
  /** The case is real, but not one this student was ever shown. */
  | { ok: false; reason: 'NOT_IN_SCOPE' }
  /** In scope, but on days this student is not in clinic. They may ask instead. */
  | { ok: false; reason: 'DAYS_DO_NOT_MATCH' }
  /** Allowed to see it, already holding as many cases as the setting permits. */
  | { ok: false; reason: 'CLAIM_LIMIT_REACHED'; limit: number }

export async function claimCaseForStudent(
  caseId: string,
  studentId: string,
): Promise<StudentClaimResult> {
  const [profile] = await db
    .select({
      universityId: students.universityId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
    })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  if (!profile) return { ok: false, reason: 'STUDENT_NOT_VERIFIED' }

  const scope = await getStudentCaseScope(profile.universityId, profile.stageId)
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

  /*
   * Checked last, deliberately.
   *
   * The other refusals say "this case is not yours to take"; this one says "you
   * have your hands full", which is only worth telling somebody about a case
   * they could otherwise have had. Ordering it first would answer a student in
   * Basra poking at a Mosul case with a sentence about their own workload, and
   * that sentence is a small leak: it says the case exists and is claimable.
   *
   * There is no transaction around the count and the claim, and that is
   * acceptable here in a way it is not for "a case can never be claimed twice".
   * The worst a race costs is one student holding one case over the cap, which
   * self-corrects the moment they close either — against a database-enforced
   * invariant whose failure hands a stranger's phone number to a second person.
   */
  const [held, limit] = await Promise.all([
    countActiveClaimsForStudent(studentId),
    getMaxActiveClaimsPerStudent(),
  ])
  if (held >= limit) return { ok: false, reason: 'CLAIM_LIMIT_REACHED', limit }

  return claimCase(caseId, studentId)
}
