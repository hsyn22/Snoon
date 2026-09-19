import fs from 'node:fs'
import { WORD, letters, root, twoRoots, gum, seenUprights, bowl } from './marks5.mjs'

const INK = '#13585c', CREAM = '#f6f1e8', DARK = '#12201f'
const W = WORD.advance                       // 2144
const VB = (x, y, w, h) => `${x} ${y} ${w} ${h}`

/* ── 01 السين أسنان — the seen's three uprights grow roots ────────────────── *
 * سِنّ is a tooth and the seen's uprights are called أسنان in Arabic type. The
 * name's first letter is already three teeth; this gives them roots, in the
 * word's own ink, so the letter *is* the teeth rather than carrying a picture
 * of one.                                                                     */
const seenRoots = (fill) => `
  <g fill="${fill}">
    ${letters(fill)}
    <path d="${root(seenUprights[0], 120, -40, 250)}"/>
    <path d="${root(seenUprights[1], 116, -40, 285)}"/>
    <path d="${root(seenUprights[2], 168, -40, 250)}"/>
  </g>`

/* ── 02 النون ضرس — the final noon is a molar ─────────────────────────────── *
 * The bowl is already a crown. Two roots welded to its floor finish it, and the
 * noon's own dot stays exactly where the font puts it.                        */
const noonMolar = (fill) => `
  <g fill="${fill}">
    ${letters(fill)}
    <path d="${twoRoots(bowl.a + 10, bowl.b + 10, bowl.floor - 120, 420)}"/>
  </g>`

/* ── 03 الكلمة باللثة — the word is set into gums ─────────────────────────── *
 * Welded to the word's own baseline in one ink, so the letters stand *in* the
 * gum rather than on a bar laid underneath. The rule this round earns: add
 * below the baseline, never touch a letter's own skeleton.                    */
const inGum = (fill) => `
  <g fill="${fill}">
    <path d="${gum(-60, WORD.advance + 60, -30, 120, 7)}"/>
    ${letters(fill)}
  </g>`

/* ── 04 الكلمة داخل السن — the name inside a tooth ────────────────────────── *
 * CHIPPED TOOTH. The name knocked out of one solid shape, which is the only
 * thing on any sheet so far that works as a stamp on a clinic form.           */
const inTooth = (id, fill) => {
  const T = 'M50 4 C23 4 6 19 6 40 C6 53 11 62 15 74 C19 88 23 97 31 97 C39 97 41 87 43 73 ' +
            'C44 63 46 57 50 57 C54 57 56 63 57 73 C59 87 61 97 69 97 C77 97 81 88 85 74 ' +
            'C89 62 94 53 94 40 C94 19 77 4 50 4 Z'
  const place = 'translate(-180 -2320) scale(25 31)'
  return `
    <defs><mask id="${id}" maskUnits="userSpaceOnUse" x="-400" y="-2500" width="3000" height="3700">
      <rect x="-400" y="-2500" width="3000" height="3700" fill="#fff"/>
      <g transform="translate(168 -1130) scale(0.84)">${letters('#000')}</g>
    </mask></defs>
    <g mask="url(#${id})"><path d="${T}" fill="${fill}" transform="${place}"/></g>`
}

const D = [
  { n: 'النون ضرس', en: 'The final noon is a molar', mark: noonMolar,
    pad: [-140, -820, W + 280, 1420],
    why: 'وعاء النون أصلاً تاج ضرس — جذرين ملحومين بقاعه يكمّلونه، ونقطة النون تبقى بمحلها اللي حطّها الخط. شكل واحد وحبر واحد، نفس حركة الكاف بشعار «كتاب». وهو الترشيح: الحرف ما انمسّ، والزيادة كلها تحت السطر حيث ما يقعد أي حرف.' },
  { n: 'السين أسنان', en: 'The seen is teeth', mark: seenRoots,
    pad: [-140, -820, W + 280, 1260],
    why: 'سِنّ يعني سن، ووقفات السين الثلاث اسمها «أسنان» بالخط العربي — يعني أول حرف بالاسم أصلاً ثلاث أسنان. نزّلنا إلهن جذور بنفس الحبر، قصيرة وعريضة مو مدبّبة.' },
  { n: 'الكلمة باللثة', en: 'The word set in gums', mark: inGum,
    pad: [-160, -820, W + 320, 1180],
    why: 'اللثة ملحومة بسطر الكلمة نفسه، مو شريط محطوط تحتها — فالحروف واقفة جوّاها. هاي أهدأ وحدة بالورقة، وتشتغل حتى بحجم صغير.' },
  { n: 'الاسم داخل السن', en: 'The name inside the tooth', mark: (f) => inTooth('t5', f),
    pad: [-260, -2400, 2760, 3400],
    why: 'نفس CHIPPED TOOTH. الاسم محفور من شكل واحد صلد — وهذا الوحيد اللي يشتغل ختم بلون واحد على ورقة العيادة، وأيقونة تطبيق.' },
]

const card = (d) => {
  const vb = VB(...d.pad)
  return `<section class="card">
    <header><span class="ar">${d.n}</span><span class="en">${d.en}</span></header>
    <div class="cream"><svg viewBox="${vb}">${d.mark(DARK)}</svg></div>
    <div class="dark"><svg viewBox="${vb}">${d.mark(CREAM)}</svg></div>
    <div class="teal"><svg viewBox="${vb}">${d.mark(CREAM)}</svg></div>
    <p class="why">${d.why}</p>
  </section>`
}

fs.writeFileSync('sheet5.html', `<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}
  h1{font-size:20px;margin:0 0 6px;color:${DARK}}
  .lede{font-size:13px;color:#5e5a52;margin:0 0 22px;max-width:76ch;line-height:1.95}
  .grid{display:grid;grid-template-columns:repeat(2,1fr);gap:22px}
  .card{background:#fff;border-radius:18px;overflow:hidden}
  header{display:flex;align-items:baseline;gap:10px;padding:14px 20px;border-bottom:1px solid #eee}
  .ar{font-size:16px;font-weight:700;color:${DARK}}
  .en{font-size:11px;color:#a8a49c;direction:ltr}
  .cream,.dark,.teal{display:flex;align-items:center;justify-content:center;padding:26px 30px}
  .cream{background:${CREAM}}
  .dark{background:${DARK}}
  .teal{background:${INK}}
  svg{width:100%;max-height:190px}
  .dark svg,.teal svg{max-height:150px}
  .why{margin:0;padding:14px 20px 18px;font-size:12.5px;line-height:2;color:#4d5d5e;border-top:1px solid #eee}
</style>
<h1>سَنّون — الجولة الخامسة</h1>
<p class="lede">هذي المرّة الشكل والحرف شكل واحد بحبر واحد، مثل كل الشعارات اللي دزيتها: الكاف هي الكتاب، الألف هي المقص. صار هذا ممكن لأن الحروف هسه مستخرجة من ملف الخط نفسه بمحرّك التشكيل، مو نص مكتوب — فأگدر ألحم شكل بحرف. وباقي الأمان: سكربت يقارن الحروف المستخرجة بالنص الحي بكسل بكسل ويفشل إذا اختلفوا.</p>
<div class="grid">${D.map(card).join('')}</div>`)
console.log('ok')
