import fs from 'node:fs'
import { WORD, letters, twoRoots, bowl } from './marks5.mjs'

const INK = '#13585c', CREAM = '#f6f1e8', DARK = '#12201f', WARM = '#e0a668'
const W = WORD.advance
const NOON = WORD.glyphs.find((g) => g.glyph === 'uni0646')

/** The mark: the name, with the final noon finished into a molar. */
export const mark = (fill) => `<g fill="${fill}">
  ${letters(fill)}
  <path d="${twoRoots(bowl.a + 10, bowl.b + 10, bowl.floor - 120, 430)}"/>
</g>`

/** The icon: the same letter alone, still a noon and still a molar. */
export const icon = (fill) => `<g fill="${fill}">
  <path d="${NOON.d}"/>
  <path d="${twoRoots(bowl.a + 10, bowl.b + 10, bowl.floor - 120, 430)}"/>
</g>`

const MARK_VB = `-140 -820 ${W + 280} 1500`
const ICON_VB = '0 -600 670 1260'

const box = (cls, vb, body, h) =>
  `<div class="${cls}"><svg viewBox="${vb}" style="max-height:${h}px">${body}</svg></div>`

fs.writeFileSync('chosen.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}
  h1{font-size:21px;margin:0 0 6px;color:${DARK}}
  .lede{font-size:13px;color:#5e5a52;margin:0 0 20px;max-width:78ch;line-height:1.95}
  h2{font-size:13px;color:#6b665d;margin:22px 0 9px;font-weight:700}
  .card{background:#fff;border-radius:18px;overflow:hidden}
  .cream,.dark,.teal{display:flex;align-items:center;justify-content:center;padding:30px}
  .cream{background:${CREAM}}.dark{background:${DARK}}.teal{background:${INK}}
  svg{width:100%}
  .row{display:grid;grid-template-columns:2fr 1fr;gap:20px}
  .sizes{display:flex;align-items:flex-end;gap:26px;background:#fff;border-radius:18px;padding:22px 26px}
  .sz{text-align:center}.sz b{display:block;font-size:10px;color:#a8a49c;font-weight:400;margin-top:7px}
  .app{display:flex;gap:18px;background:#22323a;border-radius:18px;padding:20px;align-items:flex-end}
  .tile{background:${INK};border-radius:22%;display:flex;align-items:center;justify-content:center;padding:14%}
  .t56{width:64px;height:64px}.t32{width:32px;height:32px;border-radius:7px;padding:5px}
  .t16{width:16px;height:16px;border-radius:4px;padding:2px}
  .app .sz b{color:#cfd8d8}
  .site{background:#fafbfb;border:1px solid #e4e9e9;border-radius:16px;overflow:hidden;margin-top:10px}
  .hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px;border-bottom:1px solid #e4e9e9;background:#fff}
  .hdr svg{width:auto;height:30px}
  .hbtn{font-size:12px;color:${INK};border:1px solid #e4e9e9;border-radius:8px;padding:8px 12px}
  .hero{padding:28px 20px 30px}
  .eyebrow{display:inline-block;font-size:11px;color:#8a5f2e;background:#fbf0e2;border-radius:99px;padding:4px 11px}
  .hero h3{font-size:24px;line-height:1.55;color:${DARK};margin:12px 0 8px}
  .hero p{font-size:12.5px;line-height:2;color:#5d6f70;margin:0 0 17px}
  .cta{display:flex;gap:9px}
  .cta .p{background:${INK};color:#fff;font-size:12.5px;border-radius:9px;padding:10px 16px}
  .cta .s{border:1px solid #e4e9e9;color:${INK};font-size:12.5px;border-radius:9px;padding:10px 16px}
  .stamp{background:#fff;border-radius:18px;padding:22px;display:flex;gap:22px;align-items:center}
  .stamp .ring{border:5px solid ${DARK};border-radius:50%;width:132px;height:132px;display:flex;align-items:center;justify-content:center;padding:20px}
</style>
<h1>النون ضرس — الاتجاه المرشّح</h1>
<p class="lede">وعاء النون الأخيرة أصلاً تاج ضرس، وجذرين ملحومين بقاعه يكمّلونه. الحرف نفسه ما انمسّ — النقطة بمحلها والشكل بحاله — وكل الزيادة تحت السطر، حيث ما يقعد أي حرف عربي. فتقرا الاسم صح أول شي، وبعدين تشوف الضرس. شكل واحد، حبر واحد، مثل ما الكاف هي الكتاب بشعار «كتاب».</p>

<div class="row">
  <div class="card">
    ${box('cream', MARK_VB, mark(DARK), 200)}
    ${box('dark', MARK_VB, mark(CREAM), 160)}
    ${box('teal', MARK_VB, mark(CREAM), 160)}
  </div>
  <div>
    <div class="card">
      ${box('cream', ICON_VB, icon(DARK), 190)}
      ${box('teal', ICON_VB, icon(CREAM), 150)}
    </div>
  </div>
</div>

<h2>الشعار بالمقاسات اللي ينشاف بيها فعلاً</h2>
<div class="sizes">
  ${[92, 56, 34, 22, 15].map((h) => `<div class="sz"><svg viewBox="${MARK_VB}" style="height:${h}px;width:auto">${mark(INK)}</svg><b>${h}px</b></div>`).join('')}
</div>

<h2>أيقونة التطبيق، وختم العيادة</h2>
<div class="row">
  <div class="app">
    ${[['t56', 'أيقونة'], ['t32', '32'], ['t16', '16']].map(([c, l]) =>
      `<div class="sz"><div class="tile ${c}"><svg viewBox="${ICON_VB}">${icon(CREAM)}</svg></div><b>${l}</b></div>`).join('')}
  </div>
  <div class="stamp">
    <div class="ring"><svg viewBox="${ICON_VB}">${icon(DARK)}</svg></div>
    <svg viewBox="${MARK_VB}" style="height:54px;width:auto">${mark(DARK)}</svg>
  </div>
</div>

<h2>بالموقع</h2>
<div class="site">
  <div class="hdr"><svg viewBox="${MARK_VB}">${mark(INK)}</svg><span class="hbtn">دخول الطلبة</span></div>
  <div class="hero">
    <span class="eyebrow">منصة سنون</span>
    <h3>نوصّل بين المراجع وطالب طب الأسنان</h3>
    <p>العلاج يكون في عيادة الجامعة وتحت إشراف الأساتذة. منصة سنون توصّل بس — ما تقدّم علاج وما توظّف أحد.</p>
    <div class="cta"><span class="p">قدّم حالة</span><span class="s">شوف الحالات</span></div>
  </div>
</div>`)
console.log('ok')
