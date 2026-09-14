import fs from 'node:fs'
import { marks, T, TD, W, WL } from './marks.mjs'

const NAME = '&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646;'   // سَنّون
const LAT = 'SOON'
let uid = 0
const svg = (key, size, args = [], extra = '') => {
  const body = marks[key](...args).replace(/"tc"/g, `"tc${uid}"`).replace(/#tc\)/g, `#tc${uid})`)
  uid++
  return `<svg viewBox="0 0 100 100" width="${size}" height="${size}" style="${extra}">${body}</svg>`
}

// A mark has to survive two hostile places: reversed out on the brand colour,
// and in a single ink. Neither is decoration — the first is the app icon on a
// dark home screen, the second is a rubber stamp on a clinic form.
const REV = {
  seal: ['#ffffff', T],
  badge: [T, WL],            // a badge keeps its own disc on dark
  tooth: ['#ffffff', W, 'none'],
  calli: ['#ffffff'],
  shadda: ['#ffffff', W],
}
const MONO = {
  seal: ['#1b1b1b', '#ffffff'],
  badge: ['#1b1b1b', '#ffffff'],
  tooth: ['#1b1b1b', '#ffffff', '#1b1b1b'],
  calli: ['#1b1b1b'],
  shadda: ['#1b1b1b', '#1b1b1b'],
}

const C = [
  { k: 'link', ar: '&#x627;&#x644;&#x648;&#x635;&#x644;&#x629;', en: 'The link',
    font: 'Reem Kufi', weight: 700, size: 68,
    why: '&#x627;&#x644;&#x62C;&#x633;&#x631; &#x627;&#x644;&#x630;&#x64A; &#x648;&#x635;&#x641;&#x62A;&#x647;&#x60C; &#x645;&#x62E;&#x62A;&#x635;&#x631;&#x627;&#x64B; &#x62D;&#x62A;&#x649; &#x635;&#x627;&#x631; &#x62D;&#x631;&#x641;&#x627;&#x64B; &#x648;&#x627;&#x628;&#x62A;&#x633;&#x627;&#x645;&#x629; &#x641;&#x64A; &#x622;&#x646; &#x648;&#x627;&#x62D;&#x62F;',
    note: 'Two people at the ends of one curve, the noon&rsquo;s dot above. Bridge, letter and smile in one shape.' },

  { k: 'noon', ar: '&#x627;&#x644;&#x646;&#x648;&#x646;', en: 'The noon',
    font: 'Lalezar', weight: 400, size: 70,
    why: '&#x62D;&#x631;&#x641; &#x648;&#x627;&#x62D;&#x62F; &#x645;&#x646; &#x627;&#x633;&#x645;&#x646;&#x627;&#x60C; &#x648;&#x639;&#x627;&#x621; &#x64A;&#x62D;&#x62A;&#x648;&#x64A; &#x644;&#x627; &#x634;&#x639;&#x627;&#x631; &#x645;&#x633;&#x62A;&#x648;&#x631;&#x62F;',
    note: 'The letter itself, filled. A bowl that holds something. Arabic at any size, nothing to explain.' },

  { k: 'badge', ar: '&#x62A;&#x635;&#x62D;&#x64A;&#x62D; ChatGPT &#x2014; ١', en: 'ChatGPT, corrected (A)',
    font: 'Marhey', weight: 700, size: 60, badge: true,
    why: '&#x646;&#x641;&#x633; &#x627;&#x644;&#x62A;&#x631;&#x643;&#x64A;&#x628; &#x627;&#x644;&#x630;&#x64A; &#x623;&#x639;&#x62C;&#x628;&#x643;&#x60C; &#x645;&#x639; &#x62A;&#x635;&#x62D;&#x64A;&#x62D; &#x643;&#x644; &#x645;&#x627; &#x643;&#x627;&#x646; &#x62E;&#x637;&#x623;&#x64B; &#x62F;&#x627;&#x62E;&#x644;&#x647;',
    note: 'The circular badge and the smile kept. The smile is no longer floating &mdash; it is the bowl of the noon, with its dot. Palette is ours.' },

  { k: 'tooth', ar: '&#x62A;&#x635;&#x62D;&#x64A;&#x62D; ChatGPT &#x2014; ٢', en: 'ChatGPT, corrected (B)',
    font: 'Baloo Bhaijaan 2', weight: 700, size: 58,
    why: '&#x627;&#x644;&#x642;&#x631;&#x635; &#x635;&#x627;&#x631; &#x633;&#x646;&#x651;&#x627;&#x64B;&#x60C; &#x645;&#x634;&#x642;&#x648;&#x642;&#x627;&#x64B; &#x628;&#x646;&#x635;&#x641;&#x64A;&#x646;: &#x627;&#x644;&#x645;&#x631;&#x64A;&#x636; &#x648;&#x627;&#x644;&#x637;&#x627;&#x644;&#x628;',
    note: 'The badge becomes a tooth, split into the two halves it joins. Same two-arcs idea as the hero artwork.' },

  { k: 'arcs', ar: '&#x627;&#x644;&#x642;&#x648;&#x633;&#x627;&#x646;', en: 'Two arcs',
    font: 'Reem Kufi', weight: 700, size: 68,
    why: '&#x646;&#x641;&#x633; &#x627;&#x644;&#x631;&#x633;&#x645; &#x627;&#x644;&#x645;&#x648;&#x62C;&#x648;&#x62F; &#x641;&#x64A; &#x635;&#x62F;&#x631; &#x627;&#x644;&#x645;&#x648;&#x642;&#x639;&#x60C; &#x645;&#x63A;&#x644;&#x642;&#x627;&#x64B; &#x639;&#x644;&#x649; &#x646;&#x641;&#x633;&#x647;',
    note: 'MatchMotif from the hero, closed into a mark. The logo and the artwork already on the page become one idea.' },

  { k: 'seal', ar: '&#x627;&#x644;&#x62E;&#x62A;&#x645;', en: 'The seal',
    font: 'Reem Kufi', weight: 700, size: 68,
    why: '&#x623;&#x628;&#x633;&#x637; &#x627;&#x644;&#x62D;&#x644;&#x648;&#x644; &#x648;&#x623;&#x642;&#x648;&#x627;&#x647;&#x627; &#x639;&#x644;&#x649; &#x634;&#x627;&#x634;&#x629; &#x631;&#x62E;&#x64A;&#x635;&#x629;',
    note: 'One typeset letter in a rounded square. The dullest option and the one most certain to survive a phone home screen.' },

  { k: 'shadda', ar: '&#x627;&#x644;&#x634;&#x62F;&#x651;&#x629;', en: 'The shadda',
    font: 'Kufam', weight: 700, size: 64,
    why: '&#x627;&#x644;&#x634;&#x62F;&#x651;&#x629; &#x623;&#x635;&#x644;&#x627;&#x64B; &#x633;&#x64A;&#x646; &#x635;&#x63A;&#x64A;&#x631;&#x629;&#x60C; &#x648;&#x627;&#x644;&#x633;&#x651;&#x646;&#x651; &#x647;&#x648; &#x627;&#x644;&#x633;&#x646;: &#x62B;&#x644;&#x627;&#x62B; &#x623;&#x633;&#x646;&#x627;&#x646; &#x641;&#x648;&#x642; &#x627;&#x644;&#x627;&#x633;&#x645;',
    note: 'A shadda is a miniature seen, and سِنّ is a tooth. Three teeth over the name. This direction exists only because you chose the shadda.' },

  { k: 'calli', ar: '&#x627;&#x644;&#x62E;&#x637;&#x651;', en: 'The written name',
    font: 'Aref Ruqaa', weight: 700, size: 62,
    why: '&#x644;&#x627; &#x639;&#x644;&#x627;&#x645;&#x629; &#x648;&#x644;&#x627; &#x631;&#x633;&#x645;: &#x627;&#x644;&#x627;&#x633;&#x645; &#x628;&#x62E;&#x637;&#x651; &#x627;&#x644;&#x631;&#x642;&#x639;&#x629; &#x647;&#x648; &#x627;&#x644;&#x634;&#x639;&#x627;&#x631;',
    note: 'No drawn mark. The name in a real hand is the logo; the final noon stands in where something small is needed. Reads as a place, not an app.' },
]

const card = (c, i) => `
<section class="card">
  <header>
    <span class="num">${String(i + 1).padStart(2, '0')}</span>
    <div>
      <h2 style="font-family:'Cairo'">${c.ar}</h2>
      <p class="en">${c.en}</p>
    </div>
  </header>
  <p class="why" style="font-family:'Cairo'">${c.why}</p>

  <div class="stage">
    <div class="big">${svg(c.k, 150)}</div>
    <div class="rev">${svg(c.k, 96, REV[c.k] || ['#ffffff', W])}</div>
    <div class="tiny">
      <div>${svg(c.k, 32)}<b>32</b></div>
      <div>${svg(c.k, 16)}<b>16</b></div>
      <div class="mono1">${svg(c.k, 32, MONO[c.k] || ['#1b1b1b', '#1b1b1b'])}<b>1&nbsp;colour</b></div>
    </div>
  </div>

  <div class="lockup">
    ${c.k === 'calli' ? '' : svg(c.k, 62)}
    <div class="words">
      <div class="ar" style="font-family:'${c.font}';font-weight:${c.weight};font-size:${c.size}px">${NAME}</div>
      <div class="lat">${LAT}</div>
    </div>
  </div>

  <p class="note">${c.note}</p>
</section>`

const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="./fonts.css">
<style>
:root{--t:${T};--td:${TD};--w:${W};--wl:${WL}}
*{box-sizing:border-box}
body{margin:0;background:#fbfaf8;color:#16282b;font-family:'IBM Plex Sans Arabic',system-ui;padding:44px 40px 60px}
.head{max-width:1520px;margin:0 auto 34px}
.head h1{font-family:'Cairo';font-size:34px;margin:0 0 6px;color:var(--td)}
.head p{margin:0;color:#5d6b6d;font-size:15px;line-height:1.8;max-width:1100px}
.head .lat{direction:ltr;text-align:left;font-size:13px;color:#7c8a8c;margin-top:10px}
.grid{max-width:1520px;margin:0 auto;display:grid;grid-template-columns:1fr 1fr;gap:26px}
.card{background:#fff;border:1px solid #e6e3dd;border-radius:18px;padding:24px 26px 22px}
.card header{display:flex;gap:14px;align-items:flex-start;margin-bottom:8px}
.num{font-family:ui-monospace,monospace;font-size:13px;color:#fff;background:var(--t);border-radius:7px;padding:4px 8px;flex:none;margin-top:4px;direction:ltr}
.card h2{margin:0;font-size:23px;color:var(--td);font-weight:700}
.en{margin:2px 0 0;font-size:12.5px;color:#8b9799;direction:ltr;text-align:left;letter-spacing:.06em;text-transform:uppercase}
.why{margin:0 0 16px;font-size:14.5px;line-height:1.9;color:#4a5b5d}
.stage{display:flex;align-items:center;gap:18px;background:#f7f5f1;border-radius:14px;padding:18px 20px}
.big{flex:none;width:150px;height:150px;display:flex;align-items:center;justify-content:center;background:#fff;border-radius:12px}
.rev{flex:none;width:118px;height:118px;display:flex;align-items:center;justify-content:center;background:var(--t);border-radius:12px}
.tiny{display:flex;gap:16px;align-items:flex-end}
.tiny>div{display:flex;flex-direction:column;align-items:center;gap:7px}
.tiny b{font-size:10px;color:#93a0a2;font-weight:500;direction:ltr}
.mono1 svg{background:#fff}
.lockup{display:flex;align-items:center;gap:18px;padding:22px 4px 6px;justify-content:center}
.words{text-align:center}
.ar{color:var(--td);line-height:1.45;white-space:nowrap}
.lat{direction:ltr;font-family:'IBM Plex Sans Arabic';font-weight:600;letter-spacing:.46em;font-size:15px;color:var(--w);margin-top:2px;text-indent:.46em}
.note{margin:6px 0 0;font-size:13px;line-height:1.75;color:#6d7b7d;direction:ltr;text-align:left;border-top:1px solid #eeebe5;padding-top:12px}
</style></head><body>
<div class="head">
  <h1>&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646; &#x2014; &#x62B;&#x645;&#x627;&#x646;&#x64A;&#x629; &#x627;&#x62A;&#x651;&#x62C;&#x627;&#x647;&#x627;&#x62A; &#x644;&#x644;&#x634;&#x639;&#x627;&#x631;</h1>
  <p style="font-family:'Cairo'">&#x643;&#x644;&#x651; &#x627;&#x62A;&#x651;&#x62C;&#x627;&#x647; &#x645;&#x639;&#x631;&#x648;&#x636; &#x628;&#x62D;&#x62C;&#x645; &#x643;&#x628;&#x64A;&#x631;&#x60C; &#x648;&#x645;&#x639;&#x643;&#x648;&#x633;&#x627;&#x64B; &#x639;&#x644;&#x649; &#x627;&#x644;&#x623;&#x62E;&#x636;&#x631;&#x60C; &#x648;&#x628;&#x62D;&#x62C;&#x645; ٣٢ &#x648;١٦ &#x628;&#x643;&#x633;&#x644; &#x644;&#x623;&#x646;&#x651;&#x647; &#x633;&#x64A;&#x638;&#x647;&#x631; &#x639;&#x644;&#x649; &#x634;&#x627;&#x634;&#x629; &#x647;&#x627;&#x62A;&#x641;&#x60C; &#x648;&#x628;&#x644;&#x648;&#x646; &#x648;&#x627;&#x62D;&#x62F; &#x644;&#x644;&#x637;&#x628;&#x627;&#x639;&#x629;.</p>
  <p class="lat">Every direction is shown large, reversed on teal, at 32px and 16px, in one colour, and locked up with the name. Latin shown as SOON &mdash; see the note in chat before this is fixed.</p>
</div>
<div class="grid">${C.map(card).join('')}</div>
</body></html>`

fs.writeFileSync('sheet.html', html)
console.log('ok')
