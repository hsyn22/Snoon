/**
 * A small scene per step, instead of an icon in a tile.
 *
 * Taken from ClinMatch, which is the one thing in Haider's two videos that is
 * genuinely better than what سنون had. Their step cards do not carry an icon;
 * they carry a little picture of the step *happening* — a profile card whose
 * lines fill in and gain a tick, a listing being searched, two people meeting,
 * a calendar confirming. An icon labels a step. A scene demonstrates it, and on
 * a page explaining an unfamiliar process to somebody who has never used one,
 * that difference is most of the value.
 *
 * ## The rule that shapes all four, and the one worth not undoing
 *
 * **Every scene is drawn COMPLETE in the markup. Animation only ever adds
 * motion on top of a finished picture.** No line starts empty, no tick starts
 * undrawn, nothing starts at `opacity: 0`.
 *
 * This is deliberate and it is not how ClinMatch do it. Theirs draw themselves
 * from nothing, which is prettier and which this codebase cannot safely copy:
 * a reveal that plays from empty has to be *triggered*, and the only triggers
 * CSS offers are a clock (which fires while the card is still far below the
 * fold, so it is over before anyone looks) or a scroll timeline (which freezes
 * wherever the reader stopped — the bug that once left a third of this page
 * blurred, and which here would leave a half-drawn tick reading as a failure).
 * Starting complete removes the whole class of problem: there is no state in
 * which one of these is part-drawn, at any tier, on any browser, at any scroll
 * position.
 *
 * So what moves is a sweep, a pulse, a small lift — things that are *additions*
 * to a legible picture rather than the picture assembling itself.
 *
 * Everything else follows the house rules: inline SVG, colour from tokens and
 * never a literal, transform and opacity (plus `stroke-dashoffset`, already
 * allowed for the bridge, since no transform draws a line), and no faces.
 */

/** Shared frame, so all four sit on the same grid and optical weight. */
function Scene({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 96 72"
      fill="none"
      aria-hidden="true"
      className={`step-scene ${className ?? ''}`}
    >
      {children}
    </svg>
  )
}

/** 1 — the case being submitted: a form whose fields are filled and accepted. */
export function SceneSubmit() {
  return (
    <Scene className="scene-submit">
      <rect x="18" y="8" width="52" height="56" rx="7" fill="var(--color-accent-muted)" />
      <rect className="scene-line scene-line-1" x="26" y="19" width="30" height="4" rx="2" fill="var(--color-accent)" />
      <rect className="scene-line scene-line-2" x="26" y="29" width="22" height="4" rx="2" fill="var(--color-accent)" opacity="0.55" />
      <rect className="scene-line scene-line-3" x="26" y="39" width="27" height="4" rx="2" fill="var(--color-accent)" opacity="0.55" />
      {/* The submit button, and the tick that lands on it. */}
      <rect x="26" y="50" width="26" height="7" rx="3.5" fill="var(--color-accent)" />
      <g className="scene-stamp">
        <circle cx="70" cy="54" r="10" fill="var(--color-positive)" />
        <path d="M65 54.5 68.5 58 75 50.5" stroke="var(--color-surface)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </Scene>
  )
}

/**
 * 2 — the verified student reading the queue: three cases, one being taken.
 *
 * **Rebuilt after looking at it at its real size.** The first attempt drew the
 * rows as white cards on a pale ground with a translucent band sweeping across
 * them, which was legible in the editor and mud at 96 pixels: the rows did not
 * separate and the band read as a smear. Contrast between neighbouring shapes
 * is the whole job at this size, so the rows are now solid bars with real gaps,
 * and the one being taken is the only coloured thing in the picture.
 */
export function SceneQueue() {
  return (
    <Scene className="scene-queue">
      <rect x="10" y="8" width="76" height="56" rx="7" fill="var(--color-surface)" stroke="var(--color-accent-muted)" strokeWidth="2" />
      <rect x="18" y="16" width="60" height="11" rx="3" fill="var(--color-accent-muted)" />
      {/* The case being taken. The only colour here, so it is unmistakably the
          subject even before anything moves. */}
      <g className="scene-row">
        <rect x="18" y="30.5" width="60" height="11" rx="3" fill="var(--color-accent)" />
        <circle cx="71" cy="36" r="3.2" fill="var(--color-surface)" />
      </g>
      <rect x="18" y="45" width="60" height="11" rx="3" fill="var(--color-accent-muted)" />
    </Scene>
  )
}

/** 3 — contact made: two figures and the line between them, the bridge again. */
export function SceneContact() {
  return (
    <Scene className="scene-contact">
      <circle cx="24" cy="36" r="13" fill="var(--color-warm)" />
      <circle cx="72" cy="36" r="13" fill="var(--color-accent)" />
      {/* Drawn complete. The dash animation slides the pattern along it rather
          than drawing it from nothing, so it never reads as a broken link. */}
      <path
        className="scene-link"
        d="M38 36h20"
        stroke="var(--color-accent-strong)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="3 5"
      />
      <circle className="scene-ping" cx="48" cy="36" r="6" fill="var(--color-accent)" opacity="0.18" />
    </Scene>
  )
}

/** 4 — the appointment at the university clinic, under supervision. */
export function SceneClinic() {
  return (
    <Scene className="scene-clinic">
      <rect x="16" y="14" width="64" height="48" rx="7" fill="var(--color-accent-muted)" />
      <rect x="16" y="14" width="64" height="11" rx="7" fill="var(--color-accent)" />
      <rect x="24" y="33" width="11" height="9" rx="2" fill="var(--color-surface)" />
      <rect x="42" y="33" width="11" height="9" rx="2" fill="var(--color-surface)" />
      <rect x="60" y="33" width="11" height="9" rx="2" fill="var(--color-surface)" />
      <rect x="24" y="47" width="11" height="9" rx="2" fill="var(--color-surface)" />
      {/* The booked day. It is the one that lifts. */}
      <g className="scene-day">
        <rect x="42" y="47" width="11" height="9" rx="2" fill="var(--color-positive)" />
      </g>
      <rect x="60" y="47" width="11" height="9" rx="2" fill="var(--color-surface)" />
    </Scene>
  )
}

export const STEP_SCENES = [SceneSubmit, SceneQueue, SceneContact, SceneClinic] as const
