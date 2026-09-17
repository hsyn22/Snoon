/**
 * The review scale, on its own, so a Client Component can import it.
 *
 * The same reason `src/lib/images/limits.ts` exists: the form is a Client
 * Component, and importing the scale from `@/db/queries/reviews` would pull
 * Drizzle, the schema and the connection into the browser bundle — and fail the
 * build, which is the good outcome. The bad one is that it merely works and
 * ships a database client to a phone on 400kbps.
 *
 * One definition, so the form and the server-side validation cannot disagree
 * about what a valid rating is.
 */
export const REVIEW_SCALE = [1, 2, 3, 4, 5] as const

export type ReviewRating = (typeof REVIEW_SCALE)[number]

export function isValidRating(value: number): value is ReviewRating {
  return Number.isInteger(value) && value >= 1 && value <= 5
}
