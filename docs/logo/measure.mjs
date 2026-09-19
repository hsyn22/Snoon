/**
 * Where are the holes in the word?
 *
 * Round four merges a drawn object into the typeset name, which only works if
 * the object lands exactly in a void the letters actually make. Guessing those
 * coordinates is how a mark ends up looking stuck on. So the word is rendered,
 * the alpha channel is read back, and the enclosed counters are found by
 * flooding the background from outside the canvas: anything the flood cannot
 * reach and which is not ink is a hole inside a letter.
 *
 * Reported in the text element's own em units, so the numbers stay true at any
 * size the mark is drawn at.
 */
import { launch } from './browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const NAME = 'سَنّون'
const FACES = [['Lalezar', 400], ['Baloo', 800], ['Lemonada', 700], ['Marhey', 700]]
const SIZE = 400

fs.writeFileSync('measure.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css"><style>body{margin:0}</style>`)

const b = await launch()
const p = await b.newPage({ viewportSize: { width: 2000, height: 900 } })
await p.goto('file://' + path.resolve('measure.html'))
// A webfont only downloads once something asks for it, and `ctx.font` is not
// something: the first run measured the fallback face four times and reported
// four identical widths, which is what gave it away.
await p.evaluate(
  async (faces) => {
    await Promise.all(faces.map(([f, w]) => document.fonts.load(`${w} 400px "${f}"`, '\u0633\u0646\u0648')))
    await document.fonts.ready
  },
  FACES,
)

const out = {}
for (const [face, weight] of FACES) {
  out[face] = await p.evaluate(
    ({ NAME, face, weight, SIZE }) => {
      const W = 1800, H = 800
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      const x = c.getContext('2d')
      x.direction = 'rtl'
      x.font = `${weight} ${SIZE}px "${face}"`
      if (!x.font.includes(face)) throw new Error(`canvas refused ${face}: got ${x.font}`)
      x.textBaseline = 'alphabetic'
      const baselineY = 560, originX = 1500
      x.fillStyle = '#000'
      x.fillText(NAME, originX, baselineY)

      const d = x.getImageData(0, 0, W, H).data
      const ink = new Uint8Array(W * H)
      for (let i = 0; i < W * H; i++) ink[i] = d[i * 4 + 3] > 96 ? 1 : 0

      // Flood the background inward from the border. Whatever it cannot reach
      // and which carries no ink is enclosed by a letter — a counter.
      const seen = new Uint8Array(W * H)
      const stack = []
      for (let i = 0; i < W; i++) { stack.push(i, (H - 1) * W + i) }
      for (let j = 0; j < H; j++) { stack.push(j * W, j * W + W - 1) }
      while (stack.length) {
        const i = stack.pop()
        if (seen[i] || ink[i]) continue
        seen[i] = 1
        const cx = i % W, cy = (i / W) | 0
        if (cx > 0) stack.push(i - 1)
        if (cx < W - 1) stack.push(i + 1)
        if (cy > 0) stack.push(i - W)
        if (cy < H - 1) stack.push(i + W)
      }

      // Ink bounds.
      let x0 = W, y0 = H, x1 = 0, y1 = 0
      for (let i = 0; i < W * H; i++) {
        if (!ink[i]) continue
        const cx = i % W, cy = (i / W) | 0
        if (cx < x0) x0 = cx; if (cx > x1) x1 = cx
        if (cy < y0) y0 = cy; if (cy > y1) y1 = cy
      }

      // Label each enclosed void.
      const lab = new Int32Array(W * H).fill(-1)
      const holes = []
      for (let i = 0; i < W * H; i++) {
        if (ink[i] || seen[i] || lab[i] !== -1) continue
        const id = holes.length
        let hx0 = W, hy0 = H, hx1 = 0, hy1 = 0, area = 0
        const s = [i]
        while (s.length) {
          const k = s.pop()
          if (k < 0 || k >= W * H || ink[k] || seen[k] || lab[k] !== -1) continue
          lab[k] = id; area++
          const cx = k % W, cy = (k / W) | 0
          if (cx < hx0) hx0 = cx; if (cx > hx1) hx1 = cx
          if (cy < hy0) hy0 = cy; if (cy > hy1) hy1 = cy
          if (cx > 0) s.push(k - 1)
          if (cx < W - 1) s.push(k + 1)
          if (cy > 0) s.push(k - W)
          if (cy < H - 1) s.push(k + W)
        }
        if (area > 200) holes.push({ x: hx0, y: hy0, w: hx1 - hx0, h: hy1 - hy0, area })
      }

      const em = (v) => +(v / SIZE).toFixed(4)
      const rel = (r) => ({
        x: em(r.x - originX), y: em(r.y - baselineY),
        w: em(r.w), h: em(r.h), area: +(r.area / (SIZE * SIZE)).toFixed(4),
      })
      return {
        advance: em(x.measureText(NAME).width),
        ink: rel({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, area: 0 }),
        holes: holes.sort((a, b) => b.area - a.area).map(rel),
      }
    },
    { NAME, face, weight, SIZE },
  )
}
await b.close()
fs.writeFileSync('measurements.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
