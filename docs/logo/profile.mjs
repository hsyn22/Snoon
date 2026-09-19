/**
 * The word's skyline and its floor.
 *
 * Placing a tooth "on one of the seen's uprights" needs to know where the
 * uprights are, and the letter box alone does not say — the seen's three teeth
 * sit in the right part of its box and the tail sweeps out under the rest. So
 * the ink is read column by column: the top profile's local peaks are the
 * uprights, and the bottom profile is where a gum line has to run to touch.
 */
import { launch } from './browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const NAME = 'سَنّون'
const FACES = [['Lalezar', 400], ['Baloo', 800], ['Lemonada', 700], ['Marhey', 700]]
const SIZE = 400

fs.writeFileSync('profile.html', '<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="fonts.css">')
const b = await launch()
const p = await b.newPage({ viewportSize: { width: 2200, height: 1000 } })
await p.goto('file://' + path.resolve('profile.html'))

const out = {}
for (const [face, weight] of FACES) {
  out[face] = await p.evaluate(
    async ({ NAME, face, weight, SIZE }) => {
      await document.fonts.load(`${weight} ${SIZE}px "${face}"`, NAME)
      await document.fonts.ready
      const W = 2000, H = 900, originX = 1700, baselineY = 620
      const c = document.createElement('canvas'); c.width = W; c.height = H
      const x = c.getContext('2d')
      x.direction = 'rtl'; x.font = `${weight} ${SIZE}px "${face}"`; x.textBaseline = 'alphabetic'
      x.fillStyle = '#000'; x.fillText(NAME, originX, baselineY)
      const d = x.getImageData(0, 0, W, H).data

      const top = [], bot = []
      for (let cx = 0; cx < W; cx++) {
        let t = -1, bt = -1
        for (let cy = 0; cy < H; cy++) {
          if (d[(cy * W + cx) * 4 + 3] > 96) { if (t < 0) t = cy; bt = cy }
        }
        top.push(t); bot.push(bt)
      }
      const em = (v) => +(v / SIZE).toFixed(4)

      // Peaks of the top profile, ignoring the detached marks above the word by
      // only considering ink that connects down to the baseline band.
      const bodyTop = []
      for (let cx = 0; cx < W; cx++) {
        let t = -1
        for (let cy = baselineY - Math.round(SIZE * 0.62); cy < H; cy++) {
          if (d[(cy * W + cx) * 4 + 3] > 96) { t = cy; break }
        }
        bodyTop.push(t)
      }
      const peaks = []
      for (let cx = 2; cx < W - 2; cx++) {
        if (bodyTop[cx] < 0) continue
        const isPeak = bodyTop[cx] <= bodyTop[cx - 2] && bodyTop[cx] <= bodyTop[cx + 2]
        const rises = bodyTop[cx] < baselineY - SIZE * 0.2
        if (isPeak && rises) peaks.push(cx)
      }
      // Collapse runs into one peak each.
      const groups = []
      for (const cx of peaks) {
        const last = groups[groups.length - 1]
        if (last && cx - last[last.length - 1] < SIZE * 0.06) last.push(cx)
        else groups.push([cx])
      }
      return {
        uprights: groups.map((g) => ({
          centreFromRight: em(originX - (g[0] + g[g.length - 1]) / 2),
          widthApprox: em(g[g.length - 1] - g[0]),
          topFromBaseline: em(Math.min(...g.map((cx) => bodyTop[cx])) - baselineY),
        })),
        floor: (() => {
          const s = []
          for (let cx = 0; cx < W; cx += Math.round(SIZE * 0.05)) {
            if (bot[cx] < 0) continue
            s.push({ fromRight: em(originX - cx), y: em(bot[cx] - baselineY) })
          }
          return s
        })(),
      }
    },
    { NAME, face, weight, SIZE },
  )
}
await b.close()
fs.writeFileSync('ink-profile.json', JSON.stringify(out, null, 2))
for (const [f, v] of Object.entries(out)) {
  console.log(f, 'uprights:', JSON.stringify(v.uprights))
}
