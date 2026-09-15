/**
 * The check that draws itself when a case has been sent.
 *
 * Taken from transitions.dev's free "success check" and "spinner to check
 * morph", and this is the one moment in سنون that most deserves it: a patient
 * has just handed over their phone number and a photograph of their mouth on a
 * connection where the request took several seconds, and the page they land on
 * used to open with a paragraph. A tick that draws itself answers "did it
 * work?" before they have read a word.
 *
 * Rules it keeps, all of them ones this project already had:
 *
 * - **It draws on a clock, not on a scroll timeline.** A `view()` timeline
 *   freezes where the reader stopped, and a half-drawn tick reads as a failure
 *   rather than a success — the same reason the bridge's line is on a clock.
 * - **It is fully drawn with no CSS at all.** The dash offsets that hide it
 *   live inside the motion gate in `motion.css`, so no motion means a finished
 *   tick rather than an empty circle. A missing animation must never leave
 *   content hidden.
 * - **`stroke-dashoffset` again, and for the same reason as the bridge:** there
 *   is no transform that draws a line. Everything else here is transform and
 *   opacity.
 * - **No colour literals.** Success is `--color-positive`, like every other
 *   affirmative state.
 *
 * `aria-hidden`, because the heading beside it already says انرسلت حالتك. A
 * screen reader announcing "image: a tick" adds nothing.
 */
export function SuccessCheck({ className }: { className?: string }) {
  return (
    <svg
      className={`success-check ${className ?? ''}`}
      viewBox="0 0 52 52"
      fill="none"
      aria-hidden="true"
    >
      {/* The ring, drawn first so the tick sits inside it. */}
      <circle
        className="success-check-ring"
        cx="26"
        cy="26"
        r="23"
        stroke="var(--color-positive)"
        strokeWidth="3"
        opacity="0.35"
      />
      <path
        className="success-check-tick"
        d="M15 27.5 22.5 35 37 18"
        stroke="var(--color-positive)"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/**
 * The spinner inside a submitting button.
 *
 * A loop, and a deliberate exception to "nothing loops in the reader's
 * peripheral vision" — this is not peripheral. It is the thing somebody is
 * staring at while a 12MB photograph goes up a 400kbps link, and the question
 * it answers is whether the site has died. The button's own label already says
 * قيد الإرسال…, so at the `none` tier and under `prefers-reduced-motion` the
 * spinner simply does not turn and the words carry it.
 */
export function ButtonSpinner() {
  return (
    <svg className="btn-spinner" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2.5" opacity="0.3" />
      {/* One quarter of the ring, so there is something to see going round. */}
      <path
        d="M18 10a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}
