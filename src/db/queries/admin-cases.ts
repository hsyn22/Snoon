import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { appointments, caseEvents, casePhotos, cases, claims, students } from '@/db/schema'
import { isSubjectLinked } from '@/db/queries/telegram'

/**
 * Data access for the admin case view.
 *
 * This is the one audience allowed to see everything about a case — an admin
 * takes a phone call from a patient quoting a reference code and has to be able
 * to say what happened. The access table in CLAUDE.md grants admins every
 * column, so unlike the student-facing projections these functions do return
 * `patientName` and `patientPhone`.
 *
 * The privacy rule that still binds here: contact details never appear in a list.
 * `listRecentCasesForAdmin` cannot return them — they are not in its projection —
 * and only `findCaseForAdmin`, which resolves exactly one case from a reference
 * code the admin typed, does. Widening the list would put every patient's number
 * in one page of HTML, which is precisely what the rule exists to prevent.
 *
 * Every function still names its columns. There is no `select *` here either.
 */

export type AdminCaseListItem = {
  id: string
  referenceCode: string
  status: string
  cityId: string
  treatmentTypeIds: string[]
  createdAt: Date
  updatedAt: Date
}

/** The landing list: what has come in lately, newest first. No contact details. */
export async function listRecentCasesForAdmin(limit = 25): Promise<AdminCaseListItem[]> {
  return db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      status: cases.status,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .orderBy(desc(cases.createdAt))
    .limit(limit)
}

/**
 * How many cases sit in each status.
 *
 * Worth having in front of an admin because of the consequence recorded under
 * open decision 3: a wrong stage-capability mapping makes cases invisible rather
 * than merely inconvenient, and the only symptom is REQUESTED climbing while
 * nothing gets claimed.
 */
export async function countCasesByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: cases.status, total: count() })
    .from(cases)
    .groupBy(cases.status)

  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]))
}

export type AdminClaim = {
  id: string
  status: string
  studentId: string
  studentName: string
  studentUniversityId: string
  studentCollegeId: string
  studentStageId: string
  contactDeadlineAt: Date
  contactAssertedAt: Date | null
  releasedAt: Date | null
  releaseReason: string | null
  createdAt: Date
}

export type AdminAppointment = {
  id: string
  scheduledFor: Date
  supersededAt: Date | null
  createdAt: Date
}

export type AdminCaseEvent = {
  id: string
  fromStatus: string | null
  toStatus: string
  actorType: string
  actorId: string | null
  reason: string | null
  createdAt: Date
}

export type AdminCaseView = {
  id: string
  referenceCode: string
  status: string
  cityId: string
  treatmentTypeIds: string[]
  availabilityDays: string[]
  notes: string | null
  /** Admin-only, per the access table. Never rendered in a list. */
  patientName: string
  patientPhone: string
  trackingTokenRevokedAt: Date | null
  createdAt: Date
  updatedAt: Date
  /** Newest first: the live claim, if any, is the first row. */
  claims: AdminClaim[]
  /** Newest first; a superseded row is a reschedule, kept rather than overwritten. */
  appointments: AdminAppointment[]
  /** Oldest first — the audit trail reads top to bottom. */
  events: AdminCaseEvent[]
  photos: { id: string; deletedAt: Date | null; deletedReason: string | null }[]
  /** Whether the patient's Telegram chat is actually bound — an invite that was
   *  minted but never opened does not count, because nothing can be sent to it. */
  telegramLinked: boolean
}

/**
 * Everything about one case, found by the code the patient reads out.
 *
 * The caller passes an already-normalised code (see `normaliseReferenceCode`),
 * so a lowercase or prefix-less code typed into the admin still matches.
 */
export async function findCaseForAdmin(referenceCode: string): Promise<AdminCaseView | null> {
  const [record] = await db
    .select({
      id: cases.id,
      referenceCode: cases.referenceCode,
      status: cases.status,
      cityId: cases.cityId,
      treatmentTypeIds: cases.treatmentTypeIds,
      availabilityDays: cases.availabilityDays,
      notes: cases.notes,
      patientName: cases.patientName,
      patientPhone: cases.patientPhone,
      trackingTokenRevokedAt: cases.trackingTokenRevokedAt,
      createdAt: cases.createdAt,
      updatedAt: cases.updatedAt,
    })
    .from(cases)
    .where(eq(cases.referenceCode, referenceCode))
    .limit(1)

  if (!record) return null

  const [claimRows, appointmentRows, eventRows, photoRows] = await Promise.all([
    db
      .select({
        id: claims.id,
        status: claims.status,
        studentId: claims.studentId,
        studentName: students.fullName,
        studentUniversityId: students.universityId,
        studentCollegeId: students.collegeId,
        studentStageId: students.stageId,
        contactDeadlineAt: claims.contactDeadlineAt,
        contactAssertedAt: claims.contactAssertedAt,
        releasedAt: claims.releasedAt,
        releaseReason: claims.releaseReason,
        createdAt: claims.createdAt,
      })
      .from(claims)
      .innerJoin(students, eq(students.id, claims.studentId))
      .where(eq(claims.caseId, record.id))
      .orderBy(desc(claims.createdAt)),

    db
      .select({
        id: appointments.id,
        scheduledFor: appointments.scheduledFor,
        supersededAt: appointments.supersededAt,
        createdAt: appointments.createdAt,
      })
      .from(appointments)
      .where(eq(appointments.caseId, record.id))
      .orderBy(desc(appointments.createdAt)),

    db
      .select({
        id: caseEvents.id,
        fromStatus: caseEvents.fromStatus,
        toStatus: caseEvents.toStatus,
        actorType: caseEvents.actorType,
        actorId: caseEvents.actorId,
        reason: caseEvents.reason,
        createdAt: caseEvents.createdAt,
      })
      .from(caseEvents)
      .where(eq(caseEvents.caseId, record.id))
      .orderBy(caseEvents.createdAt),

    db
      .select({
        id: casePhotos.id,
        deletedAt: casePhotos.deletedAt,
        deletedReason: casePhotos.deletedReason,
      })
      .from(casePhotos)
      .where(eq(casePhotos.caseId, record.id))
      .orderBy(casePhotos.createdAt),
  ])

  const telegramLinked = await isSubjectLinked({ type: 'PATIENT_CASE', id: record.id })

  return {
    ...record,
    claims: claimRows,
    appointments: appointmentRows,
    events: eventRows,
    photos: photoRows,
    telegramLinked,
  }
}
