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
