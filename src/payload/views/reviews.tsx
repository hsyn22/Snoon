import { headers as nextHeaders } from 'next/headers'
import { getPayload } from 'payload'
import config from '@payload-config'
import { listReviewsForAdmin, summariseReviews } from '@/db/queries/reviews'
import { reviewCopy } from '@/lib/copy'
import { formatCaseDate } from '@/lib/dates'
import { AdminPage, Empty } from './ui'

/**
 * Reviews of سنون, inside the Payload admin.
 *
 * **This view authorises itself**, like the other two. Payload's admin gates the
 * *interface*, but a custom view is still server-rendered — anything queried
 * here lands in the HTML whoever asked. `curl /admin/students` once returned
 * every student's name and document reference to anyone, and that is the
 * mistake this check exists to not repeat. Query nothing until the caller is
 * known to be an admin.
 *
 * Read-only, and it has to stay that way: an admin editing a review would be
 * editing what somebody said.
 *
 * **Nothing here identifies anybody.** The projection carries a reference code,
 * a side, a score and a comment — no name, no number, no student. The reference
 * code is the handle for looking a case up in `/admin/cases`, which is where
 * contact details live and where they are shown one case at a time.
 */

/* Payload's theme variables rather than literals, so this page follows the
   admin's light and dark themes — see `views/ui.tsx`. */
const BORDER = '1px solid var(--theme-elevation-150)'

/** Enough colour to scan by. Never the only signal: the number is beside it. */
function toneFor(rating: number): string {
  if (rating >= 4) return 'var(--theme-success-750)'
  if (rating === 3) return 'var(--theme-warning-750)'
  return 'var(--theme-error-750)'
}

function Summary({
  title,
  summary,
}: {
  title: string
  summary: { total: number; average: number | null; distribution: Record<number, number> }
}) {
  return (
    <section style={{ border: BORDER, borderRadius: '0.5rem', padding: '1rem' }}>
      <strong>{title}</strong>
      <p style={{ margin: '0.5rem 0 0', fontSize: '1.6rem', fontWeight: 700 }}>
        {/* A Latin decimal inside an RTL document needs its own direction. */}
        <span dir="ltr">{summary.average === null ? '—' : summary.average.toFixed(1)}</span>
      </p>
      <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.7 }}>
        {reviewCopy.adminCount}: <span dir="ltr">{summary.total}</span>
      </p>

      {/*
        * The distribution, not only the mean.
        *
        * Two fives and two ones average the same as four threes and mean
        * something entirely different — one says سنون works for half the people
        * using it, the other says it is mediocre for everybody. The first is
        * actionable and the average hides it.
        */}
      <ul style={{ listStyle: 'none', padding: 0, margin: '0.75rem 0 0', fontSize: '0.85rem' }}>
        {[5, 4, 3, 2, 1].map((score) => (
          <li key={score} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span dir="ltr" style={{ width: '1rem' }}>
              {score}
            </span>
            <span
              aria-hidden
              style={{
                height: '0.5rem',
                borderRadius: '999px',
                background: toneFor(score),
                // Relative to the largest bar rather than to the total, so a
                // small sample still shows its shape.
                width: `${
                  summary.total === 0
                    ? 0
                    : (summary.distribution[score]! /
                        Math.max(...Object.values(summary.distribution), 1)) *
                      70
                }%`,
                minWidth: summary.distribution[score] ? '0.5rem' : 0,
              }}
            />
            <span dir="ltr" style={{ opacity: 0.7 }}>
              {summary.distribution[score]}
            </span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default async function ReviewsView() {
  const payload = await getPayload({ config })

  const { user } = await payload.auth({ headers: await nextHeaders() })
  if (!user || user.collection !== 'admins') {
    // Payload's own login screen is what the visitor sees; this component simply
    // refuses to put anything in the response.
    return null
  }

  const [reviews, all, fromPatients, fromStudents] = await Promise.all([
    listReviewsForAdmin(),
    summariseReviews(),
    summariseReviews('PATIENT'),
    summariseReviews('STUDENT'),
  ])

  return (
    <AdminPage title={reviewCopy.adminTitle} lead={reviewCopy.adminIntro}>

      <div
        style={{
          display: 'grid',
          gap: '1rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))',
          marginBottom: '2rem',
        }}
      >
        <Summary title={reviewCopy.adminAverage} summary={all} />
        <Summary title={reviewCopy.adminFromPatient} summary={fromPatients} />
        <Summary title={reviewCopy.adminFromStudent} summary={fromStudents} />
      </div>

      {reviews.length === 0 ? <Empty reason={reviewCopy.adminEmpty} /> : null}

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {reviews.map((review) => (
          <section
            key={review.id}
            style={{ border: BORDER, borderRadius: '0.5rem', padding: '1rem' }}
          >
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: '1rem',
                flexWrap: 'wrap',
                fontSize: '0.9rem',
              }}
            >
              <span>
                <strong style={{ color: toneFor(review.rating) }}>
                  <span dir="ltr">{review.rating}</span>/5
                </strong>{' '}
                <span style={{ opacity: 0.7 }}>
                  —{' '}
                  {review.authorType === 'PATIENT'
                    ? reviewCopy.adminFromPatient
                    : reviewCopy.adminFromStudent}
                </span>
              </span>
              <span style={{ opacity: 0.7 }}>
                <span dir="ltr">{review.referenceCode}</span> · {formatCaseDate(review.createdAt)}
              </span>
            </div>

            <p style={{ margin: '0.5rem 0 0', fontSize: '0.95rem' }}>
              {review.comment ?? (
                <span style={{ opacity: 0.5 }}>{reviewCopy.adminNoComment}</span>
              )}
            </p>
          </section>
        ))}
      </div>
    </AdminPage>
  )
}
