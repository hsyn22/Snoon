import { desc } from 'drizzle-orm'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { db } from '@/db'
import { students } from '@/db/schema'
import { getColleges, getStages, getUniversities } from '@/lib/config'
import { decideStudentVerification } from './student-review-actions'

/**
 * Student verification, inside the Payload admin.
 *
 * Students live in the `snoon` Drizzle schema, not in Payload — they have
 * invariants and an audit trail, and Payload must never own that. But the person
 * reviewing them is an admin who is already here, so the review lives here too
 * and reads across to Drizzle rather than duplicating the record.
 *
 * This view authorises itself. Payload's admin gates the *interface* — an
 * unauthenticated visitor is shown a login screen — but a custom view is still
 * server-rendered, so anything queried here lands in the HTML regardless of who
 * asked. Without the check below, `curl /admin/students` returned every
 * student's name, university and document reference to anyone. Query nothing
 * until the caller is known to be an admin.
 */

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'قيد المراجعة',
  VERIFIED: 'موثّق',
  REJECTED: 'مرفوض',
  SUSPENDED: 'موقوف',
}

const STATUS_COLOUR: Record<string, string> = {
  PENDING: '#8a6d00',
  VERIFIED: '#116149',
  REJECTED: '#9b1c1c',
  SUSPENDED: '#6b7280',
}

export default async function StudentReviewView() {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'admins') {
    // Payload's own login screen is what the visitor sees; this component simply
    // refuses to put anything in the response.
    return null
  }

  // Students store slugs; an admin should read names. Falls back to the slug so a
  // student attached to a since-deleted college still shows something.
  const [universities, colleges, stages] = await Promise.all([
    getUniversities(),
    getColleges(),
    getStages(),
  ])
  const nameOf = (list: readonly { id: string; nameAr: string }[], id: string) =>
    list.find((entry) => entry.id === id)?.nameAr ?? id

  const rows = await db
    .select({
      id: students.id,
      fullName: students.fullName,
      universityId: students.universityId,
      collegeId: students.collegeId,
      stageId: students.stageId,
      verificationStatus: students.verificationStatus,
      verificationDocumentPath: students.verificationDocumentPath,
      verificationReviewedBy: students.verificationReviewedBy,
      verificationReviewedAt: students.verificationReviewedAt,
      verificationNote: students.verificationNote,
      createdAt: students.createdAt,
    })
    .from(students)
    .orderBy(desc(students.createdAt))
    .limit(200)

  // Resolve each document id to its URL. Payload's access rules still gate the
  // file itself, so a link here is not a way around them.
  const documents = new Map<string, string>()
  for (const row of rows) {
    if (!row.verificationDocumentPath) continue
    try {
      const doc = await payload.findByID({
        collection: 'student-documents',
        id: row.verificationDocumentPath,
      })
      if (doc?.url) documents.set(row.id, doc.url)
    } catch {
      // A deleted document must not break the whole review page.
    }
  }

  const pending = rows.filter((row) => row.verificationStatus === 'PENDING')

  return (
    <div style={{ padding: '2rem', maxWidth: '60rem', margin: '0 auto' }} dir="rtl">
      <h1 style={{ marginBottom: '0.5rem' }}>توثيق الطلبة</h1>
      <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
        راجع وثيقة التسجيل وقرر. الطالب ما يشوف أي حالة إلا بعد ما يتوثّق.
      </p>

      {rows.length === 0 ? (
        <p style={{ opacity: 0.7 }}>ما أكو طلبة مسجّلين لحد الآن.</p>
      ) : null}

      {pending.length === 0 && rows.length > 0 ? (
        <p style={{ opacity: 0.7, marginBottom: '2rem' }}>ما أكو طلبات بانتظار المراجعة.</p>
      ) : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {rows.map((row) => {
          const documentUrl = documents.get(row.id)
          return (
            <section
              key={row.id}
              style={{
                border: '1px solid rgba(128,128,128,0.35)',
                borderRadius: '0.5rem',
                padding: '1rem',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                }}
              >
                <strong style={{ fontSize: '1.05rem' }}>{row.fullName}</strong>
                <span style={{ color: STATUS_COLOUR[row.verificationStatus], fontWeight: 600 }}>
                  {STATUS_LABEL[row.verificationStatus] ?? row.verificationStatus}
                </span>
              </div>

              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '0.25rem 1rem',
                  margin: '0.75rem 0',
                  fontSize: '0.9rem',
                }}
              >
                <dt style={{ opacity: 0.7 }}>الجامعة</dt>
                <dd style={{ margin: 0 }}>{nameOf(universities, row.universityId)}</dd>
                <dt style={{ opacity: 0.7 }}>الكلية</dt>
                <dd style={{ margin: 0 }}>{nameOf(colleges, row.collegeId)}</dd>
                <dt style={{ opacity: 0.7 }}>المرحلة</dt>
                <dd style={{ margin: 0 }}>{nameOf(stages, row.stageId)}</dd>
                {row.verificationReviewedBy ? (
                  <>
                    <dt style={{ opacity: 0.7 }}>راجعها</dt>
                    <dd style={{ margin: 0 }}>{row.verificationReviewedBy}</dd>
                  </>
                ) : null}
                {row.verificationNote ? (
                  <>
                    <dt style={{ opacity: 0.7 }}>ملاحظة</dt>
                    <dd style={{ margin: 0 }}>{row.verificationNote}</dd>
                  </>
                ) : null}
              </dl>

              {documentUrl ? (
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  style={{ fontSize: '0.9rem', textDecoration: 'underline' }}
                >
                  افتح وثيقة التسجيل
                </a>
              ) : (
                <span style={{ fontSize: '0.9rem', opacity: 0.6 }}>ما أكو وثيقة مرفوعة.</span>
              )}

              <form
                action={async (formData: FormData) => {
                  'use server'
                  const decision = String(formData.get('decision'))
                  const note = String(formData.get('note') ?? '')
                  if (
                    decision === 'VERIFIED' ||
                    decision === 'REJECTED' ||
                    decision === 'SUSPENDED' ||
                    decision === 'PENDING'
                  ) {
                    await decideStudentVerification(row.id, decision, note)
                  }
                }}
                style={{ marginTop: '1rem', display: 'grid', gap: '0.5rem' }}
              >
                <input
                  type="text"
                  name="note"
                  placeholder="ملاحظة للإدارة (اختياري)"
                  defaultValue={row.verificationNote ?? ''}
                  style={{
                    padding: '0.5rem',
                    borderRadius: '0.35rem',
                    border: '1px solid rgba(128,128,128,0.35)',
                    background: 'transparent',
                    color: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {(
                    [
                      ['VERIFIED', 'وثّق', '#116149'],
                      ['REJECTED', 'ارفض', '#9b1c1c'],
                      ['SUSPENDED', 'أوقف', '#6b7280'],
                    ] as const
                  ).map(([decision, label, colour]) => (
                    <button
                      key={decision}
                      type="submit"
                      name="decision"
                      value={decision}
                      disabled={row.verificationStatus === decision}
                      style={{
                        padding: '0.5rem 1rem',
                        borderRadius: '0.35rem',
                        border: 'none',
                        background: colour,
                        color: 'white',
                        cursor: 'pointer',
                        opacity: row.verificationStatus === decision ? 0.4 : 1,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </form>
            </section>
          )
        })}
      </div>
    </div>
  )
}
