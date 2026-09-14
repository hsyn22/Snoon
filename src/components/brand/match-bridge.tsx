import { bridge } from '@/lib/copy'

/**
 * The picture that explains منصة سنون without a sentence.
 *
 * Haider's idea, and the right one: a student on one side, someone who needs
 * treatment on the other, and a line joining them carrying the name. Every
 * other attempt at a hero image here has been abstract — `MatchMotif` is two
 * arcs meeting, which is the same idea but only legible once you already know
 * the idea. This is the literal version, and it is the one a visitor arriving
 * cold can read.
 *
 * Rules it inherits from the rest of the project, none of them optional:
 *
 * - **No faces.** The heads carry light and shade and nothing else. سنون shows
 *   no faces anywhere — not in case listings, not in the Google profile it
 *   drops on sign-in, and not here. A figure with eyes would also make this a
 *   picture of two particular people rather than of two roles.
 * - **Inline SVG**, like `MatchMotif` and the icon set: about a kilobyte and a
 *   half inside HTML that is already being downloaded, against a second request
 *   on a connection where a round trip costs 400ms.
 * - **Colour comes from tokens**, never from literals, so re-theming سنون by
 *   editing `tokens.css` re-themes this too — including the shading, which is
 *   `--color-warm-deep` and `--color-accent-strong` rather than grey laid over
 *   the top. Grey shading is what makes a flat illustration look dirty rather
 *   than round.
 *
 * The two figures are deliberately *different* colours rather than a mirrored
 * pair: they are not the same person, and the whole product is about what each
 * one has that the other needs.
 *
 * **The depth is the second pass.** They were flat discs, and Haider's note was
 * exact — they read as circles rather than as balls. Each head and body now
 * carries one radial gradient with the light high and towards the start edge,
 * and the bodies have rounded bottom corners rather than a cut-off rectangle.
 * Two gradients per figure, no filters and no shadows: `filter` is not a free
 * compositor property and this sits in the hero of a page built for a cheap
 * Android.
 *
 * **The link is the third pass.** A flat hairline between two solid figures
 * read as a wire rather than as a connection. It is now a thick stroke running
 * a gradient from the one colour to the other — so the connection is literally
 * made of both of them — with a node where it meets each figure, and a soft
 * ring behind the name.
 *
 * Both figures sit on light surfaces only. The accent-coloured student would
 * disappear on the accent band, so if this is ever moved there it needs a
 * variant rather than a copy.
 */
export function MatchBridge({ className }: { className?: string }) {
  return (
    <figure className={`match-bridge ${className ?? ''}`}>
      <svg viewBox="0 0 340 172" fill="none" role="img" aria-labelledby="bridge-title">
        <title id="bridge-title">{bridge.alt}</title>

        <defs>
          {/* One light source for the whole picture: high, and towards the
              start edge, which in an RTL layout is the right. Every gradient
              below puts its highlight at the same corner, which is most of what
              makes separate shapes read as one scene rather than as stickers. */}
          <radialGradient id="bridge-head-student" cx="0.68" cy="0.28" r="0.85">
            <stop offset="0" stopColor="var(--color-accent-light)" />
            <stop offset="1" stopColor="var(--color-accent-strong)" />
          </radialGradient>
          <radialGradient id="bridge-body-student" cx="0.68" cy="0.12" r="1">
            <stop offset="0" stopColor="var(--color-accent-light)" />
            <stop offset="1" stopColor="var(--color-accent-strong)" />
          </radialGradient>
          <radialGradient id="bridge-head-visitor" cx="0.68" cy="0.28" r="0.85">
            <stop offset="0" stopColor="var(--color-warm)" />
            <stop offset="1" stopColor="var(--color-warm-deep)" />
          </radialGradient>
          <radialGradient id="bridge-body-visitor" cx="0.68" cy="0.12" r="1">
            <stop offset="0" stopColor="var(--color-warm)" />
            <stop offset="1" stopColor="var(--color-warm-deep)" />
          </radialGradient>

          {/* userSpaceOnUse, not the default: a perfectly horizontal path has a
              zero-height bounding box, and an objectBoundingBox gradient on a
              degenerate box does not render at all. */}
          <linearGradient
            id="bridge-link"
            gradientUnits="userSpaceOnUse"
            x1="84"
            y1="0"
            x2="256"
            y2="0"
          >
            <stop offset="0" stopColor="var(--color-warm)" />
            <stop offset="1" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>

        {/* The link, drawn first so both figures and the badge sit on top of it
            and it reads as one continuous thing passing behind them. SVG has no
            z-index, only document order. */}
        <path
          className="bridge-line"
          d="M84 96h172"
          stroke="url(#bridge-link)"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Where the link meets each figure. Without these the stroke stops in
            mid-air beside a shoulder; with them it is anchored at both ends. */}
        <circle cx="84" cy="96" r="6.5" fill="var(--color-warm)" />
        <circle cx="256" cy="96" r="6.5" fill="var(--color-accent-light)" />

        {/* The student. Start edge — in Arabic the eye begins on the right. */}
        <g className="bridge-figure">
          <circle cx="292" cy="46" r="17" fill="url(#bridge-head-student)" />
          {/* A lab coat: sloping shoulders, an open V neckline, and rounded
              bottom corners so the bust ends rather than being cut off. The
              collar is the only thing distinguishing the two figures apart from
              colour, and it has to survive being 40px wide on a phone — so it
              is one notch and one stroke, not a drawn garment. A breast pocket
              was tried and removed: at that size it read as a stray dash. */}
          <path
            d="M264 114V96c0-13 10-22 22-24l6 14 6-14c12 2 22 11 22 24v18a10 10 0 0 1-10 10h-36a10 10 0 0 1-10-10Z"
            fill="url(#bridge-body-student)"
          />
          <path
            d="m286 72 6 14 6-14"
            stroke="var(--color-surface)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>

        {/* Whoever needs the treatment. Same silhouette, rounded collar. */}
        <g className="bridge-figure bridge-figure-2">
          <circle cx="48" cy="46" r="17" fill="url(#bridge-head-visitor)" />
          <path
            d="M20 114V96c0-13 10-22 22-24 2 5 10 5 12 0 12 2 22 11 22 24v18a10 10 0 0 1-10 10H30a10 10 0 0 1-10-10Z"
            fill="url(#bridge-body-visitor)"
          />
        </g>

        {/* Where the name sits on the link. The soft ring behind it is a second
            rounded rect at low opacity rather than a `filter: drop-shadow` —
            the same read, and nothing expensive to composite. */}
        <g className="bridge-badge">
          <rect
            x="118"
            y="73"
            width="104"
            height="46"
            rx="23"
            fill="var(--color-accent)"
            opacity="0.1"
          />
          <rect
            x="123"
            y="78"
            width="94"
            height="36"
            rx="18"
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth="1.75"
          />
          <text
            x="170"
            y="97"
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="19"
            fontWeight="700"
            fill="var(--color-accent-strong)"
          >
            {bridge.name}
          </text>
        </g>

        {/* Who each figure is. Without these the picture is two shapes; with
            them it is the product in one glance. */}
        <text x="292" y="156" textAnchor="middle" fontSize="14" fill="var(--color-foreground-muted)">
          {bridge.student}
        </text>
        <text x="48" y="156" textAnchor="middle" fontSize="14" fill="var(--color-foreground-muted)">
          {bridge.patient}
        </text>
      </svg>

      <figcaption className="mt-2 text-center text-sm text-foreground-muted">
        {bridge.caption}
      </figcaption>
    </figure>
  )
}
