/**
 * The سنون mark.
 *
 * Drawn as inline SVG rather than shipped as an image file: it is a few hundred
 * bytes, it needs no second request on a slow connection, and it takes its
 * colour from whatever it sits on — the header, the footer band, a dark
 * surface — without a second asset.
 *
 * The glyph is a tooth whose crown opens into a link: two shapes joined, which
 * is what the product does. It is deliberately simple. A real identity may
 * replace it, and when it does only this file changes.
 *
 * The name is written سنون — no shadda, ever. See CLAUDE.md.
 */
export function Wordmark({
  showName = true,
  className,
}: {
  showName?: boolean
  className?: string
}) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ''}`}>
      <svg
        viewBox="0 0 32 32"
        width="28"
        height="28"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {/* Tooth: two crowns meeting, roots tapering. */}
        <path
          d="M8.4 4.2c2 0 2.6 1.1 4.3 1.1s2.4-1.1 4.4-1.1c3.4 0 5.5 2.5 5.5 6.2 0 2.6-.8 4.4-1.5 6.6-.6 1.9-.8 3.6-1 5.6-.2 2-.5 3.6-1.9 3.6-1.5 0-1.8-1.8-2.1-4-.3-2-.6-3.6-1.7-3.6s-1.4 1.6-1.7 3.6c-.3 2.2-.6 4-2.1 4-1.4 0-1.7-1.6-1.9-3.6-.2-2-.4-3.7-1-5.6C6 14.8 5.2 13 5.2 10.4c0-3.7 2-6.2 3.2-6.2Z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
          transform="translate(3 0)"
        />
        {/* The link: a small joined pair inside the crown. */}
        <circle cx="14" cy="11" r="1.9" fill="currentColor" />
        <circle cx="19.4" cy="11" r="1.9" fill="currentColor" opacity="0.55" />
      </svg>

      {showName ? (
        <span className="text-xl font-bold tracking-tight leading-none">سنون</span>
      ) : null}
    </span>
  )
}
