import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import {
  countCasesByStatus,
  findCaseForAdmin,
  listRecentCasesForAdmin,
  type AdminCaseView,
} from '@/db/queries/admin-cases'
import {
  getAllCities,
  getAllTreatmentTypes,
  getColleges,
  getStages,
  getUniversities,
} from '@/lib/config'
import { describeReason } from '@/lib/cases/reasons'
import { caseForm, caseStatus } from '@/lib/copy'
import { formatAppointment, formatCaseDate, formatCaseDateTime } from '@/lib/dates'
import { normaliseReferenceCode } from '@/lib/reference-code'

/**
 * Case lookup, inside the Payload admin.
 *
 * A patient rings and reads out `SN-4KP7QW`. Without this there was no way to
 * answer them: not the status, not who claimed it, not what happened when.
 *
 * Cases live in the `snoon` Drizzle schema and stay there — this view reads
 * across, exactly as the student review does, and writes nothing. Case state
 * changes belong to the lifecycle functions with their allowed-transitions map
 * and their audit rows, never to a form in the CMS.
 *
 * It authorises itself before querying anything. A custom admin view is
 * server-rendered, so whatever it reads lands in the HTML regardless of who
 * asked — and this one reads patient phone numbers. `payload.auth()` first,
 * always. See CLAUDE.md.
 */

const CLAIM_STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'فعّالة',
  COMPLETED: 'مكتملة',
  RELEASED: 'انفكّت',
  EXPIRED: 'انتهت مدتها',
}

const ACTOR_LABEL: Record<string, string> = {
  PATIENT: 'المريض',
  STUDENT: 'الطالب',
  ADMIN: 'الإدارة',
  SYSTEM: 'النظام',
}

const STATUS_COLOUR: Record<string, string> = {
  REQUESTED: '#8a6d00',
  MATCHED: '#1d4ed8',
  CONTACTED: '#1d4ed8',
  APPOINTMENT_CONFIRMED: '#116149',
  COMPLETED: '#116149',
  NO_CONTACT: '#9b1c1c',
  RETURNED_TO_QUEUE: '#8a6d00',
  NO_SHOW: '#9b1c1c',
  CANCELLED: '#6b7280',
  EXPIRED: '#6b7280',
}

const BORDER = '1px solid rgba(128,128,128,0.35)'

const statusLabel = (status: string) =>
  caseStatus[status as keyof typeof caseStatus] ?? status

/** Western digits inside Arabic text need an explicit run, or they re-order. */
function Ltr({ children }: { children: React.ReactNode }) {
  return (
    <span style={{ direction: 'ltr', unicodeBidi: 'isolate', display: 'inline-block' }}>
      {children}
    </span>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt style={{ opacity: 0.7 }}>{label}</dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </>
  )
}

/**
 * An event's reason, in Arabic where it is one of ours.
 *
 * A note the student typed is theirs and is shown verbatim — but it may be in
 * either script, so it gets its own isolated run rather than being spliced into
 * the RTL sentence, where a trailing full stop would jump to the wrong end.
 */
function EventReason({ reason }: { reason: string }) {
  const { text, note } = describeReason(reason)
  // dir="auto" takes the direction from the first strong character and isolates
  // the run. A reason we have no Arabic for is English, and spliced into an RTL
  // line its full stop jumps to the wrong end; the same is true of a note typed
  // in either script.
  return (
    <div style={{ opacity: 0.7 }}>
      <span dir="auto">{text}</span>
      {note ? (
        <>
          {' — '}
          <span dir="auto">{note}</span>
        </>
      ) : null}
    </div>
  )
}

export default async function CaseLookupView({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'admins') {
    // Nothing is queried and nothing is rendered until the caller is known to be
    // an admin. Payload's own login screen is what the visitor gets.
    return null
  }

  const rawQuery = searchParams?.ref
  const query = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery)?.trim() ?? ''
  const normalised = query ? normaliseReferenceCode(query) : null

  const [cities, treatments, universities, colleges, stages] = await Promise.all([
    getAllCities(),
    getAllTreatmentTypes(),
    getUniversities(),
    getColleges(),
    getStages(),
  ])

  const nameOf = (list: readonly { id: string; nameAr: string }[], id: string) =>
    list.find((entry) => entry.id === id)?.nameAr ?? id

  // Only one case's contact details are ever loaded, and only for a code the
  // admin typed. The overview list below cannot contain them.
  const record: AdminCaseView | null = normalised ? await findCaseForAdmin(normalised) : null
  const [recent, counts] = record
    ? [[], {} as Record<string, number>]
    : await Promise.all([listRecentCasesForAdmin(25), countCasesByStatus()])

  return (
    <div style={{ padding: '2rem', maxWidth: '60rem', margin: '0 auto' }} dir="rtl">
      <h1 style={{ marginBottom: '0.5rem' }}>الحالات</h1>
      <p style={{ opacity: 0.7, marginBottom: '1.5rem' }}>
        دوّر على حالة برمزها — مثلاً اللي يكَرّاه المريض بالتلفون — وشوف وين وصلت ومنو آخذها.
      </p>

      <form method="get" style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem' }}>
        <input
          type="text"
          name="ref"
          defaultValue={query}
          placeholder="رمز الحالة، مثل SN-4KP7QW"
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '0.35rem',
            border: BORDER,
            background: 'transparent',
            color: 'inherit',
          }}
        />
        <button
          type="submit"
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '0.35rem',
            border: 'none',
            background: '#1d4ed8',
            color: 'white',
            cursor: 'pointer',
          }}
        >
          دوّر
        </button>
      </form>

      {query && !normalised ? (
        <p style={{ color: '#9b1c1c' }}>
          هذا مو رمز حالة. الرمز يتكوّن من SN- وستة حروف أو أرقام.
        </p>
      ) : null}

      {normalised && !record ? (
        <p style={{ color: '#9b1c1c' }}>
          ما لكينا حالة بالرمز <Ltr>{normalised}</Ltr>.
        </p>
      ) : null}

      {record ? (
        <CaseDetail
          record={record}
          nameOf={nameOf}
          cities={cities}
          treatments={treatments}
          universities={universities}
          colleges={colleges}
          stages={stages}
        />
      ) : (
        <>
          <section style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>الوضع العام</h2>
            {Object.keys(counts).length === 0 ? (
              <p style={{ opacity: 0.7 }}>ما أكو حالات مسجّلة لحد الآن.</p>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {Object.entries(counts).map(([status, total]) => (
                  <span
                    key={status}
                    style={{
                      border: BORDER,
                      borderRadius: '999px',
                      padding: '0.25rem 0.75rem',
                      fontSize: '0.85rem',
                    }}
                  >
                    {statusLabel(status)} <Ltr>{total}</Ltr>
                  </span>
                ))}
              </div>
            )}
          </section>

          {recent.length > 0 ? (
            <section>
              <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>آخر الحالات</h2>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {recent.map((row) => (
                  <a
                    key={row.id}
                    href={`?ref=${encodeURIComponent(row.referenceCode)}`}
                    style={{
                      border: BORDER,
                      borderRadius: '0.5rem',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: '1rem',
                      flexWrap: 'wrap',
                      color: 'inherit',
                      textDecoration: 'none',
                    }}
                  >
                    <strong>
                      <Ltr>{row.referenceCode}</Ltr>
                    </strong>
                    <span>{nameOf(cities, row.cityId)}</span>
                    <span style={{ opacity: 0.7 }}>{formatCaseDate(row.createdAt)}</span>
                    <span style={{ color: STATUS_COLOUR[row.status], fontWeight: 600 }}>
                      {statusLabel(row.status)}
                    </span>
                  </a>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  )
}

function CaseDetail({
  record,
  nameOf,
  cities,
  treatments,
  universities,
  colleges,
  stages,
}: {
  record: AdminCaseView
  nameOf: (list: readonly { id: string; nameAr: string }[], id: string) => string
  cities: readonly { id: string; nameAr: string }[]
  treatments: readonly { id: string; nameAr: string }[]
  universities: readonly { id: string; nameAr: string }[]
  colleges: readonly { id: string; nameAr: string }[]
  stages: readonly { id: string; nameAr: string }[]
}) {
  const liveAppointment = record.appointments.find((row) => row.supersededAt === null)
  const livePhotos = record.photos.filter((photo) => photo.deletedAt === null)
  const deletedPhotos = record.photos.length - livePhotos.length

  return (
    <div style={{ display: 'grid', gap: '1.5rem' }}>
      <section style={{ border: BORDER, borderRadius: '0.5rem', padding: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            marginBottom: '0.75rem',
          }}
        >
          <strong style={{ fontSize: '1.1rem' }}>
            <Ltr>{record.referenceCode}</Ltr>
          </strong>
          <span style={{ color: STATUS_COLOUR[record.status], fontWeight: 600 }}>
            {statusLabel(record.status)}
          </span>
        </div>

        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.25rem 1rem',
            margin: 0,
            fontSize: '0.9rem',
          }}
        >
          <Field label="المدينة">{nameOf(cities, record.cityId)}</Field>
          <Field label="العلاج المطلوب">
            {record.treatmentTypeIds.map((id) => nameOf(treatments, id)).join('، ')}
          </Field>
          <Field label="الأيام المتاحة">
            {record.availabilityDays
              .map((day) => caseForm.weekDays[day as keyof typeof caseForm.weekDays] ?? day)
              .join('، ')}
          </Field>
          <Field label="تاريخ التقديم">{formatCaseDateTime(record.createdAt)}</Field>
          {record.notes ? <Field label="ملاحظات المريض">{record.notes}</Field> : null}
          <Field label="إشعارات تلگرام">{record.telegramLinked ? 'مفعّلة' : 'مو مفعّلة'}</Field>
          {record.trackingTokenRevokedAt ? (
            <Field label="رابط المتابعة">
              ملغي من {formatCaseDate(record.trackingTokenRevokedAt)}
            </Field>
          ) : null}
        </dl>
      </section>

      <section
        style={{
          border: '1px solid rgba(155,28,28,0.4)',
          borderRadius: '0.5rem',
          padding: '1rem',
        }}
      >
        <h2 style={{ fontSize: '1rem', margin: '0 0 0.25rem' }}>معلومات التواصل</h2>
        <p style={{ opacity: 0.7, fontSize: '0.85rem', margin: '0 0 0.75rem' }}>
          هاي أكثر معلومة حساسة بالنظام. ما تنشرها ولا تنسخها بمكان ثاني.
        </p>
        <dl
          style={{
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: '0.25rem 1rem',
            margin: 0,
            fontSize: '0.9rem',
          }}
        >
          <Field label="الاسم">{record.patientName}</Field>
          <Field label="الهاتف">
            <Ltr>{record.patientPhone}</Ltr>
          </Field>
        </dl>
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>الحجوزات</h2>
        {record.claims.length === 0 ? (
          <p style={{ opacity: 0.7 }}>ما حجزها ولا طالب لحد الآن.</p>
        ) : (
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            {record.claims.map((claim) => (
              <div
                key={claim.id}
                style={{ border: BORDER, borderRadius: '0.5rem', padding: '0.75rem 1rem' }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <strong>{claim.studentName}</strong>
                  <span style={{ fontWeight: 600 }}>
                    {CLAIM_STATUS_LABEL[claim.status] ?? claim.status}
                  </span>
                </div>
                <dl
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: '0.25rem 1rem',
                    margin: '0.5rem 0 0',
                    fontSize: '0.85rem',
                  }}
                >
                  <Field label="الجامعة">
                    {nameOf(universities, claim.studentUniversityId)} —{' '}
                    {nameOf(colleges, claim.studentCollegeId)}
                  </Field>
                  <Field label="المرحلة">{nameOf(stages, claim.studentStageId)}</Field>
                  <Field label="وقت الحجز">{formatCaseDateTime(claim.createdAt)}</Field>
                  <Field label="مهلة التواصل">{formatCaseDateTime(claim.contactDeadlineAt)}</Field>
                  <Field label="الطالب گال إنه اتصل">
                    {claim.contactAssertedAt ? formatCaseDateTime(claim.contactAssertedAt) : 'لا'}
                  </Field>
                  {claim.releasedAt ? (
                    <Field label="انتهت">
                      {formatCaseDateTime(claim.releasedAt)}
                      {claim.releaseReason ? ` — ${describeReason(claim.releaseReason).text}` : ''}
                    </Field>
                  ) : null}
                </dl>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>الموعد</h2>
        {record.appointments.length === 0 ? (
          <p style={{ opacity: 0.7 }}>ما انثبّت موعد.</p>
        ) : (
          <ul style={{ margin: 0, paddingInlineStart: '1.25rem', fontSize: '0.9rem' }}>
            {record.appointments.map((appointment) => (
              <li key={appointment.id} style={{ opacity: appointment.supersededAt ? 0.55 : 1 }}>
                {formatAppointment(appointment.scheduledFor)}
                {appointment.supersededAt ? ' — انتغيّر بعدين' : ''}
                {!appointment.supersededAt && appointment.id === liveAppointment?.id
                  ? ' — الموعد الحالي'
                  : ''}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>الصور</h2>
        {livePhotos.length === 0 ? (
          <p style={{ opacity: 0.7 }}>
            {deletedPhotos > 0
              ? 'الصور انحذفت بعد ما خلصت الحالة.'
              : 'ما أكو صور مرفوعة مع هذي الحالة.'}
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {livePhotos.map((photo) => (
              <a key={photo.id} href={`/api/case-photos/${photo.id}`} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/case-photos/${photo.id}`}
                  alt="صورة داخل الفم"
                  style={{
                    width: '9rem',
                    height: '9rem',
                    objectFit: 'cover',
                    borderRadius: '0.5rem',
                    border: BORDER,
                  }}
                />
              </a>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem' }}>سجل الحالة</h2>
        <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: '0.5rem' }}>
          {record.events.map((event) => (
            <li
              key={event.id}
              style={{
                borderInlineStart: '2px solid rgba(128,128,128,0.35)',
                paddingInlineStart: '0.75rem',
                fontSize: '0.85rem',
              }}
            >
              <div>
                {event.fromStatus ? `${statusLabel(event.fromStatus)} ← ` : ''}
                <strong>{statusLabel(event.toStatus)}</strong>
              </div>
              <div style={{ opacity: 0.7 }}>
                {formatCaseDateTime(event.createdAt)} —{' '}
                {ACTOR_LABEL[event.actorType] ?? event.actorType}
              </div>
              {event.reason ? <EventReason reason={event.reason} /> : null}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
