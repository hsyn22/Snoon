import { cache } from 'react'
import { getPayload } from 'payload'
import config from '@payload-config'

/**
 * Payload settings read by domain code.
 *
 * Deliberately NOT marked `server-only`, unlike `./index.ts`. That guard makes a
 * module unloadable outside a React server context, which also rules out plain
 * Node — and the contact-window expiry is a scheduled job run exactly that way.
 * A guard that breaks the job it governs is the wrong guard.
 *
 * The client/server split is still enforced where it matters: no Client
 * Component imports this, and the one that would have (the case form) imports
 * `./schema` instead.
 */

const FALLBACK_CONTACT_WINDOW_HOURS = 48

/**
 * How long a student has to contact the patient after claiming a case.
 *
 * 48 hours by default, tunable from the admin. A missing or zero value falls
 * back rather than being trusted: a zero-length window would expire every claim
 * the instant it was made.
 */
export const getContactWindowHours = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.contactWindowHours
  return typeof value === 'number' && value > 0 ? value : FALLBACK_CONTACT_WINDOW_HOURS
})


const FALLBACK_CASE_EXPIRY_DAYS = 30

/**
 * How long a case may sit unclaimed before it expires.
 *
 * A patient who submitted months ago has usually found treatment elsewhere or
 * given up. Leaving the case in the queue wastes a student's claim and, worse,
 * has them ring someone who no longer wants to be rung.
 */
export const getCaseExpiryDays = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.caseExpiryDays
  return typeof value === 'number' && value > 0 ? value : FALLBACK_CASE_EXPIRY_DAYS
})


const FALLBACK_PHOTO_RETENTION_DAYS = 60

/**
 * How long intraoral photographs are kept after a case reaches a terminal state.
 *
 * They exist to help a student treat someone. Once that is over they are
 * pictures inside a stranger's mouth sitting on a disk, and keeping them is a
 * liability rather than an asset.
 */
export const getPhotoRetentionDays = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.photoRetentionDays
  return typeof value === 'number' && value > 0 ? value : FALLBACK_PHOTO_RETENTION_DAYS
})


const FALLBACK_WRONG_NUMBER_BLOCK_DAYS = 30
const FALLBACK_MAX_OPEN_CASES_PER_PHONE = 3
const FALLBACK_MAX_CASES_PER_PHONE_PER_DAY = 5

/**
 * How long a number stays out of use after a student reports that its owner
 * never asked for treatment.
 *
 * Long enough that resubmitting the same prank is not worth the wait, short
 * enough that a real patient whose number was misused is not shut out for good.
 */
export const getWrongNumberBlockDays = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.wrongNumberBlockDays
  return typeof value === 'number' && value > 0 ? value : FALLBACK_WRONG_NUMBER_BLOCK_DAYS
})

/**
 * The two caps on how much one phone number can be used.
 *
 * Not one open case per number: a household shares a phone, and a mother
 * submitting for herself and for her child is ordinary. The point is to stop
 * someone queueing dozens of calls to a person who never asked.
 */
export const getPhoneSubmissionLimits = cache(
  async (): Promise<{ maxOpen: number; maxPerDay: number }> => {
    const payload = await getPayload({ config })
    const settings = await payload.findGlobal({ slug: 'settings' })

    const maxOpen = settings.maxOpenCasesPerPhone
    const maxPerDay = settings.maxCasesPerPhonePerDay

    return {
      maxOpen:
        typeof maxOpen === 'number' && maxOpen > 0 ? maxOpen : FALLBACK_MAX_OPEN_CASES_PER_PHONE,
      maxPerDay:
        typeof maxPerDay === 'number' && maxPerDay > 0
          ? maxPerDay
          : FALLBACK_MAX_CASES_PER_PHONE_PER_DAY,
    }
  },
)


const FALLBACK_CONTACT_GRACE_HOURS = 48

/**
 * Extra time granted when a student reports having called.
 *
 * The contact window exists to stop a case being sat on. But a student who
 * actually rang has done their part, and the patient they rang may simply not
 * use Telegram and may never open a tracking link — which is an ordinary way for
 * the median user to behave, not a failure. Taking the case off that student at
 * the 48-hour mark punishes the one person who did what was asked.
 */
export const getContactGraceHours = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.contactGraceHours
  return typeof value === 'number' && value > 0 ? value : FALLBACK_CONTACT_GRACE_HOURS
})


const FALLBACK_CONTACT_RETENTION_DAYS = 90

/**
 * How long a finished case keeps the patient's name, number and notes.
 *
 * Longer than photographs, because a patient may ring months later asking what
 * happened, and an admin needs to be able to answer. Not forever, because a
 * phone number on a closed case has no remaining purpose and every day it stays
 * is exposure with no upside.
 */
export const getContactRetentionDays = cache(async (): Promise<number> => {
  const payload = await getPayload({ config })
  const settings = await payload.findGlobal({ slug: 'settings' })
  const value = settings.contactRetentionDays
  return typeof value === 'number' && value > 0 ? value : FALLBACK_CONTACT_RETENTION_DAYS
})
