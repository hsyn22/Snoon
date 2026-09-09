/**
 * The client-safe half of configuration: shapes and the fixed week.
 *
 * Kept apart from `./index.ts` on purpose. That module reads Payload, which
 * pulls in `fs`, `child_process` and the rest of the CMS — importing it from a
 * Client Component drags all of that into the browser bundle and the build
 * fails. A Client Component imports from here; only the server imports the
 * reader.
 */

export type City = {
  /** Payload's slug, not its numeric row id — this is what a case stores. */
  id: string
  nameAr: string
}

export type TreatmentType = {
  id: string
  nameAr: string
}

export type University = {
  id: string
  nameAr: string
  /** Slug of the city this university is in. */
  cityId: string
}

export type College = {
  id: string
  nameAr: string
  /** Slug of the parent university. */
  universityId: string
}

export type Stage = {
  id: string
  nameAr: string
  order: number
}

/**
 * Clinic days, starting Saturday as Iraqi clinics do. Friday is always a
 * holiday, so it is not offered — a patient cannot pick a day no clinic runs.
 *
 * Not Payload-managed: the days of the week are not configuration.
 */
export const WEEK_DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const
export type WeekDay = (typeof WEEK_DAYS)[number]

export function isWeekDay(value: string): value is WeekDay {
  return (WEEK_DAYS as readonly string[]).includes(value)
}
