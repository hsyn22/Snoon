/**
 * The hero's one picture: two arcs meeting.
 *
 * سنون has no photography and should not have any — a stock image of a
 * stranger's mouth would be worse than nothing. But the hero had nothing to look
 * at either, which is most of why the page read as a form. This is the product's
 * own idea drawn as a shape: two people who each need something the other has,
 * arriving at the same point.
 *
 * Inline SVG, a few hundred bytes, taking its colour from the surrounding text
 * so it needs no variant per surface and nothing to load. The arcs draw
 * themselves once on load at the full tier — `stroke-dashoffset` is one of the
 * few non-transform properties browsers animate cheaply, and it runs on a timer
 * rather than on scroll, so it always finishes.
 *
 * Decorative: the headline beside it carries the meaning, so it is aria-hidden.
 */
export function MatchMotif({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 220 116"
      fill="none"
      aria-hidden="true"
      className={`match-motif ${className ?? ''}`}
    >
      {/* Where each side starts. Marking the feet is what makes the shape read
          as two journeys rather than as one arch — without them the arcs merge
          into a single line and the idea is lost. */}
      <circle cx="14" cy="100" r="4.5" fill="currentColor" opacity="0.32" />
      <circle cx="206" cy="100" r="4.5" fill="currentColor" opacity="0.32" />

      {/* The patient's path, and the student's. */}
      <path
        className="motif-arc"
        d="M14 100C14 52 48 24 96 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />
      <path
        className="motif-arc motif-arc-2"
        d="M206 100C206 52 172 24 124 24"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* Where they arrive. Filled rather than stroked, so it reads as an
          arrival rather than as more line. */}
      <circle className="motif-node" cx="96" cy="24" r="8" fill="currentColor" />
      <circle
        className="motif-node motif-node-2"
        cx="124"
        cy="24"
        r="8"
        fill="currentColor"
        opacity="0.55"
      />
      <path
        className="motif-join"
        d="M104 24h12"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}
