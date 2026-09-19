/**
 * Where does each letter of سَنّون actually sit?
 *
 * Round four merges a drawn object into one letter, so the object needs that
 * letter's real box — not an estimate. The browser is asked directly: a Range
 * over each code point, measured against the word's own box, in em units so the
 * numbers hold at any size.
 *
 * RTL, so x grows leftwards from the word's right edge: `fromRight` is the
 * distance from the start of the word to the letter's near edge.
 */
import { launch } from './browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

const NAME = 'سَنّون'
const LABEL = ['seen', 'fatha', 'noon', 'shadda', 'waw', 'noon-final']
const FACES = [['Lalezar', 400], ['Baloo', 800], ['Lemonada', 700], ['Marhey', 700]]
const SIZE = 300

fs.writeFileSync('glyphs.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>body{margin:0;direction:rtl}#t{position:absolute;top:100px;right:100px;white-space:nowrap}</style>
<div id="t"></div>`)

const b = await launch()
const p = await b.newPage({ viewportSize: { width: 2000, height: 700 } })
await p.goto('file://' + path.resolve('glyphs.html'))

const out = {}
for (const [face, weight] of FACES) {
  out[face] = await p.evaluate(
    async ({ NAME, LABEL, face, weight, SIZE }) => {
      await document.fonts.load(`${weight} ${SIZE}px "${face}"`, NAME)
      await document.fonts.ready
      const t = document.getElementById('t')
      t.style.font = `${weight} ${SIZE}px "${face}"`
      t.textContent = NAME
      const node = t.firstChild
      const box = t.getBoundingClientRect()
      const em = (v) => +(v / SIZE).toFixed(4)
      const letters = []
      for (let i = 0; i < NAME.length; i++) {
        const r = document.createRange()
        r.setStart(node, i)
        r.setEnd(node, i + 1)
        const rects = [...r.getClientRects()]
        if (!rects.length) { letters.push({ label: LABEL[i], empty: true }); continue }
        const x0 = Math.min(...rects.map((q) => q.left))
        const x1 = Math.max(...rects.map((q) => q.right))
        letters.push({
          label: LABEL[i],
          fromRight: em(box.right - x1),
          width: em(x1 - x0),
          centreFromRight: em(box.right - (x0 + x1) / 2),
        })
      }
      return { wordWidth: em(box.width), wordHeight: em(box.height), letters }
    },
    { NAME, LABEL, face, weight, SIZE },
  )
}
await b.close()
fs.writeFileSync('glyph-positions.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))
