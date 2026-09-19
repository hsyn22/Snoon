import fs from 'node:fs'
import { INCISOR, MOLAR, ROOTS, gumline, put } from './shapes.mjs'

const T = '#13585c', TD = '#0d4144', W = '#e0a668', BG = '#fafbfb', MUT = '#5d6f70', BD = '#e4e9e9'
const AR = '&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646;'
const G = JSON.parse(fs.readFileSync('glyph-positions.json', 'utf8'))
const BOWL = { a: 1.625, b: 1.975 }

/** 01 الجذر, at an arbitrary size — the header needs it at 26px, the hero at 92. */
function rootsMark(size, ink) {
  const g = G.Lalezar
  const w = g.wordWidth * size, by = size * 0.78, pad = size * 0.12
  const edge = pad + w
  const x0 = edge - BOWL.b * size, x1 = edge - BOWL.a * size
  const bw = x1 - x0
  const h = by + size * 0.56
  return `<svg viewBox="0 0 ${w + pad * 2} ${h}" height="${size * 1.28}" role="img" aria-label="سنون">
    <text x="${pad + w / 2}" y="${by}" font-family="Lalezar" font-size="${size}" fill="${ink}" text-anchor="middle">${AR}</text>
    ${put(ROOTS, x0 + bw * 0.06, by + size * 0.2, bw * 0.88, size * 0.32, ink)}
  </svg>`
}

/** 04 الاسم داخل السن, at an arbitrary size. */
function toothMark(id, size, ink) {
  const g = G.Lalezar
  const fs_ = size * 0.62
  const w = size * 1.02, h = size * 1.32
  return `<svg viewBox="0 0 ${w} ${h}" height="${size * 1.32}" role="img" aria-label="سنون">
    <defs><mask id="${id}">
      <rect width="${w}" height="${h}" fill="#000"/>
      ${put(MOLAR, w * 0.02, h * 0.02, w * 0.96, h * 0.96, '#fff')}
      <text x="${w / 2}" y="${h * 0.5}" font-family="Lalezar" font-size="${fs_}" fill="#000" text-anchor="middle">${AR}</text>
    </mask></defs>
    <rect width="${w}" height="${h}" fill="${ink}" mask="url(#${id})"/>
  </svg>`
}

const header = (mark) => `
  <div class="win">
    <div class="hdr">${mark}<span class="hbtn">دخول الطلبة</span></div>
    <div class="hero">
      <span class="eyebrow">منصة سنون</span>
      <h2>نوصّل بين المراجع وطالب طب الأسنان</h2>
      <p>العلاج يكون في عيادة الجامعة وتحت إشراف الأساتذة. منصة سنون توصّل بس — ما تقدّم علاج وما توظّف أحد.</p>
      <div class="cta"><span class="p">قدّم حالة</span><span class="s">شوف الحالات</span></div>
    </div>
  </div>`

const phone = (icon, label) => `
  <div class="phone"><div class="ic">${icon}</div><b>${label}</b></div>`

const DIRS = [
  { n: '01 الجذر', hdr: rootsMark(26, T), hero: rootsMark(64, TD),
    icon: `<svg viewBox="0 0 100 100"><path d="M10 16 L10 44 C10 74 90 74 90 44 L90 16 L70 16 L70 44 C70 58 30 58 30 44 L30 16 Z" fill="#fff"/>${put(ROOTS, 12, 56, 76, 34, '#fff')}</svg>` },
  { n: '04 الاسم داخل السن', hdr: toothMark('h4', 30, T), hero: toothMark('b4', 96, TD),
    icon: `<svg viewBox="0 0 100 100">${put(MOLAR, 6, 5, 88, 90, '#fff')}</svg>` },
]

fs.writeFileSync('insitu.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#eef2f2;font-family:'Cairo',system-ui;direction:rtl;padding:26px}
  h1{font-size:19px;margin:0 0 4px;color:${TD}}
  .lede{font-size:12.5px;color:${MUT};margin:0 0 20px;line-height:1.9;max-width:74ch}
  .row{display:grid;grid-template-columns:1fr 1fr;gap:22px}
  .col h3{font-size:13px;color:${TD};margin:0 0 9px}
  .win{background:${BG};border:1px solid ${BD};border-radius:14px;overflow:hidden}
  .hdr{display:flex;align-items:center;justify-content:space-between;padding:13px 16px;border-bottom:1px solid ${BD};background:#fff}
  .hbtn{font-size:12px;color:${T};border:1px solid ${BD};border-radius:8px;padding:7px 11px}
  .hero{padding:26px 18px 28px}
  .eyebrow{display:inline-block;font-size:11px;color:#8a5f2e;background:#fbf0e2;border-radius:99px;padding:4px 10px}
  .hero h2{font-size:23px;line-height:1.55;color:${TD};margin:11px 0 8px}
  .hero p{font-size:12.5px;line-height:2;color:${MUT};margin:0 0 16px}
  .cta{display:flex;gap:9px}
  .cta .p{background:${T};color:#fff;font-size:12.5px;border-radius:9px;padding:9px 15px}
  .cta .s{border:1px solid ${BD};color:${T};font-size:12.5px;border-radius:9px;padding:9px 15px}
  .icons{display:flex;gap:16px;margin-top:14px;background:#22323a;border-radius:14px;padding:16px}
  .phone{text-align:center}
  .ic{width:56px;height:56px;border-radius:14px;background:${T};display:flex;align-items:center;justify-content:center;padding:9px}
  .ic svg{width:100%;height:100%}
  .phone b{display:block;font-size:9.5px;color:#cfd8d8;font-weight:400;margin-top:6px}
  .ic.sm{width:30px;height:30px;border-radius:8px;padding:5px}
  .ic.xs{width:18px;height:18px;border-radius:5px;padding:3px}
</style>
<h1>الاتجاهان الأقوى — شلون يطلعون بالموقع نفسه</h1>
<p class="lede">هاي مو الموقع الحقيقي، هاي محاكاة بنفس الألوان والخط والمقاسات — حتى تشوف الشعار بالحجم اللي راح يشوفه الناس بيه فعلاً، مو بس كبير بالوسط. تحت كل واحد أيقونة التطبيق بثلاث مقاسات.</p>
<div class="row">
  ${DIRS.map((d) => `<div class="col"><h3>${d.n}</h3>
    ${header(d.hdr)}
    <div class="icons">
      ${phone(d.icon, 'أيقونة 56')}
      <div class="phone"><div class="ic sm">${d.icon}</div><b>30</b></div>
      <div class="phone"><div class="ic xs">${d.icon}</div><b>18</b></div>
    </div>
  </div>`).join('')}
</div>`)
console.log('ok')
