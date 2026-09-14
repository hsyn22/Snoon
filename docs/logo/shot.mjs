import { chromium } from 'playwright'
import fs from 'node:fs'
const [,, htmlPath, outPath, w, h] = process.argv
const b = await chromium.launch()
const p = await b.newPage({ viewportSize: { width: +(w||1400), height: +(h||900) }, deviceScaleFactor: 2 })
await p.goto('file://' + fs.realpathSync(htmlPath))
await p.evaluate(() => document.fonts.ready)
await p.waitForTimeout(600)
await p.screenshot({ path: outPath, fullPage: true })
await b.close()
console.log('ok', outPath)
