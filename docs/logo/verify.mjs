/**
 * The outlines are the font's, and this is what proves it.
 *
 * `outline.py` takes the letterforms out of the font with HarfBuzz so a shape
 * can be fused into one of them. That is the only way to do what every logo in
 * Haider's reference sheet does — the kaf *is* the book — and it is also exactly
 * the move that once produced a logo spelling a word that does not exist. So the
 * rule is kept by machine rather than by care: the extracted paths are filled on
 * a canvas beside the browser's own rendering of the same string in the same
 * face, and any disagreement beyond antialiasing fails.
 *
 * Both sides are rasterised with canvas rather than with an SVG image, because a
 * webfont does not load inside an SVG loaded as an <img> — the first attempt
 * compared the outlines against a blank bitmap and reported a clean 100%.
 *
 * Run after any change to the extraction, and before trusting a mark built on it.
 */
import { launch } from './browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const NAME = 'سَنّون'
const O = JSON.parse(fs.readFileSync('outlines.json', 'utf8'))
const WEIGHT = { Lalezar: 400, Baloo: 800, Lemonada: 700, Marhey: 700, Cairo: 900, Zain: 900 }
const SIZE = 320
const TOL = 0.02   // share of inked pixels allowed to disagree, i.e. the edges

fs.writeFileSync('verify.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css"><style>body{margin:0;background:#fff}</style>`)

const b = await launch()
const p = await b.newPage({ viewportSize: { width: 1600, height: 600 } })
await p.goto('file://' + path.resolve('verify.html'))

let bad = 0
for (const [face, data] of Object.entries(O)) {
  const weight = WEIGHT[face]
  const r = await p.evaluate(
    async ({ NAME, face, weight, SIZE, data }) => {
      await document.fonts.load(`${weight} ${SIZE}px "${face}"`, NAME)
      await document.fonts.ready
      const W = 1500, H = 520, bx = 90, by = 360, k = SIZE / 1000

      const mk = () => {
        const c = document.createElement('canvas'); c.width = W; c.height = H
        return [c, c.getContext('2d')]
      }
      // The outlines: x runs 0..advance with 0 at the word's LEFT edge, y is
      // down from the baseline, on a 1000-unit em.
      const [, a] = mk()
      a.fillStyle = '#000'; a.translate(bx, by); a.scale(k, k)
      for (const g of data.glyphs) a.fill(new Path2D(g.d))

      // The browser's own rendering. fillText in rtl places the run's START —
      // its right edge — at x, so it is offset by the advance.
      const [, t] = mk()
      t.fillStyle = '#000'; t.direction = 'rtl'
      t.font = `${weight} ${SIZE}px "${face}"`
      t.textBaseline = 'alphabetic'
      if (!t.font.includes(face)) throw new Error(`canvas refused ${face}`)
      t.fillText(NAME, bx + data.advance * k, by)

      const A = a.canvas.getContext('2d').getImageData(0, 0, W, H).data
      const T = t.canvas.getContext('2d').getImageData(0, 0, W, H).data
      let inked = 0, diff = 0
      for (let i = 0; i < W * H; i++) {
        const av = A[i * 4 + 3] > 128, tv = T[i * 4 + 3] > 128
        if (av || tv) inked++
        if (av !== tv) diff++
      }
      return { inked, diff }
    },
    { NAME, face, weight, SIZE, data },
  )
  const ratio = r.inked ? r.diff / r.inked : 1
  const ok = ratio <= TOL && r.inked > 1000
  if (!ok) bad++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${face.padEnd(9)} inked=${r.inked} differing=${r.diff} (${(ratio * 100).toFixed(2)}%)`)
}
await b.close()
if (bad) { console.error(`\n${bad} face(s) failed — the outlines are not what the font renders.`); process.exit(1) }
console.log('\nAll faces match live text. The outlines are the font’s.')
