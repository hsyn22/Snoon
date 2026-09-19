import fs from 'node:fs'
import { INCISOR, MOLAR, ROOTS, mirror, gumline, put } from './shapes.mjs'

const T = '#13585c', TD = '#0d4144', W = '#e0a668', WD = '#c07f3e', WL = '#f3e2cd'
const AR = '&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646;'   // سَنّون — six code points, never drawn
const NN = '&#x646;'
const LAT = 'SNOON'

const G = JSON.parse(fs.readFileSync('glyph-positions.json', 'utf8'))
const P = JSON.parse(fs.readFileSync('ink-profile.json', 'utf8'))

/**
 * Everything in this round is placed off two measured files rather than by eye:
 * `glyph-positions.json` for each letter's box and `ink-profile.json` for the
 * uprights inside a letter — the seen's three teeth are in its right two thirds
 * and its box says nothing about that, which is what put the first attempt's
 * tooth through the middle of the word.
 *
 * Lalezar, from the profile, from the word's right edge:
 *   seen's three teeth   0.5875 · 0.3713 · 0.1275
 *   shadda peak          0.9513
 *   waw                  1.2788
 *   final noon bowl      walls 1.625 and 1.975, dot 1.8125
 */
const LAL = { teeth: [0.5875, 0.3713, 0.1275], bowl: { a: 1.625, b: 1.975, dot: 1.8125 } }

function lock(face, size, { w = 640, h = 250, cx = 320, by = 168 } = {}) {
  const g = G[face]
  const edge = cx + (g.wordWidth * size) / 2
  const L = Object.fromEntries(g.letters.map((l) => [l.label, l]))
  return {
    w, h, cx, by, size, face, L, width: g.wordWidth * size,
    at: (fromRight) => edge - fromRight * size,
    em: (v) => v * size,
    text: (fill, extra = '') =>
      `<text x="${cx}" y="${by}" font-family="${face}" font-size="${size}" fill="${fill}" text-anchor="middle" ${extra}>${AR}</text>`,
  }
}
const svg = (k, body) => `<svg class="lock" viewBox="0 0 ${k.w} ${k.h}">${body}</svg>`

/* ── 01 الجذر — the final noon grows roots and is a molar ─────────────────── *
 * The roots take the word's own ink, not the accent. That is the whole point:
 * the letter has *become* the tooth, the way the kaf becomes the book on the
 * كتاب logo. In a second colour it reads as an ornament parked underneath.     */
function roots(ink) {
  const k = lock('Lalezar', 150)
  const x0 = k.at(LAL.bowl.b), x1 = k.at(LAL.bowl.a)
  const w = x1 - x0
  return svg(k, `${k.text(ink)}
    ${put(ROOTS, x0 + w * 0.06, k.by + k.em(0.2), w * 0.88, k.em(0.32), ink)}`)
}

/* ── 02 السن في السين — one of the seen's own teeth is a real tooth ───────── */
function inSeen(ink, accent) {
  const k = lock('Lalezar', 150)
  const c = k.at(LAL.teeth[1])
  const w = k.em(0.175)
  // Top and height come from the measured upright (-0.4725em to the baseline),
  // so the tooth stands *as* that stroke rather than towering over the word.
  return svg(k, `${k.text(ink)}
    ${put(INCISOR, c - w / 2, k.by - k.em(0.495), w, k.em(0.515), accent)}`)
}

/* ── 03 خط اللثة — the word stands on gums ────────────────────────────────── */
function gums(ink, accent) {
  const k = lock('Baloo', 138)
  const left = k.at(G.Baloo.wordWidth)
  return svg(k, `
    ${gumline(left - 12, k.by - k.em(0.055), k.width + 24, k.em(0.115), accent, 6)}
    ${k.text(ink)}`)
}

/* ── 04 الاسم داخل السن — the name knocked out of a tooth ─────────────────── */
function inTooth(id, ink, accent) {
  const k = lock('Lalezar', 86, { w: 640, h: 330, cx: 320, by: 166 })
  return svg(k, `
    <defs><mask id="${id}">
      <rect width="${k.w}" height="${k.h}" fill="#000"/>
      ${put(MOLAR, 202, 12, 236, 306, '#fff')}
      ${k.text('#000')}
    </mask></defs>
    <rect width="${k.w}" height="${k.h}" fill="${accent}" mask="url(#${id})"/>`)
}

/* ── 05 المرآة — a mouth mirror in the waw's counter ──────────────────────── *
 * Lemonada, because its waw counter is measured at 0.255 x 0.305 em — fifteen
 * times the area of Lalezar's, which is a slit nothing fits in.                */
function mirrorWaw(ink, accent, bg) {
  const k = lock('Lemonada', 118)
  const hole = { x: 2.1225, y: -0.445, w: 0.255, h: 0.305 }
  const cxH = k.at(hole.x + hole.w / 2)
  const cyH = k.by + k.em(hole.y + hole.h / 2)
  return svg(k, `${k.text(ink)}
    ${mirror(cxH, cyH, k.em(hole.w * 0.7), accent, bg)}`)
}

/* ── 06 القوس — the name set along the dental arch ────────────────────────── */
function arch(id, ink, accent) {
  const k = lock('Marhey', 120, { w: 640, h: 280, cx: 320, by: 190 })
  return svg(k, `
    <defs><path id="${id}" d="M96 96 C96 232 544 232 544 96"/></defs>
    <path d="M62 84 C62 268 578 268 578 84" fill="none" stroke="${accent}" stroke-width="15" stroke-linecap="round" opacity=".9"/>
    <text font-family="Marhey" font-size="120" font-weight="700" fill="${ink}" text-anchor="middle">
      <textPath href="#${id}" startOffset="50%">${AR}</textPath></text>`)
}

/* ── 07 الرقعة على اللثة — the calligraphic hand, standing on gums ────────── */
function ruqaaGums(ink, accent) {
  const w = 640, h = 250
  return `<svg class="lock" viewBox="0 0 ${w} ${h}">
    ${gumline(122, 178, 398, 9, accent, 7)}
    <text x="320" y="164" font-family="ArefRuqaa" font-size="132" font-weight="700" fill="${ink}" text-anchor="middle">${AR}</text>
  </svg>`
}

/* The small mark. A logo is not the large version. */
const fsvg = (s, body) => `<svg viewBox="0 0 100 100" width="${s}" height="${s}">${body}</svg>`
const FAV = {
  roots: (s) => fsvg(s, `<path d="M10 16 L10 44 C10 74 90 74 90 44 L90 16 L70 16 L70 44 C70 58 30 58 30 44 L30 16 Z" fill="#fff"/>${put(ROOTS, 12, 56, 76, 34, '#fff')}`),
  tooth: (s) => fsvg(s, put(INCISOR, 20, 5, 60, 90, '#fff')),
  gums: (s) => fsvg(s, `${put(INCISOR, 6, 12, 27, 50, '#fff')}${put(INCISOR, 36, 6, 28, 56, '#fff')}${put(INCISOR, 67, 12, 27, 50, '#fff')}${gumline(0, 62, 100, 9, W, 3)}`),
  molar: (s) => fsvg(s, put(MOLAR, 6, 5, 88, 90, '#fff')),
  mirror: (s) => fsvg(s, `<rect x="44" y="44" width="12" height="50" rx="6" fill="#fff"/>${mirror(50, 34, 29, W, '#fff')}`),
  arch: (s) => fsvg(s, `<path d="M15 20 C15 92 85 92 85 20" fill="none" stroke="#fff" stroke-width="19" stroke-linecap="round"/>
    <path d="M27 58 L34 46 M50 68 L50 54 M73 58 L66 46" stroke="${T}" stroke-width="5" stroke-linecap="round"/>`),
  noon: (s) => fsvg(s, `<text x="50" y="56" font-family="ArefRuqaa" font-size="82" font-weight="700" fill="#fff" text-anchor="middle" dominant-baseline="middle">${NN}</text>`),
}

const C = [
  { n: 'الجذر', en: 'The root', fav: FAV.roots,
    why: 'النون الأخيرة هي الضرس: وعاء النون هو التاج، والجذور تنزل منه بنفس اللون. الحرف نفسه صار السن — ما حطّينا شي جنبه. هاي نفس حركة الكاف بشعار «كتاب» اللي دزيته.',
    big: (r) => roots(r ? '#fff' : TD) },
  { n: 'السن في السين', en: 'A tooth among the seen’s teeth', fav: FAV.tooth,
    why: 'وقفات السين الثلاث اسمها «أسنان» بالخط العربي — وهذا مو صدفة بأسم مثل سَنّون. وحدة منهن صارت سن حقيقي بلون دافئ، والباقي حرف مكتوب ما لمسناه.',
    big: (r) => inSeen(r ? '#fff' : TD, W) },
  { n: 'خط اللثة', en: 'The gum line', fav: FAV.gums,
    why: 'الكلمة واقفة على لثة، فتصير حروفها أسنان واقفة عليها. الابتسامة بشعار ChatGPT كانت طايرة ما تلمس ولا حرف — هاي تلمس الكل، وهذا الفرق.',
    big: (r) => gums(r ? '#fff' : TD, W) },
  { n: 'الاسم داخل السن', en: 'The name inside the tooth', fav: FAV.molar,
    why: 'الاسم محفور داخل شكل السن، نفس شعار CHIPPED TOOTH بالمراجع. هذا الوحيد اللي يشتغل ختم على ورقة العيادة بلون واحد.',
    big: (r) => inTooth(r ? 'm4r' : 'm4l', r ? '#fff' : TD, r ? '#fff' : T) },
  { n: 'المرآة', en: 'The mirror', fav: FAV.mirror,
    why: 'الواو دائرة وذيل، ومرآة الفحص دائرة ويد. حطّينا المرآة بعين الواو نفسها — نفس حركة شريحة الليمون بشعار «ليمون» اللي دزيته.',
    big: (r) => mirrorWaw(r ? '#fff' : TD, W, r ? T : '#fff') },
  { n: 'القوس', en: 'The arch', fav: FAV.arch,
    why: 'الاسم ماشي على قوس الفك. الكلمة نفسها صارت الشكل، مثل شعار «نيل» اللي حروفه تعمل موجة.',
    big: (r) => arch(r ? 'a6r' : 'a6l', r ? '#fff' : TD, W) },
  { n: 'الرقعة على اللثة', en: 'The ruqʿa hand, on gums', fav: FAV.noon,
    why: 'نفس فكرة اللثة بس بخط الرقعة — الخط الثاني اللي عجبك بالجولة الثانية. سجّلناه حتى تختار الطابع: مدوّر وحديث، لو خط عربي كلاسيكي.',
    big: (r) => ruqaaGums(r ? '#fff' : TD, W) },
]

const cards = C.map((c, i) => `
  <section class="card">
    <header><span class="num">${String(i + 1).padStart(2, '0')}</span>
      <span class="ar">${c.n}</span><span class="en">${c.en}</span></header>
    <div class="big">${c.big(false)}</div>
    <div class="rev">${c.big(true)}</div>
    <div class="small">
      <span class="chip">${c.fav(34)}<b>34</b></span>
      <span class="chip">${c.fav(16)}<b>16</b></span>
      <span class="chip ink">${c.fav(34)}<b>ink</b></span>
      <span class="lat">${LAT}</span>
    </div>
    <p class="why">${c.why}</p>
  </section>`).join('')

fs.writeFileSync('sheet4.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#f2f5f5;font-family:'Cairo',system-ui;direction:rtl;padding:26px}
  h1{font-size:20px;margin:0 0 6px;color:${TD}}
  .lede{font-size:13px;color:#5d6f70;margin:0 0 22px;max-width:74ch;line-height:1.9}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px}
  .card{background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.07)}
  header{display:flex;align-items:baseline;gap:9px;padding:13px 18px;border-bottom:1px solid #eceeee}
  .num{font-size:11px;color:#9aa8a8}
  .ar{font-size:15px;font-weight:700;color:${TD}}
  .en{font-size:11px;color:#9aa8a8;direction:ltr}
  .big{padding:16px 18px;display:flex;justify-content:center;align-items:center;min-height:170px}
  .rev{background:${T};padding:16px 18px;display:flex;justify-content:center;align-items:center;min-height:150px}
  .lock{width:100%;max-height:150px}
  .rev .lock{max-height:130px}
  .small{display:flex;align-items:center;gap:16px;padding:12px 18px;border-top:1px solid #eceeee}
  .chip{display:flex;align-items:center;gap:7px;background:${T};border-radius:9px;padding:7px 9px}
  .chip.ink{background:#181818}
  .chip b{font-size:9px;color:rgba(255,255,255,.6);font-weight:400}
  .lat{margin-inline-start:auto;font-size:13px;letter-spacing:.42em;color:${WD};direction:ltr}
  .why{margin:0;padding:12px 18px 17px;font-size:12.5px;line-height:2;color:#4d5d5e;border-top:1px solid #eceeee}
</style>
<h1>سَنّون — الجولة الرابعة</h1>
<p class="lede">هاي الجولة مبنية على الشعارات اللي دزيتها: بكل وحدة منهن شكل مدموج بالاسم نفسه، مو شكل واقف جنبه. الاسم بكل وحدة مكتوب بخط عربي حقيقي — ما رسمنا ولا حرف ولا حركة بيدنا، وهذا بالضبط اللي خلّى شعار ChatGPT يكتب كلمة ما موجودة. المرسوم هو الشكل بس.</p>
<div class="grid">${cards}</div>`)
console.log('ok')
