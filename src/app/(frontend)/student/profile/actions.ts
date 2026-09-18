'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getStages, getUniversities } from '@/lib/config'
import { studentProfile } from '@/lib/copy'
import {
  standingAfterProfileEdit,
  validateProfile,
  verifiedFieldsChanged,
  type ProfileFieldErrors,
} from '@/lib/students/validation'

export type ProfileFormState = {
  errors?: ProfileFieldErrors
  formError?: string
  /** Handed back so a rejected submission does not empty the form. */
  values?: {
    fullName?: string
    universityId?: string
    stageId?: string
    clinicDays?: string[]
  }
}

function read(formData: FormData, key: string): string {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function submitProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const fields = {
    fullName: read(formData, 'fullName'),
    universityId: read(formData, 'universityId'),
    stageId: read(formData, 'stageId'),
    clinicDays: formData.getAll('clinicDays').map(String),
  }
  const values = fields
  const document = formData.get('document')
  /*
   * An empty file input still posts a File — size 0, type `''` — and this used
   * to pass it straight to the validator, which refused the empty string as a
   * disallowed type. So a student who left the document out, which the whole
   * flow documents as allowed because sending it to the bot is easier on a cheap
   * phone, was told "نوع الملف مو مقبول" about a file they had not chosen.
   *
   * It is the failure this codebase keeps meeting: nothing errored, the message
   * was about something the student could not see, and it sat on the one step
   * students already drop off at. `/case/new` has filtered on `size > 0` since
   * it was written; this path never did.
   */
  const file = document instanceof File && document.size > 0 ? document : null

  const [universities, stages] = await Promise.all([
    getUniversities(),
    getStages(),
  ])

  const validated = validateProfile(
    fields,
    { universities, stages },
    file ? { size: file.size, type: file.type } : null,
  )

  if (!validated.ok) return { errors: validated.errors, values }

  // One profile per account. Re-submitting must not create a second student row
  // or quietly reset a verification an admin has already decided.
  const [existing] = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  if (existing) return { formError: studentProfile.errors.alreadySubmitted, values }

  try {
    let documentId: string | null = null

    if (file && file.size > 0) {
      const payload = await getPayload({ config })

      // Created through the Local API, which bypasses the collection's `create:
      // false` rule deliberately and on the server. The rule keeps the REST API
      // shut; this path is trusted and already knows who the student is.
      const uploaded = await payload.create({
        collection: 'student-documents',
        data: {},
        file: {
          data: Buffer.from(await file.arrayBuffer()),
          mimetype: file.type,
          name: file.name,
          size: file.size,
        },
      })
      documentId = String(uploaded.id)
    }

    await db.insert(students).values({
      authUserId: session.user.id,
      // Typed by the student, in the form an admin can hold the document up
      // against — not the Google display name this used to take.
      fullName: validated.value.fullName,
      universityId: validated.value.universityId,
      stageId: validated.value.stageId,
      clinicDays: validated.value.clinicDays,
      verificationStatus: 'PENDING',
      verificationDocumentPath: documentId,
    })
  } catch (error) {
    // The document is an identity paper; nothing about its contents is logged.
    console.error(
      'Student profile submission failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { formError: studentProfile.errors.generic, values }
  }

  redirect('/student')
}

/**
 * Correct an existing profile.
 *
 * Separate from `submitProfileAction` rather than a branch inside it, because
 * the two do different things to a student's standing: one creates a record that
 * has never been reviewed, the other may take a reviewed one back to PENDING.
 * Folding them together is how the create path ends up quietly able to overwrite
 * a verification.
 *
 * **Every check here is a rule, not a rendering decision.** The page hides the
 * form from a suspended student, and that stops nobody: every export from a
 * `'use server'` file is a public POST endpoint, so the suspension is enforced
 * below as well — and `standingAfterProfileEdit` makes SUSPENDED absorbing a
 * second time, in a pure function with its own tests.
 *
 * The document is not touched here. It has its own screen and its own intake
 * rules, shared with the bot.
 */
export async function updateProfileAction(
  _previous: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect('/student/login')

  const fields = {
    fullName: read(formData, 'fullName'),
    universityId: read(formData, 'universityId'),
    stageId: read(formData, 'stageId'),
    clinicDays: formData.getAll('clinicDays').map(String),
  }
  const values = fields

  const [existing] = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      universityId: students.universityId,
      stageId: students.stageId,
      verificationStatus: students.verificationStatus,
    })
    .from(students)
    .where(eq(students.authUserId, session.user.id))
    .limit(1)

  // No profile to correct: the create form is the right screen, not this one.
  if (!existing) redirect('/student/profile')

  // A suspension is a decision about a person, and an edit is not an appeal.
  if (existing.verificationStatus === 'SUSPENDED') redirect('/student')

  const [universities, stages] = await Promise.all([getUniversities(), getStages()])

  // The same validator the create step uses, and deliberately so: a rule that
  // holds when a profile is written must hold when it is rewritten, or the edit
  // screen becomes the way around it.
  const validated = validateProfile(fields, { universities, stages }, null)
  if (!validated.ok) return { errors: validated.errors, values }

  const changed = verifiedFieldsChanged(existing, validated.value)
  const standing = standingAfterProfileEdit(existing.verificationStatus, changed)

  try {
    await db
      .update(students)
      .set({
        fullName: validated.value.fullName,
        universityId: validated.value.universityId,
        stageId: validated.value.stageId,
        clinicDays: validated.value.clinicDays,
        verificationStatus: standing.status,
        ...(standing.clearReviewer
          ? { verificationReviewedBy: null, verificationReviewedAt: null }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(students.id, existing.id))
  } catch (error) {
    console.error(
      'Student profile update failed:',
      error instanceof Error ? error.message : 'unknown error',
    )
    return { formError: studentProfile.errors.generic, values }
  }

  // `saved` is a query string rather than state, so the confirmation survives
  // the reload and says which of the two things happened.
  redirect(`/student/profile?saved=${changed ? 'reverify' : '1'}`)
}
