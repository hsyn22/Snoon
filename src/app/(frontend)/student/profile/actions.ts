'use server'

import { eq } from 'drizzle-orm'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { students } from '@/db/schema'
import { auth } from '@/lib/auth'
import { getColleges, getStages, getUniversities } from '@/lib/config'
import { studentProfile } from '@/lib/copy'
import { validateProfile } from '@/lib/students/validation'

export type ProfileFormState = {
  errors?: Partial<Record<'universityId' | 'collegeId' | 'stageId' | 'document', string>>
  formError?: string
  values?: { universityId?: string; collegeId?: string; stageId?: string }
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
    universityId: read(formData, 'universityId'),
    collegeId: read(formData, 'collegeId'),
    stageId: read(formData, 'stageId'),
  }
  const values = fields
  const document = formData.get('document')
  const file = document instanceof File ? document : null

  const [universities, colleges, stages] = await Promise.all([
    getUniversities(),
    getColleges(),
    getStages(),
  ])

  const validated = validateProfile(
    fields,
    { universities, colleges, stages },
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
      fullName: session.user.name,
      universityId: validated.value.universityId,
      collegeId: validated.value.collegeId,
      stageId: validated.value.stageId,
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
