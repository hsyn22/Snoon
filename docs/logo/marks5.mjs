/**
 * Round five — the shape and the letter are one shape.
 *
 * Round four was rejected in one sentence and the sentence was right: none of it
 * was close to the references. Every logo Haider sent fuses the object INTO the
 * letterform — the kaf *is* the book, the alif *is* the scissors, the tentacle
 * *is* the traffic light — and round four set the name in a font and parked a
 * small shape beside it. Those are different things and only one of them is what
 * he asked for.
 *
 * What made the difference possible: the letters are now the font's own outlines
 * (`outline.py`, HarfBuzz) rather than live text, checked against the browser by
 * `verify.mjs`. So a shape can be welded to a stroke and the result is a single
 * silhouette in a single ink — which is what all fourteen references are.
 *
 * Everything below is positioned off `uprights.json`, measured from each glyph's
 * own outline: the seen's three uprights at x 1554 / 1806 / 2023, the final
 * noon's bowl walls at x 117 / 536 with its floor at y 178, the waw at x 679..1080.
 * The word sits on a 1000-unit em, y down, baseline 0, x 0..2144.
 */
import fs from 'node:fs'

const O = JSON.parse(fs.readFileSync('outlines.json', 'utf8'))
const U = JSON.parse(fs.readFileSync('uprights.json', 'utf8'))

export const FACE = 'Lalezar'
export const WORD = O[FACE]
const L = U[FACE]

const SEEN = 'uniFEB3', NOON = 'uni0646', WAW = 'uniFEEE'
export const seenUprights = L[SEEN].peaks.map((p) => p.xFromLeft)      // 1554 1806 2023
export const bowl = { a: L[NOON].peaks[0].xFromLeft, b: L[NOON].peaks[2].xFromLeft, floor: L[NOON].bbox[3] }

/** Every glyph of the name, as one silhouette. Never anything else. */
export const letters = (fill) =>
  WORD.glyphs.map((g) => `<path d="${g.d}" fill="${fill}"/>`).join('')

/** Everything except one glyph — for the marks that redraw a letter's job. */
export const lettersExcept = (fill, skip) =>
  WORD.glyphs.filter((g) => g.glyph !== skip).map((g) => `<path d="${g.d}" fill="${fill}"/>`).join('')

/**
 * A root, tapering to a rounded tip, drawn from a flat top so it welds to
 * whatever stroke sits above it with no seam.
 */
export const root = (cx, w, top, len) => {
  const h = w / 2
  // Blunt, not spiked. The first attempt tapered to a point over 430 units and
  // the seen came out looking like a spider rather than like teeth: a real root
  // keeps most of its width for most of its length and rounds off at the tip.
  return `M${cx - h} ${top} C${cx - h} ${top + len * 0.62} ${cx - h * 0.72} ${top + len} ${cx} ${top + len} ` +
         `C${cx + h * 0.72} ${top + len} ${cx + h} ${top + len * 0.62} ${cx + h} ${top} Z`
}

/**
 * A gum: a band welded to the word's own baseline, cresting between the feet.
 * One ink with the letters, so the word sits *in* it rather than on top of it.
 */
export const gum = (x0, x1, top, h, crests) => {
  const span = x1 - x0, step = span / crests
  let d = `M${x0} ${top + h}`
  for (let i = 0; i < crests; i++) {
    const a = x0 + i * step
    d += ` C${a + step * 0.22} ${top - h * 0.35} ${a + step * 0.78} ${top - h * 0.35} ${a + step} ${top + h}`
  }
  return d + ` L${x1} ${top + h * 2.6} L${x0} ${top + h * 2.6} Z`
}

/** A pair of roots under one crown, with the notch between them. */
export const twoRoots = (x0, x1, top, len) => {
  const mid = (x0 + x1) / 2, span = x1 - x0
  return `M${x0} ${top} C${x0 + span * 0.04} ${top + len * 0.55} ${x0 + span * 0.2} ${top + len} ${x0 + span * 0.27} ${top + len} ` +
         `C${x0 + span * 0.36} ${top + len} ${mid - span * 0.06} ${top + len * 0.62} ${mid} ${top + len * 0.32} ` +
         `C${mid + span * 0.06} ${top + len * 0.62} ${x1 - span * 0.36} ${top + len} ${x1 - span * 0.27} ${top + len} ` +
         `C${x1 - span * 0.2} ${top + len} ${x1 - span * 0.04} ${top + len * 0.55} ${x1} ${top} Z`
}

/**
 * A crown to weld onto an upright: the upright's own width at the foot, opening
 * to a rounded shoulder. Fused at the foot, so the letter keeps its baseline.
 */
export const crown = (cx, w, top, foot) => {
  const h = w / 2
  return `M${cx - h} ${foot} L${cx - h} ${top + w * 0.42} C${cx - h} ${top} ${cx + h} ${top} ${cx + h} ${top + w * 0.42} L${cx + h} ${foot} Z`
}
