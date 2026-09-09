import { casePhotos as copy } from '@/lib/copy'

/**
 * Intraoral photographs on a case.
 *
 * Every image is fetched from the authenticated route, which re-checks the
 * viewer per request — there is no URL here that works for someone not allowed
 * to see it. A patient carries their tracking token, since they have no session.
 */
export function CasePhotoGrid({
  photos,
  label,
  trackingToken,
}: {
  photos: readonly { id: string }[]
  label: string
  /** Supplied only on the patient's own tracking page. */
  trackingToken?: string
}) {
  if (photos.length === 0) return null

  return (
    <section className="mt-4">
      <h2 className="text-xs text-foreground-muted">{label}</h2>
      <div className="mt-2 grid grid-cols-2 gap-2">
        {photos.map((photo, index) => {
          const token = trackingToken ? `t=${encodeURIComponent(trackingToken)}` : ''
          const src = token ? `/api/case-photos/${photo.id}?${token}` : `/api/case-photos/${photo.id}`
          const query = token ? `&${token}` : ''
          // The grid slot is about 170px wide on a phone; the full image is
          // 1600px. Measured on Slow 3G, sending the full one put a case with
          // photographs 18 seconds behind every other page.
          const thumb = `/api/case-photos/${photo.id}?size=thumb${query}`

          return (
            <a
              key={photo.id}
              href={src}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-md border border-border"
            >
              {/* Plain img, not next/image: the optimiser would need to fetch
                  through the same authorised route and would cache the result
                  outside it. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumb}
                alt={`${copy.studentLabel} ${index + 1}`}
                loading="lazy"
                className="h-32 w-full object-cover"
              />
            </a>
          )
        })}
      </div>
    </section>
  )
}
