/**
 * The drawn half of round four.
 *
 * Every direction in this round is one typeset word plus one drawn object, so
 * the objects live here and the lettering never does. **Nothing in this file may
 * draw an Arabic letter or a diacritic** — see README, "The rule the whole round
 * is built on", and the first item in "What was wrong with the ChatGPT logo".
 *
 * Each shape is written on a 0..100 box and positioned by the caller, so the
 * same tooth serves a 16px favicon and a 900px hero unchanged.
 */

/** An incisor: one crown, one root. Reads at 16px, which a molar does not. */
export const INCISOR =
  'M50 3 C27 3 13 17 13 35 C13 48 19 58 25 72 C31 86 35 97 41 97 C46 97 47 88 48 74 ' +
  'L49 58 C49 54 51 54 51 58 L52 74 C53 88 54 97 59 97 C65 97 69 86 75 72 ' +
  'C81 58 87 48 87 35 C87 17 73 3 50 3 Z'

/** A molar: a wide crown on two roots, for the places a single root reads thin. */
export const MOLAR =
  'M50 5 C24 5 7 19 7 39 C7 51 12 59 16 71 C19 84 23 95 30 95 C37 95 39 84 41 71 ' +
  'C42 62 45 57 50 57 C55 57 58 62 59 71 C61 84 63 95 70 95 C77 95 81 84 84 71 ' +
  'C88 59 93 51 93 39 C93 19 76 5 50 5 Z'

/**
 * Two roots to hang under a letter whose own bowl is already the crown.
 *
 * Drawn from a flat top edge so it butts against the bowl with no seam: in the
 * same ink as the word this has to read as one shape, not as an object parked
 * underneath. The first attempt left a gap and read as two legs.
 */
export const ROOTS =
  'M2 0 C4 30 14 92 30 92 C44 92 46 40 47 0 L53 0 C54 40 56 92 70 92 ' +
  'C86 92 96 30 98 0 Z'

/**
 * A mouth mirror head, to sit inside a round counter. The highlight is the
 * whole reason it reads as a mirror rather than as a dot, so it is never
 * dropped at small sizes — it is what survives.
 */
export const mirror = (cx, cy, r, face, shine) => `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${face}"/>
  <path d="M${cx - r * 0.5} ${cy + r * 0.16} A ${r * 0.66} ${r * 0.66} 0 0 1 ${cx + r * 0.16} ${cy - r * 0.5}"
        fill="none" stroke="${shine}" stroke-width="${Math.max(r * 0.3, 1.2)}" stroke-linecap="round"/>`

/**
 * A gum line: a band whose top edge rises into a crest under each letter foot.
 *
 * The crests are what make it tissue rather than an underline, so they carry
 * real amplitude — the first attempt used a twelfth of the band height and
 * rendered as a straight bar.
 */
export const gumline = (x, y, w, h, fill, crests = 5) => {
  const step = w / crests
  let d = `M${x} ${y + h}`
  for (let i = 0; i < crests; i++) {
    const a = x + i * step
    d += ` C${a + step * 0.2} ${y - h * 0.5} ${a + step * 0.8} ${y - h * 0.5} ${a + step} ${y + h}`
  }
  d += ` L${x + w} ${y + h * 3} L${x} ${y + h * 3} Z`
  return `<path d="${d}" fill="${fill}"/>`
}

/** Place a 0..100 shape into a box. */
export const put = (d, x, y, w, h, fill, extra = '') =>
  `<path d="${d}" fill="${fill}" transform="translate(${x} ${y}) scale(${w / 100} ${h / 100})" ${extra}/>`
