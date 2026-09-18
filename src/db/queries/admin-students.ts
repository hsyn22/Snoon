import { count, desc, eq } from 'drizzle-orm'
import { db } from '@/db'
import { students } from '@/db/schema'

/**
 * Data access for the admin's student list.
 *
 * Students are the one audience whose *names* an admin is supposed to read —
 * verification is exactly the act of comparing a name against a document, so
 * refusing to show it would make the job impossible. What still binds here is
 * the rest of the rule: **no contact column ever appears in a list**, and there
 * is none in this projection. A student's email lives in Better Auth and stays
 * there; nothing below reaches for it.
 *
 * Every column is named. There is no `select *` in an admin path either.
 */

export type AdminStudentRow = {
  id: string
  fullName: string
  universityId: string
  stageId: string
  clinicDays: string[]
  notifyNewCases: boolean
  mutedTreatmentTypeIds: string[]
  verificationStatus: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED'
  verificationDocumentPath: string | null
  verificationReviewedBy: string | null
  verificationReviewedAt: Date | null
  verificationNote: string | null
  createdAt: Date
}

const STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED'] as const
export type StudentStatus = (typeof STATUSES)[number]

export function isStudentStatus(value: string): value is StudentStatus {
  return (STATUSES as readonly string[]).includes(value)
}

/**
 * The list, newest first, optionally narrowed to one standing.
 *
 * An unrecognised `status` returns everything rather than nothing. A filter
 * value nobody recognises producing an empty page reads as "there are no
 * students", and an empty screen that misstates why is the failure this codebase
 * keeps recording.
 */
export async function listStudentsForAdmin({
  status,
  limit = 200,
}: { status?: string; limit?: number } = {}): Promise<AdminStudentRow[]> {
  const where = status && isStudentStatus(status) ? eq(students.verificationStatus, status) : undefined

  return db
    .select({
      id: students.id,
      fullName: students.fullName,
      universityId: students.universityId,
      stageId: students.stageId,
      clinicDays: students.clinicDays,
      notifyNewCases: students.notifyNewCases,
      mutedTreatmentTypeIds: students.mutedTreatmentTypeIds,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
      verificationReviewedBy: students.verificationReviewedBy,
      verificationReviewedAt: students.verificationReviewedAt,
      verificationNote: students.verificationNote,
      createdAt: students.createdAt,
    })
    .from(students)
    .where(where)
    .orderBy(desc(students.createdAt))
    .limit(limit)
}

/**
 * How many students sit in each standing.
 *
 * One grouped query rather than one per status, and it is what puts the number
 * of people waiting on a decision in front of the person who makes it. A queue
 * nobody can see the size of is a queue that grows.
 */
export async function countStudentsByStatus(): Promise<Record<string, number>> {
  const rows = await db
    .select({ status: students.verificationStatus, total: count() })
    .from(students)
    .groupBy(students.verificationStatus)

  return Object.fromEntries(rows.map((row) => [row.status, Number(row.total)]))
}
