'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'

/**
 * The shared-element page transition — the one thing GSAP is here for.
 *
 * Tapping "قدّم حالتك" on the landing page makes the button *become* the case
 * form's heading: it travels across the screen and grows into it, rather than
 * one page cutting to another. It is the effect the reference libraries charge
 * for, and the only one in that whole catalogue that CSS has no answer to —
 * React's `<ViewTransition>` is not in stable React, and the CSS-only
 * `@view-transition` is cross-document, so it does not fire on the client-side
 * navigation this app uses. See CLAUDE.md for the full reasoning.
 *
 * **Nobody pays for it but the phone that can afford it.** Three gates, in
 * order, and every one of them has to pass before a byte of GSAP is fetched:
 *
 * 1. `data-motion === 'full'` — set by the inline script in `<head>` before the
 *    first paint, from device memory and core count. A weak or unknown phone is
 *    never `full`, so it never gets here.
 * 2. `prefers-reduced-motion` is not set.
 * 3. The browser is idle. The import runs in `requestIdleCallback`, so it
 *    cannot compete with anything on the critical path.
 *
 * The `import()` is dynamic on purpose: it becomes its own chunk, and a chunk is
 * only fetched when the import actually runs. Measured — on the `standard` tier
 * no gsap chunk is requested at all.
 *
 * Everything degrades to the CSS `.page-enter` fade that every tier already
 * has. If GSAP has not finished loading when somebody taps, if the target
 * element is missing, if anything throws — the navigation is an ordinary one.
 * A transition is the last thing that may ever break a link.
 */

/** What a link captured on the way out, waiting for the next page to commit. */
let pending: { state: ReturnType<typeof import('gsap/Flip').Flip.getState>; id: string } | null =
  null

/** Resolved once, after the gates pass. Null until then, and null forever on a
 *  device that never passes them. */
type Engine = {
  gsap: typeof import('gsap').gsap
  Flip: typeof import('gsap/Flip').Flip
}
let engine: Engine | null = null

/** Clears a capture whose navigation never arrived. See the click handler. */
let expiry = 0

/** The attribute a link and its destination share. Both ends carry the same
 *  value, which is how GSAP knows they are the same thing. */
const FLIP_ATTR = 'data-flip-id'

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function PageTransitions() {
  const pathname = usePathname()

  // Load GSAP, once, and only for a device that has already been judged capable.
  useEffect(() => {
    if (engine) return
    if (document.documentElement.dataset.motion !== 'full') return
    if (prefersReducedMotion()) return

    let cancelled = false
    const load = async () => {
      try {
        const [{ gsap }, { Flip }] = await Promise.all([import('gsap'), import('gsap/Flip')])
        if (cancelled) return
        gsap.registerPlugin(Flip)
        engine = { gsap, Flip }
      } catch {
        // A failed chunk means no transition, which is the same as every other
        // tier. Never surface it.
      }
    }

    // `requestIdleCallback` is missing on Safari, so the fallback is a plain
    // timer long enough to be well clear of the first paint.
    const idle = typeof window.requestIdleCallback === 'function'
    const handle = idle
      ? window.requestIdleCallback(() => void load(), { timeout: 3000 })
      : window.setTimeout(() => void load(), 1200)
    return () => {
      cancelled = true
      if (idle) window.cancelIdleCallback(handle)
      else window.clearTimeout(handle)
    }
  }, [])

  // Capture the outgoing element the moment a marked link is clicked — while
  // the old page is still on screen, because once the router starts the old DOM
  // is already going.
  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!engine) return
      // A modified click opens a new tab and this page never navigates. Left
      // button only, no modifiers — the same set Next's own Link honours.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return
      }
      const target = event.target as Element | null
      const link = target?.closest?.(`a[${FLIP_ATTR}]`)
      if (!link) return
      const id = link.getAttribute(FLIP_ATTR)
      if (!id) return
      try {
        pending = { state: engine.Flip.getState(`[${FLIP_ATTR}="${id}"]`), id }
        // Suppress the CSS page fade for this one navigation: the two together
        // read as the page arriving twice.
        document.documentElement.dataset.flipping = '1'
      } catch {
        pending = null
        return
      }
      /*
       * **The navigation may never happen**, and this is the part that is easy
       * to leave out. A route can fail, a click can be cancelled downstream, or
       * the href can point at the page we are already on — in which case the
       * pathname effect below never runs, `data-flipping` stays set on <html>
       * and suppresses the CSS fade on every later navigation, and `pending`
       * holds bounds from a page that has long since scrolled. The flight would
       * then start from somewhere the reader never tapped.
       *
       * So the capture expires. Longer than any client-side navigation in this
       * app takes, short enough that nothing stale survives to the next tap.
       */
      window.clearTimeout(expiry)
      expiry = window.setTimeout(() => {
        pending = null
        delete document.documentElement.dataset.flipping
      }, 1200)
    }

    // Capture phase, so this runs before Next's own click handler starts the
    // navigation.
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // The new page has committed. Morph the old bounds into the new ones.
  useEffect(() => {
    window.clearTimeout(expiry)
    const captured = pending
    pending = null
    if (!captured || !engine) {
      delete document.documentElement.dataset.flipping
      return
    }

    const arrived = document.querySelector(`[${FLIP_ATTR}="${captured.id}"]`)
    if (!arrived) {
      // The destination does not carry the other half of the pair. Nothing to
      // morph into — let the ordinary fade run instead.
      delete document.documentElement.dataset.flipping
      return
    }

    const { gsap, Flip } = engine
    try {
      Flip.from(captured.state as Parameters<typeof Flip.from>[0], {
        targets: `[${FLIP_ATTR}="${captured.id}"]`,
        duration: 0.55,
        ease: 'power3.inOut',
        // `scale` morphs size by transform rather than by width and height, so
        // the flight stays on the compositor.
        //
        // **`absolute` is deliberately off.** It is the obvious setting and it
        // was wrong here: lifting the element out of flow for the flight let
        // the rest of the arriving page collapse upwards by the heading's
        // height and then drop back when it landed. In flow, the destination
        // page is laid out correctly from the first frame and only the heading
        // moves — which is the point.
        scale: true,
        // Fade the incoming content in over the flight rather than having it
        // snap: the button's label and the page's heading are not the same
        // words, and a hard swap mid-flight is what makes this kind of
        // transition look like a glitch.
        onEnter: (elements: Element[]) =>
          gsap.fromTo(elements, { opacity: 0 }, { opacity: 1, duration: 0.3 }),
        onComplete: () => {
          delete document.documentElement.dataset.flipping
        },
      })
    } catch {
      delete document.documentElement.dataset.flipping
    }
  }, [pathname])

  return null
}
