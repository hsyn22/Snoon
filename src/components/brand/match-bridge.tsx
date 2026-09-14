import { bridge } from '@/lib/copy'

/**
 * The picture that explains سنون without a sentence.
 *
 * Haider's idea, and the right one: a student on one side, a patient on the
 * other, and a line drawn between them carrying the name. Every other attempt at
 * a hero image here has been abstract — `MatchMotif` is two arcs meeting, which
 * is the same idea but only legible once you already know the idea. This is the
 * literal version, and it is the one a patient arriving cold can read.
 *
 * Rules it inherits from the rest of the project, none of them optional:
 *
 * - **No faces.** The heads are plain circles with nothing on them. سنون shows no
 *   faces anywhere — not in case listings, not in the Google profile it drops on
 *   sign-in, and not here. A figure with eyes would also make this a picture of
 *   two particular people rather than of two roles.
 * - **Inline SVG**, like `MatchMotif` and the icon set: about a kilobyte inside
 *   HTML that is already being downloaded, against a second request on a
 *   connection where a round trip costs 400ms.
 * - **Colour comes from tokens**, never from literals, so re-theming سنون by
 *   editing `tokens.css` re-themes this too.
 *
 * The two figures are deliberately *different* colours rather than a mirrored
 * pair: they are not the same person, and the whole product is about what each
 * one has that the other needs. The student is the accent, the patient is the
 * warm counterweight — the same pairing the rest of the identity uses.
 *
 * The line is drawn plain for now. It stands for the thing سنون actually does,
 * and what belongs on it — the finished logo, once there is one — is still open;
 * the badge in the middle holds its place with the wordmark in the meantime.
 *
 * Both figures sit on light surfaces only. The accent-coloured student would
 * disappear on the accent band, so if this is ever moved there it needs a
 * variant rather than a copy.
 *
 * Decorative as a picture, but it carries two words of its own — the labels are
 * real `<text>`, so a reader gets "طالب" and "مريض" rather than nothing. The
 * whole thing is given a title and described by the caption beside it.
 */
export function MatchBridge({ className }: { className?: string }) {
  return (
    <figure className={`match-bridge ${className ?? ''}`}>
      <svg viewBox="0 0 340 168" fill="none" role="img" aria-labelledby="bridge-title">
        <title id="bridge-title">{bridge.alt}</title>

        {/* The line runs behind both figures and behind the badge, so it reads
            as one continuous connection rather than as two stubs. Drawn first
            for that reason — SVG has no z-index, only document order. */}
        <path
          className="bridge-line"
          d="M84 96h172"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          opacity="0.6"
        />

        {/* The student. Right-hand side, because in Arabic that is where the eye
            starts, and the student is who the patient is being connected to. */}
        <g className="bridge-figure">
          <circle cx="292" cy="46" r="16" fill="var(--color-accent)" />
          {/* A lab coat: sloping shoulders and an open V neckline. It is the
              only thing distinguishing the two figures apart from colour, and
              it has to survive being 40px wide on a phone, so it is one notch
              and one stroke rather than a drawn garment. A breast pocket was
              tried and removed — at phone size it reads as a stray white dash
              rather than as a pocket. */}
          <path
            d="M264 124V96c0-13 10-22 22-24l6 14 6-14c12 2 22 11 22 24v28Z"
            fill="var(--color-accent)"
          />
          <path
            d="m286 72 6 14 6-14"
            stroke="var(--color-surface)"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
        </g>

        {/* The patient. Same silhouette, plain rounded collar, warm colour. */}
        <g className="bridge-figure bridge-figure-2">
          <circle cx="48" cy="46" r="16" fill="var(--color-warm)" />
          <path
            d="M20 124V96c0-13 10-22 22-24 2 5 10 5 12 0 12 2 22 11 22 24v28Z"
            fill="var(--color-warm)"
          />
        </g>

        {/* Where the name sits on the line. A filled plate rather than an
            outline, so the line reads as passing behind it rather than as
            broken by it. */}
        <g className="bridge-badge">
          <rect
            x="124"
            y="78"
            width="92"
            height="36"
            rx="18"
            fill="var(--color-surface)"
            stroke="var(--color-accent)"
            strokeWidth="2"
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

        {/* Who each figure is. Without these the picture is two blobs; with them
            it is the product in one glance. */}
        <text x="292" y="152" textAnchor="middle" fontSize="14" fill="var(--color-foreground-muted)">
          {bridge.student}
        </text>
        <text x="48" y="152" textAnchor="middle" fontSize="14" fill="var(--color-foreground-muted)">
          {bridge.patient}
        </text>
      </svg>

      <figcaption className="mt-2 text-center text-sm text-foreground-muted">
        {bridge.caption}
      </figcaption>
    </figure>
  )
}
