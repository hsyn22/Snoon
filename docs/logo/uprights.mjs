/**
 * The seen's own uprights, measured from the seen's own outline.
 *
 * The whole-word profile could not do this: the fatha sits directly above the
 * middle upright, so one of the three "peaks" it reported was a diacritic, and a
 * tooth fused there would have replaced a vowel mark rather than a stroke. Each
 * glyph is therefore rasterised alone, from its extracted path.
 */
import { launch } from './browser.mjs'
import fs from 'node:fs'

const O = JSON.parse(fs.readFileSync('outlines.json', 'utf8'))
const b = await launch()
const p = await b.newPage({ viewportSize: { width: 900, height: 600 } })
await p.goto('about:blank')

const out = {}
for (const [face, data] of Object.entries(O)) {
  out[face] = {}
  for (const g of data.glyphs) {
    const r = await p.evaluate(({ d, bbox }) => {
      const S = 0.5, pad = 20
      const W = Math.ceil((bbox[2] - bbox[0]) * S) + pad * 2
      const H = Math.ceil((bbox[3] - bbox[1]) * S) + pad * 2
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const x = c.getContext('2d')
      x.fillStyle = '#000'
      x.translate(pad - bbox[0] * S, pad - bbox[1] * S); x.scale(S, S)
      x.fill(new Path2D(d))
      const img = x.getImageData(0, 0, W, H).data
      const top = []
      for (let cx = 0; cx < W; cx++) {
        let t = -1
        for (let cy = 0; cy < H; cy++) if (img[(cy * W + cx) * 4 + 3] > 128) { t = cy; break }
        top.push(t)
      }
      // A peak is a run of columns whose top is a local minimum in y and rises
      // clearly above the glyph's own mid-height.
      const inked = top.filter((v) => v >= 0)
      if (!inked.length) return { peaks: [] }
      const hi = Math.min(...inked), lo = Math.max(...inked)
      const thresh = hi + (lo - hi) * 0.45
      const runs = []
      let run = null
      for (let cx = 0; cx < W; cx++) {
        if (top[cx] >= 0 && top[cx] <= thresh) { run ? run.push(cx) : (run = [cx]) }
        else if (run) { runs.push(run); run = null }
      }
      if (run) runs.push(run)
      return {
        peaks: runs.filter((r) => r.length > 3).map((r) => ({
          xFromLeft: +((bbox[0] + (r[0] + r[r.length - 1]) / 2 / S - pad / S)).toFixed(1),
          width: +((r[r.length - 1] - r[0]) / S).toFixed(1),
          top: +((bbox[1] + (Math.min(...r.map((cx) => top[cx])) - pad) / S)).toFixed(1),
        })),
      }
    }, { d: g.d, bbox: g.bbox })
    out[face][g.glyph] = { bbox: g.bbox, peaks: r.peaks }
  }
}
await b.close()
fs.writeFileSync('uprights.json', JSON.stringify(out, null, 1))
for (const [gn, v] of Object.entries(out.Lalezar)) {
  console.log(gn.padEnd(10), 'bbox', JSON.stringify(v.bbox), 'peaks', v.peaks.map((q) => `x${q.xFromLeft}/w${q.width}/top${q.top}`).join('  '))
}
