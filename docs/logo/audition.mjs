import { launch } from './browser.mjs'
import fs from 'node:fs'
import path from 'node:path'

// The name, as six code points. Never typed as a literal anywhere it might be
// "corrected": seen, fatha, noon, shadda, waw, noon.
const NAME = 'سَنّون'

const FACES = [
  ['Lalezar', 400], ['Baloo', 800], ['Marhey', 700], ['Lemonada', 700],
  ['Cairo', 900], ['Tajawal', 900], ['Almarai', 800], ['Zain', 900],
  ['ReemKufi', 700], ['ArefRuqaa', 700],
]

const cards = FACES.map(([f, w]) => `
  <div class="card">
    <div class="face">${f} ${w}</div>
    <div class="word" style="font-family:'${f}';font-weight:${w}">${NAME}</div>
  </div>`).join('')

const html = `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  body{margin:0;background:#fff;font-family:system-ui;direction:rtl}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:0}
  .card{padding:26px 34px;border-bottom:1px solid #e6e6e6;border-inline-start:1px solid #e6e6e6}
  .face{font-size:12px;color:#888;direction:ltr;text-align:right;letter-spacing:.06em}
  .word{font-size:104px;line-height:1.5;color:#13585c}
</style>
<div class="grid">${cards}</div>`

fs.writeFileSync('audition.html', html)

const b = await launch()
const p = await b.newPage({ viewportSize: { width: 1500, height: 1000 }, deviceScaleFactor: 2 })
await p.goto('file://' + path.resolve('audition.html'))
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(500)
await p.screenshot({ path: 'audition.png', fullPage: true })
await b.close()
console.log('ok')
