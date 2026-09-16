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

  /*
   * The case is written first, on its own, and **nothing after this point may
   * turn into a failure the patient sees**.
   *
   * It used to be one `try` around the write, the photographs and the student
   * alert together. So a photograph that failed to store — object storage
   * refusing a credential, say — was reported as `submitFailed` on a case that
   * had already been saved. The patient, correctly reading the screen, submitted
   * again. Haider ended up with a queue of duplicates and no photographs on any
   * of them, which is exactly what that shape produces.
   *
   * A case with no photographs is a smaller case. A case submitted three times
   * is three people's worth of a student's queue and three calls to the same
   * number.
   */
  let trackingToken: string
  let caseId: string
  try {
    const result = await submitCase({ ...validated.value, patientAuthUserId })
    trackingToken = result.trackingToken
    caseId = result.caseId
  } catch (error) {
    // Log that a submission failed, never what was in it — the form data holds
    // the patient's name and phone number.
    console.error(
      'Case submission failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { formError: caseForm.errors.submitFailed, values: fields }
  }

  /*
   * Photographs, best effort.
   *
   * Logged under their own name rather than as a submission failure: the two
   * have completely different fixes, and a log line saying "submission failed"
   * for a case that is sitting in the database sends whoever reads it after the
   * wrong thing. This is the line that names a broken storage credential.
   */
  if (processed.length > 0) {
    try {
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
        await attachCasePhoto(caseId, String(media.id))
      }
    } catch (error) {
      // Never the image itself, and never the patient — only why storage said no.
      console.error(
        'Case photographs failed to store:',
        error instanceof Error ? error.message : 'unknown error',
      )
    }
  }

  /*
   * Tell the students who could take it, after the case is safely written and
   * outside its transaction.
   *
   * This is the one thing the site structurally cannot do: a queue only helps
   * somebody who thought to open it, and a student with nothing waiting has no
   * reason to look. It is also why the photographs are attached first — a
   * student who opens the case the second the message arrives should find the
   * pictures already there.
   *
   * Best effort, and deliberately awaited rather than left dangling: a
   * serverless function that returns is a function that may be frozen
   * mid-send. A failure is swallowed, because a patient must never lose a
   * submission over a message.
   */
  try {
    const { notifyStudentsOfNewCase } = await import('@/lib/notifications/new-case')
    await notifyStudentsOfNewCase(caseId)
  } catch (error) {
    console.error(
      'New-case alert failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
  }

  // redirect() signals by throwing, so it must sit outside every try above —
  // otherwise a catch would swallow it and report a failure for a case that was
  // actually saved.
  redirect(`/case/track/${trackingToken}?new=1`)
}
