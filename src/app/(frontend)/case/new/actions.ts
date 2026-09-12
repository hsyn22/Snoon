'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { attachCasePhoto, submitCase } from '@/db/queries/cases'
import { caseForm, casePhotos as photoCopy } from '@/lib/copy'
import { MAX_PHOTOS_PER_CASE, processCasePhoto } from '@/lib/images/process'
import { checkRateLimit, clientIp, RATE_LIMITS } from '@/lib/rate-limit'
import { auth } from '@/lib/auth'
import { checkPhoneMaySubmit } from '@/db/queries/phone-blocks'
import { getPhoneSubmissionLimits } from '@/lib/config/settings'
import {
  readCaseForm,
  validateCaseForm,
  type CaseFormFields,
  type FieldErrors,
} from '@/lib/cases/validation'

export type CaseFormState = {
  errors?: FieldErrors
  /** Photograph problems are reported separately: they are optional extras, and
   *  losing an otherwise-good submission over one bad file would be wrong. */
  photoError?: string
  formError?: string
  /**
   * What the patient typed, handed back so a rejected submission does not empty
   * the form. React 19 resets a form after an action, so the only values that
   * survive are the ones re-rendered as each input's default.
   */
  values?: CaseFormFields
}

export async function submitCaseAction(
  _previous: CaseFormState,
  formData: FormData,
): Promise<CaseFormState> {
  const fields = readCaseForm(formData)

  // Before validation and before any photograph is decoded: the expensive part
  // of this action is the image work, so the limit has to sit in front of it.
  // The submitted values are still handed back, so a patient caught by a shared
  // address does not lose what they typed.
  const limited = checkRateLimit(
    `case-submission:${clientIp(await headers())}`,
    RATE_LIMITS.caseSubmission,
  )
  if (!limited.ok) return { formError: caseForm.errors.tooMany, values: fields }

  const validated = await validateCaseForm(fields)

  if (!validated.ok) return { errors: validated.errors, values: fields }

  /**
   * The number itself has to pass before anything is written.
   *
   * A patient needs no account, so nothing stops a case carrying someone else's
   * number — and the first that person hears of سنون is a student ringing about
   * treatment they never asked for. Ownership cannot be proven without an SMS
   * code, which costs money per message and is excluded, so this caps how much
   * one number can be used and refuses one a student has already reported.
   * Reported as an error on the phone field, so the message sits next to the
   * thing it is about and the rest of the form survives.
   */
  const phoneVerdict = await checkPhoneMaySubmit(
    validated.value.patientPhone,
    await getPhoneSubmissionLimits(),
  )

  if (!phoneVerdict.ok) {
    const message =
      phoneVerdict.reason === 'BLOCKED'
        ? caseForm.errors.phoneBlocked
        : phoneVerdict.reason === 'TOO_MANY_OPEN'
          ? caseForm.errors.phoneTooManyOpen
          : caseForm.errors.phoneTooManyToday

    return { errors: { patientPhone: message }, values: fields }
  }

  // Photographs are processed BEFORE the case is written, so a case is never
  // created alongside an image that turned out to be unusable — and so nothing
  // with EXIF intact can reach storage.
  const files = formData
    .getAll('photos')
    .filter((entry): entry is File => entry instanceof File && entry.size > 0)

  if (files.length > MAX_PHOTOS_PER_CASE) {
    return { photoError: photoCopy.errors.tooMany, values: fields }
  }

  const processed: Buffer[] = []
  for (const file of files) {
    const result = await processCasePhoto(Buffer.from(await file.arrayBuffer()))
    if (!result.ok) {
      return {
        photoError:
          result.reason === 'TOO_LARGE' ? photoCopy.errors.tooLarge : photoCopy.errors.notAnImage,
        values: fields,
      }
    }
    processed.push(result.photo.data)
  }

  /*
   * If they happen to be signed in, the case is theirs; if not, nothing changes.
   *
   * Read from the session and never from the form — a user id a client could set
   * would let anyone file a case into somebody else's account. Read after
   * validation so an anonymous submission never pays for a session lookup it
   * does not need, and wrapped because a broken session must not be able to stop
   * a patient submitting a case. Being signed in is a convenience; submitting is
   * the product.
   */
  let patientAuthUserId: string | null = null
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    patientAuthUserId = session?.user.id ?? null
  } catch {
    patientAuthUserId = null
  }

  let trackingToken: string
  try {
    const result = await submitCase({ ...validated.value, patientAuthUserId })
    trackingToken = result.trackingToken

    if (processed.length > 0) {
      const { getPayload } = await import('payload')
      const { default: payloadConfig } = await import('@payload-config')
      const payload = await getPayload({ config: payloadConfig })

      for (const [index, data] of processed.entries()) {
        const media = await payload.create({
          collection: 'case-photos',
          data: {},
          file: {
            data,
            mimetype: 'image/webp',
            // Named by position, never by whatever the patient's phone called it:
            // camera filenames sometimes carry dates and locations of their own.
            name: `case-photo-${index + 1}.webp`,
            size: data.byteLength,
          },
        })
        await attachCasePhoto(result.caseId, String(media.id))
      }
    }
  } catch (error) {
    // Log that a submission failed, never what was in it — the form data holds
    // the patient's name and phone number.
    console.error('Case submission failed:', error instanceof Error ? error.message : 'unknown error')
    return { formError: caseForm.errors.submitFailed, values: fields }
  }

  // redirect() signals by throwing, so it must sit outside the try/catch above —
  // otherwise the catch would swallow it and report a submission failure for a
  // case that was actually saved.
  redirect(`/case/track/${trackingToken}?new=1`)
}
