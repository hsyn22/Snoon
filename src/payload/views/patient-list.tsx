import Link from 'next/link'
import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { listCasesForAdmin, countCasesByStatus } from '@/db/queries/admin-cases'
import { getCities, getAllTreatmentTypes } from '@/lib/config'
import { caseStatus } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { AdminPage, Cell, Empty, FilterLinks, Panel, Stat, StatRow, Table, Tag, type Tone } from './ui'

/**
 * The مراجعين, as a browsable list.
 *
 * `/admin/cases` answers "what happened to SN-4KP7QW" — a code read out over the
 * phone. It could not answer "who has come in this week", so an admin wanting to
 * see the شغل had nothing but the twenty-five most recent rows at the bottom of
 * a lookup page. This is that list, filterable and paged.
 *
 * **It is a list of cases, and it is not a list of people.** What identifies a
 * مراجع in سنون is their phone number, and the whole point of the rule that
 * contact details never appear in a list is that an overview cannot leak one
 * however it is rendered. `listCasesForAdmin` has no contact columns in its
 * projection at all, so this page structurally cannot show a name or a number,
 * and the note under the heading says so — an admin who cannot see a name should
 * know that is a decision rather than missing data.
 *
 * **This view authorises itself.** Payload's admin gates the *interface*, but a
 * custom view is still server-rendered, so anything queried here lands in the
 * HTML of whoever asked. `curl /admin/students` returned every student's name
 * and document reference to anyone until the views started calling
 * `payload.auth()`. Query nothing until the caller is known.
 */

const PAGE_SIZE = 50

const STATUS_TONE: Record<string, Tone> = {
  REQUESTED: 'info',
  MATCHED: 'info',
  CONTACTED: 'info',
  APPOINTMENT_CONFIRMED: 'success',
  COMPLETED: 'success',
  NO_CONTACT: 'warning',
  RETURNED_TO_QUEUE: 'warning',
  NO_SHOW: 'warning',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
}

function readParam(
  params: { [key: string]: string | string[] | undefined } | undefined,
  key: string,
): string {
  const raw = params?.[key]
  return (Array.isArray(raw) ? raw[0] : raw) ?? ''
}

export default async function PatientListView({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined }
}) {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'admins') return null

  /*
   * The filter is validated against the real set of statuses rather than passed
   * through. An unrecognised value falls back to "everything", never to an empty
   * page: a blank list reads as "there are no cases", which is the expensive
   * kind of wrong in this codebase.
   */
  const requested = readParam(searchParams, 'status')
  const status = requested in caseStatus ? requested : ''
  const page = Math.max(1, Number.parseInt(readParam(searchParams, 'page'), 10) || 1)

  const [{ items, total }, counts, cities, treatments] = await Promise.all([
    listCasesForAdmin({
      status: status || undefined,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    }),
    countCasesByStatus(),
    getCities(),
    getAllTreatmentTypes(),
  ])

  const nameOf = (list: readonly { id: string; nameAr: string }[], id: string) =>
    list.find((entry) => entry.id === id)?.nameAr ?? id

  const everything = Object.values(counts).reduce((sum, n) => sum + n, 0)
  const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hrefFor = (value: string) => (value ? `/admin/patients?status=${value}` : '/admin/patients')

  return (
    <AdminPage
      wide
      title="المراجعين"
      lead="كل الحالات المقدّمة، من الأحدث. الأسماء وأرقام الموبايل ما تظهر بأي قائمة — افتح الحالة من رمزها إذا تحتاج تتواصل."
    >
      <StatRow>
        <Stat label="كل الحالات" value={everything} />
        <Stat label={caseStatus.REQUESTED} value={counts.REQUESTED ?? 0} tone="info" />
        <Stat label={caseStatus.MATCHED} value={counts.MATCHED ?? 0} tone="info" />
        <Stat label={caseStatus.COMPLETED} value={counts.COMPLETED ?? 0} tone="success" />
      </StatRow>

      <Panel title="حسب الحالة">
        <FilterLinks
          current={status}
          hrefFor={hrefFor}
          options={[
            { value: '', label: 'الكل', count: everything },
            ...Object.entries(caseStatus).map(([key, label]) => ({
              value: key,
              label,
              count: counts[key] ?? 0,
            })),
          ]}
        />
      </Panel>

      <Panel>
        {items.length === 0 ? (
          /* Which list is empty, by name. An admin who filtered to CANCELLED and
             sees nothing must be able to tell that from a database with no cases
             in it at all — reading the second as the first is how somebody
             concludes the admin is broken. */
          <Empty
            reason={
              everything === 0
                ? 'ما وصلت أي حالة لحد الآن.'
                : status
                  ? `ما أكو حالة بحالة «${caseStatus[status as keyof typeof caseStatus]}». جرّب «الكل».`
                  : 'ما أكو حالات بهاي الصفحة.'
            }
          />
        ) : (
          <>
            <Table headers={['الرمز', 'الحالة', 'المدينة', 'العلاج المطلوب', 'تاريخ التقديم']}>
              {items.map((row) => (
                <tr key={row.id}>
                  <Cell ltr>
                    {/* The code is the way through to the one screen that may
                        show contact details, and the only way. */}
                    <Link
                      href={`/admin/cases?ref=${encodeURIComponent(row.referenceCode)}`}
                      style={{ fontFamily: 'monospace', fontWeight: 700 }}
                    >
                      {row.referenceCode}
                    </Link>
                  </Cell>
                  <Cell>
                    <Tag
                      label={caseStatus[row.status as keyof typeof caseStatus] ?? row.status}
                      tone={STATUS_TONE[row.status] ?? 'neutral'}
                    />
                  </Cell>
                  <Cell>{nameOf(cities, row.cityId)}</Cell>
                  <Cell>
                    {row.treatmentTypeIds.map((id) => nameOf(treatments, id)).join('، ') || '—'}
                  </Cell>
                  <Cell ltr>{formatCaseDate(row.createdAt)}</Cell>
                </tr>
              ))}
            </Table>

            {/* Paging as two links. Nothing to script, and the page number lives
                in the query string so a reload keeps it. */}
            {lastPage > 1 ? (
              <nav
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  marginTop: '1rem',
                  fontSize: '0.9rem',
                }}
              >
                {page > 1 ? (
                  <Link href={`${hrefFor(status)}${status ? '&' : '?'}page=${page - 1}`}>
                    الأحدث
                  </Link>
                ) : (
                  <span />
                )}
                <span dir="ltr" style={{ color: 'var(--theme-elevation-600)' }}>
                  {page} / {lastPage}
                </span>
                {page < lastPage ? (
                  <Link href={`${hrefFor(status)}${status ? '&' : '?'}page=${page + 1}`}>
                    الأقدم
                  </Link>
                ) : (
                  <span />
                )}
              </nav>
            ) : null}
          </>
        )}
      </Panel>
    </AdminPage>
  )
}
