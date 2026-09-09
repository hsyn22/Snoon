/**
 * Photograph limits, in a module with no sharp in it.
 *
 * The case form is a Client Component and has to apply the same rules before
 * uploading — a request over the server action's body limit is refused before
 * the action runs, so the server never gets to return a polite error. Importing
 * them from `process.ts` would pull sharp into the browser bundle.
 */

/** Before processing. A phone photograph is a few megabytes. */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024

/** Enough to show a problem from a couple of angles; not an album. */
export const MAX_PHOTOS_PER_CASE = 4

/**
 * Everything in one submission.
 *
 * Below `serverActions.bodySizeLimit` in next.config.ts with room for the form
 * itself; raising one without the other puts the failure back where the patient
 * cannot see it coming.
 */
export const MAX_PHOTO_BYTES_TOTAL = MAX_PHOTO_BYTES * MAX_PHOTOS_PER_CASE

/** What a browser may hand us. Checked again by decoding, not just believed. */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const
