import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  countStudentsByStatus,
  isStudentStatus,
  listStudentsForAdmin,
} from '@/db/queries/admin-students'
import { getAllTreatmentTypes, getStages, getUniversities } from '@/lib/config'
import { summariseClaimsByStudent } from '@/db/queries/claims'
import { listLinkedSubjectIds } from '@/db/queries/telegram'
import { caseForm, studentHistory, studentNotifications } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { decideStudentVerification } from './student-review-actions'
import { AdminPage, Empty, FilterLinks, Panel, Stat, StatRow, Tag, type Tone } from './ui'

/**
 * The students, and the decision an admin makes about each of them.
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
 *
 * **Names are shown here on purpose**, and they are the exception rather than a
 * relaxation: verification *is* the act of comparing a name against a document,
 * so a page that hid it would make the job impossible. No contact column appears
 * — there is none in the projection — and a student's email stays in Better Auth
 * where nothing on this page reaches for it.
 */

const STATUS_LABEL = {
  PENDING: 'قيد المراجعة',
  VERIFIED: 'موثّق',
  REJECTED: 'مرفوض',
  SUSPENDED: 'موقوف',
} as const satisfies Record<string, string>

/* Colour is never the only signal: every tag carries its Arabic label too. */
const STATUS_TONE: Record<string, Tone> = {
  PENDING: 'warning',
  VERIFIED: 'success',
  REJECTED: 'danger',
  SUSPENDED: 'neutral',
}

const DECISIONS = [
  ['VERIFIED', 'وثّق', 'var(--theme-success-500)'],
  ['REJECTED', 'ارفض', 'var(--theme-error-500)'],
  ['SUSPENDED', 'أوقف', 'var(--theme-elevation-500)'],
] as const

function readParam(
  params: { [key: string]: string | string[] | undefined } | undefined,
  key: string,
): string {
  const raw = params?.[key]
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
}

export default async function StudentReviewView({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'admins') {
    // Payload's own login screen is what the visitor sees; this component simply
    // refuses to put anything in the response.
    return null
  }

  /*
   * The filter is validated rather than passed through, and an unrecognised
   * value falls back to everything. A blank list reads as "there are no
   * students", which is the expensive kind of wrong here.
   */
  const requested = readParam(searchParams, 'status')
  const status = isStudentStatus(requested) ? requested : ''

  // Students store slugs; an admin should read names. Falls back to the slug so a
  // student attached to a since-deleted university still shows something.
  const [universities, stages, treatments, records, linkedStudentIds, rows, counts] =
    await Promise.all([
      getUniversities(),
      getStages(),
      getAllTreatmentTypes(),
      // One query for every student's case record, rather than one per row: this
      // page draws up to 200 students.
      summariseClaimsByStudent(),
      listLinkedSubjectIds('STUDENT'),
      listStudentsForAdmin({ status: status || undefined }),
      countStudentsByStatus(),
    ])

  const nameOf = (list: readonly { id: string; nameAr: string }[], id: string) =>
    list.find((entry) => entry.id === id)?.nameAr ?? id

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

  /** A student with no claims has a record too — it is simply empty. */
  const recordFor = (studentId: string) =>
    records.get(studentId) ?? { total: 0, treated: 0, active: 0, entries: [] }

  const everything = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const hrefFor = (value: string) => (value ? `/admin/students?status=${value}` : '/admin/students')

  return (
    <AdminPage
      wide
      title="الطلبة"
      lead="راجع وثيقة التسجيل وقارنها بالاسم والجامعة، وقرر. الطالب ما يشوف أي حالة إلا بعد ما يتوثّق."
    >
      <StatRow>
        <Stat label="كل الطلبة" value={everything} />
        <Stat label={STATUS_LABEL.PENDING} value={counts.PENDING ?? 0} tone="warning" />
        <Stat label={STATUS_LABEL.VERIFIED} value={counts.VERIFIED ?? 0} tone="success" />
        <Stat label={STATUS_LABEL.REJECTED} value={counts.REJECTED ?? 0} tone="danger" />
        <Stat label={STATUS_LABEL.SUSPENDED} value={counts.SUSPENDED ?? 0} />
      </StatRow>

      <Panel title="حسب حالة التوثيق">
        <FilterLinks
          current={status}
          hrefFor={hrefFor}
          options={[
            { value: '', label: 'الكل', count: everything },
            ...Object.entries(STATUS_LABEL).map(([key, label]) => ({
              value: key,
              label,
              count: counts[key] ?? 0,
            })),
          ]}
        />
      </Panel>

      {rows.length === 0 ? (
        /* Which list is empty, by name. An admin filtered to "موقوف" who sees
           nothing must be able to tell that from having no students at all. */
        <Empty
          reason={
            everything === 0
              ? 'ما أكو طلبة مسجّلين لحد الآن.'
              : `ما أكو طالب بحالة «${status ? STATUS_LABEL[status] : 'الكل'}». جرّب «الكل».`
          }
        />
      ) : null}

      <div style={{ display: 'grid', gap: '1rem' }}>
        {rows.map((row) => {
          const documentUrl = documents.get(row.id)
          return (
            <Panel key={row.id} style={{ marginBottom: 0 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  marginBottom: '0.75rem',
                }}
              >
                <strong style={{ fontSize: '1.05rem' }}>{row.fullName}</strong>
                <Tag
                  label={STATUS_LABEL[row.verificationStatus]}
                  tone={STATUS_TONE[row.verificationStatus] ?? 'neutral'}
                />
              </div>

              <dl
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr',
                  gap: '0.25rem 1rem',
                  margin: '0 0 0.75rem',
                  fontSize: '0.9rem',
                }}
              >
                <dt style={{ color: 'var(--theme-elevation-600)' }}>الجامعة</dt>
                <dd style={{ margin: 0 }}>{nameOf(universities, row.universityId)}</dd>
                <dt style={{ color: 'var(--theme-elevation-600)' }}>المرحلة</dt>
                <dd style={{ margin: 0 }}>{nameOf(stages, row.stageId)}</dd>
                <dt style={{ color: 'var(--theme-elevation-600)' }}>سجّل بتاريخ</dt>
                <dd style={{ margin: 0 }} dir="ltr">
                  {formatCaseDate(row.createdAt)}
                </dd>
                {row.verificationReviewedBy ? (
                  <>
                    <dt style={{ color: 'var(--theme-elevation-600)' }}>راجعها</dt>
                    <dd style={{ margin: 0 }}>{row.verificationReviewedBy}</dd>
                  </>
                ) : null}
                {row.verificationNote ? (
                  <>
                    <dt style={{ color: 'var(--theme-elevation-600)' }}>ملاحظة</dt>
                    <dd style={{ margin: 0 }}>{row.verificationNote}</dd>
                  </>
                ) : null}
                <dt style={{ color: 'var(--theme-elevation-600)' }}>أيام الدوام</dt>
                <dd style={{ margin: 0 }}>
                  {row.clinicDays.length === 0
                    ? 'كل الأيام'
                    : row.clinicDays
                        .map(
                          (day) => caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day,
                        )
                        .join('، ')}
                </dd>
                <dt style={{ color: 'var(--theme-elevation-600)' }}>تلگرام</dt>
                <dd style={{ margin: 0 }}>{linkedStudentIds.has(row.id) ? 'مربوط' : 'مو مربوط'}</dd>
                <dt style={{ color: 'var(--theme-elevation-600)' }}>الإشعارات</dt>
                <dd style={{ margin: 0 }}>
                  {row.notifyNewCases
                    ? `${studentNotifications.adminOn} — ${
                        row.mutedTreatmentTypeIds.length === 0
                          ? studentNotifications.adminAll
                          : studentNotifications.adminMuted(row.mutedTreatmentTypeIds.length)
                      }`
                    : studentNotifications.adminOff}
                  {/* Named rather than counted when muted, because "3 muted" is
                      not something an admin can act on and the names are. */}
                  {row.notifyNewCases && row.mutedTreatmentTypeIds.length > 0 ? (
                    <span style={{ color: 'var(--theme-elevation-600)' }}>
                      {' '}
                      ({row.mutedTreatmentTypeIds.map((id) => nameOf(treatments, id)).join('، ')})
                    </span>
                  ) : null}
                </dd>
              </dl>

              {/*
                * The student's own case record, for the admin.
                *
                * Haider asked for it to be visible here as well as to the
                * student. It carries no contact details and cannot — the
                * projection has no such column — which is the same discipline
                * `listRecentCasesForAdmin` follows: the overview cannot leak a
                * phone number however it is rendered, and one case an admin
                * typed the code for is the only place they appear.
                *
                * Collapsed, because most rows on this page are a person waiting
                * for a decision and their history is not what the admin came for.
                */}
              <details style={{ margin: '0 0 0.75rem' }}>
                <summary style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
                  {studentHistory.title} — {recordFor(row.id).total} · {studentHistory.treatedLabel}{' '}
                  {recordFor(row.id).treated}
                  {recordFor(row.id).active > 0 ? ` · شغّالة ${recordFor(row.id).active}` : ''}
                </summary>
                {recordFor(row.id).entries.length === 0 ? (
                  <p style={{ fontSize: '0.85rem', color: 'var(--theme-elevation-600)' }}>
                    {studentHistory.emptyTitle}
                  </p>
                ) : (
                  <table style={{ width: '100%', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    <thead>
                      <tr style={{ textAlign: 'start', color: 'var(--theme-elevation-600)' }}>
                        <th scope="col" style={{ textAlign: 'start' }}>
                          الرمز
                        </th>
                        <th scope="col" style={{ textAlign: 'start' }}>
                          {studentHistory.treatments}
                        </th>
                        <th scope="col" style={{ textAlign: 'start' }}>
                          الحالة
                        </th>
                        <th scope="col" style={{ textAlign: 'start' }}>
                          {studentHistory.claimedAt}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recordFor(row.id).entries.map((entry) => (
                        <tr key={entry.claimId}>
                          {/* A Latin reference code inside an RTL document needs
                              its own direction or the digits re-order. */}
                          <td dir="ltr" style={{ textAlign: 'start' }}>
                            {entry.referenceCode}
                          </td>
                          <td>
                            {entry.treatmentTypeIds.map((id) => nameOf(treatments, id)).join('، ')}
                          </td>
                          <td>
                            {studentHistory.outcome[
                              entry.claimStatus as keyof typeof studentHistory.outcome
                            ] ?? entry.claimStatus}
                          </td>
                          <td>{formatCaseDate(entry.claimedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </details>

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
                /* Not merely absent — say what is missing, to the person who can
                   chase it. A row with no document is the commonest reason a
                   student sits in the queue unreviewed. */
                <span style={{ fontSize: '0.9rem', color: 'var(--theme-elevation-600)' }}>
                  ما أكو وثيقة مرفوعة — الطالب لازم يرفعها من حسابه أو يدزها للبوت.
                </span>
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
                    border: '1px solid var(--theme-elevation-150)',
                    background: 'var(--theme-input-bg)',
                    color: 'inherit',
                  }}
                />
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {DECISIONS.map(([decision, label, colour]) => (
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
            </Panel>
          )
        })}
      </div>
    </AdminPage>
  )
}
