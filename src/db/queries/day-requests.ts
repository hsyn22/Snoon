import { and, asc, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '@/db'
import { caseEvents, cases, claims, dayRequests, students } from '@/db/schema'
import { CASE_REASON } from '@/lib/cases/reasons'
import { getContactWindowHours } from '@/lib/config/settings'
import { WEEK_DAYS } from '@/lib/config/schema'
import { isUniqueViolation } from '@/db/unique-violation'

/**
 * Asking a patient about a day they did not choose.
 *
 * A student is in clinic on the days their timetable says. A patient names the
 * days they can come. Insisting the two overlap would hide most cases from most
 * students and leave patients waiting — but letting a student claim a case they
 * can never schedule wastes the claim, the call, and the patient's time.
 *
 * So a student without an overlap may **ask**, and nothing else. They do not get
 * the case, they do not get the phone number, and the patient is never shown who
 * asked. Only the patient's yes turns a request into a claim, and that claim goes
 * through exactly the same atomic path as an ordinary one.
 */

export type DayRequestFailure =
  | 'STUDENT_NOT_VERIFIED'
  | 'CASE_UNAVAILABLE'
  | 'NO_DAYS_TO_OFFER'
  | 'ALREADY_ASKED'

export type DayRequestResult =
  | { ok: true; days: string[] }
  | { ok: false; reason: DayRequestFailure }

/**
 * The days this student could offer on this case: their clinic days, minus the
 * ones the patient already chose.
 *
 * A day the patient already picked is not worth asking about — the student can
 * simply claim the case — and asking anyway would send the patient a question
 * they have already answered by filling in the form.
 */
export function daysWorthAsking(
  clinicDays: readonly string[],
  patientDays: readonly string[],
): string[] {
  const chosen = new Set(patientDays)
  return clinicDays.filter((day) => !chosen.has(day))
}

/**
 * Record a student's request. One row per day, so the patient is asked about
 * days rather than about people.
 */
export async function requestDays(caseId: string, studentId: string): Promise<DayRequestResult> {
  const [student] = await db
    .select({ verificationStatus: students.verificationStatus, clinicDays: students.clinicDays })
    .from(students)
    .where(eq(students.id, studentId))
    .limit(1)

  // Re-read rather than trusted from the session, as everywhere else.
  if (!student || student.verificationStatus !== 'VERIFIED') {
    return { ok: false, reason: 'STUDENT_NOT_VERIFIED' }
  }

  const [record] = await db
    .select({ availabilityDays: cases.availabilityDays, status: cases.status })
    .from(cases)
    .where(eq(cases.id, caseId))
    .limit(1)

  if (!record || record.status !== 'REQUESTED') return { ok: false, reason: 'CASE_UNAVAILABLE' }

  const days = daysWorthAsking(student.clinicDays, record.availabilityDays)
  if (days.length === 0) return { ok: false, reason: 'NO_DAYS_TO_OFFER' }

  try {
    await db
      .insert(dayRequests)
      .values(days.map((requestedDay) => ({ caseId, studentId, requestedDay })))
  } catch (error) {
    // The partial unique index refusing a second pending row for the same day.
    if (isUniqueViolation(error)) return { ok: false, reason: 'ALREADY_ASKED' }
    throw error
  }

  return { ok: true, days }
}

/** Whether this student already has a question outstanding on this case. */
export async function hasPendingRequest(caseId: string, studentId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: dayRequests.id })
    .from(dayRequests)
    .where(
      and(
        eq(dayRequests.caseId, caseId),
        eq(dayRequests.studentId, studentId),
        eq(dayRequests.status, 'PENDING'),
      ),
    )
    .limit(1)

  return Boolean(row)
}

/** Cases this student has already asked about, so the queue can say so. */
export async function pendingRequestCaseIds(studentId: string): Promise<Set<string>> {
  const rows = await db
    .select({ caseId: dayRequests.caseId })
    .from(dayRequests)
    .where(and(eq(dayRequests.studentId, studentId), eq(dayRequests.status, 'PENDING')))

  return new Set(rows.map((row) => row.caseId))
}

/**
 * The distinct days a patient is currently being asked about, earliest first.
 *
 * Deliberately no student names or ids. The patient answers "can you come on
 * Saturday?" — they are not choosing between people, and the product does not
 * put people in a list to be picked from.
 */
export async function pendingDaysForCase(caseId: string): Promise<string[]> {
  const rows = await db
    /* Typed as string, not Date: `sql<Date>` only asserts, and the driver hands
       back whatever Postgres sent — which for an aggregate is a timestamp
       string. Claiming Date here made `.getTime()` a runtime error. */
    .select({ day: dayRequests.requestedDay, first: sql<string>`min(${dayRequests.createdAt})` })
    .from(dayRequests)
    .where(and(eq(dayRequests.caseId, caseId), eq(dayRequests.status, 'PENDING')))
    .groupBy(dayRequests.requestedDay)
    .orderBy(sql`min(${dayRequests.createdAt})`)

  /*
   * Earliest asker first, then the week's own order.
   *
   * Two days asked about in the same statement carry the same `created_at` —
   * Postgres takes one clock reading per transaction — so the timestamp alone
   * leaves their order up to the planner, and the patient could be asked about
   * Tuesday before Saturday on one request and the other way round on the next.
   * Week order is both deterministic and the order a person expects to read.
   */
  const weekIndex = (day: string) => {
    const index = (WEEK_DAYS as readonly string[]).indexOf(day)
    return index === -1 ? WEEK_DAYS.length : index
  }

  return rows
    .sort(
      (a, b) =>
        new Date(a.first).getTime() - new Date(b.first).getTime() ||
        weekIndex(a.day) - weekIndex(b.day),
    )
    .map((row) => row.day)
}

export type AcceptDayResult =
  | { ok: true; studentId: string; referenceCode: string }
  | { ok: false; reason: 'NO_SUCH_REQUEST' | 'CASE_UNAVAILABLE' }

/**
 * The patient says yes to a day.
 *
 * The case goes to whoever asked about that day first. That is the whole of the
 * "two students, same day" rule: the patient is asked once, and the queue of
 * askers is ordered by when they asked, so nobody has to choose between people.
 *
 * The claim is written the same way an ordinary claim is — a conditional update
 * guarded by `status = 'REQUESTED'` inside a transaction, with the claim row
 * inserted alongside it — so a case still cannot be claimed twice even if a
 * different student claims it normally at the same instant.
 */
export async function acceptDay(caseId: string, day: string): Promise<AcceptDayResult> {
  const contactWindowHours = await getContactWindowHours()

  const [candidate] = await db
    .select({ id: dayRequests.id, studentId: dayRequests.studentId })
    .from(dayRequests)
    .where(
      and(
        eq(dayRequests.caseId, caseId),
        eq(dayRequests.requestedDay, day),
        eq(dayRequests.status, 'PENDING'),
      ),
    )
    .orderBy(asc(dayRequests.createdAt))
    .limit(1)

  if (!candidate) return { ok: false, reason: 'NO_SUCH_REQUEST' }

  try {
    return await db.transaction(async (tx) => {
      // Verification is re-read inside the transaction, exactly as claimCase
      // does: a student suspended since they asked must not be handed a case.
      const [student] = await tx
        .select({ verificationStatus: students.verificationStatus })
        .from(students)
        .where(eq(students.id, candidate.studentId))
        .limit(1)

      if (!student || student.verificationStatus !== 'VERIFIED') {
        await tx
          .update(dayRequests)
          .set({ status: 'SUPERSEDED', respondedAt: new Date() })
          .where(eq(dayRequests.id, candidate.id))
        return { ok: false as const, reason: 'CASE_UNAVAILABLE' as const }
      }

      const claimed = await tx
        .update(cases)
        .set({ status: 'MATCHED', updatedAt: new Date() })
        .where(and(eq(cases.id, caseId), eq(cases.status, 'REQUESTED')))
        .returning({ referenceCode: cases.referenceCode })

      if (claimed.length === 0) return { ok: false as const, reason: 'CASE_UNAVAILABLE' as const }

      await tx.insert(claims).values({
        caseId,
        studentId: candidate.studentId,
        contactDeadlineAt: new Date(Date.now() + contactWindowHours * 60 * 60 * 1000),
      })

      await tx.insert(caseEvents).values({
        caseId,
        fromStatus: 'REQUESTED',
        toStatus: 'MATCHED',
        actorType: 'PATIENT',
        reason: CASE_REASON.CLAIMED_BY_DAY_REQUEST,
      })

      await tx
        .update(dayRequests)
        .set({ status: 'ACCEPTED', respondedAt: new Date() })
        .where(eq(dayRequests.id, candidate.id))

      // Everyone else who was waiting on this case. Not a refusal by the
      // patient — the case simply went somewhere.
      await tx
        .update(dayRequests)
        .set({ status: 'SUPERSEDED', respondedAt: new Date() })
        .where(
          and(
            eq(dayRequests.caseId, caseId),
            eq(dayRequests.status, 'PENDING'),
            ne(dayRequests.id, candidate.id),
          ),
        )

      return {
        ok: true as const,
        studentId: candidate.studentId,
        referenceCode: claimed[0]!.referenceCode,
      }
    })
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, reason: 'CASE_UNAVAILABLE' }
    throw error
  }
}

/**
 * The patient says no to a day.
 *
 * Every pending request for that day is closed, so the patient is not asked the
 * same question again by the next student with the same timetable.
 */
export async function declineDay(caseId: string, day: string): Promise<number> {
  const declined = await db
    .update(dayRequests)
    .set({ status: 'DECLINED', respondedAt: new Date() })
    .where(
      and(
        eq(dayRequests.caseId, caseId),
        eq(dayRequests.requestedDay, day),
        eq(dayRequests.status, 'PENDING'),
      ),
    )
    .returning({ id: dayRequests.id })

  return declined.length
}

/**
 * Close requests that can no longer lead anywhere.
 *
 * A case that has been claimed, expired or finished is not going to be given to
 * anyone who asked about a day, and leaving the question live would have the
 * patient answering about a case that is no longer theirs to give.
 */
export async function supersedeStaleDayRequests(): Promise<number> {
  const stale = await db
    .update(dayRequests)
    .set({ status: 'SUPERSEDED', respondedAt: new Date() })
    .where(
      and(
        eq(dayRequests.status, 'PENDING'),
        sql`exists (
          select 1 from ${cases}
          where ${cases.id} = ${dayRequests.caseId}
            and ${cases.status} <> 'REQUESTED'
        )`,
      ),
    )
    .returning({ id: dayRequests.id })

  return stale.length
}

/** For the student's own view: what became of what they asked. */
export async function listDayRequestsForStudent(studentId: string, limit = 50) {
  return db
    .select({
      id: dayRequests.id,
      caseId: dayRequests.caseId,
      referenceCode: cases.referenceCode,
      requestedDay: dayRequests.requestedDay,
      status: dayRequests.status,
      createdAt: dayRequests.createdAt,
    })
    .from(dayRequests)
    .innerJoin(cases, eq(cases.id, dayRequests.caseId))
    .where(and(eq(dayRequests.studentId, studentId), inArray(dayRequests.status, ['PENDING'])))
    .orderBy(asc(dayRequests.createdAt))
    .limit(limit)
}
