import fs from 'node:fs'

const T = '#13585c', TD = '#0d4144', W = '#e0a668', WL = '#f3e2cd'
const AR = '&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646;'   // سَنّون
const NN = '&#x646;'                                      // ن
const SH = '&#x651;'                                      // ّ
const LAT = 'SNOON'

// Two copies of the SAME string stacked, the upper one clipped to the band the
// fatha and shadda live in. Colouring the diacritics by splitting the string
// would break the letter joins — Arabic shapes across a span boundary.
const diacritics = (font, size, cut, a = T, b = W) => `
  <span class="dz" style="font-family:'${font}';font-size:${size}px">
    <span style="color:${a}">${AR}</span>
    <span class="ov" style="color:${b};clip-path:inset(0 0 ${cut}% 0)">${AR}</span>
  </span>`

const word = (font, size, color = TD, extra = '') =>
  `<span style="font-family:'${font}';font-size:${size}px;color:${color};${extra}">${AR}</span>`

const lat = (color = W, size = 15, sp = '.44em') =>
  `<span class="lat" style="color:${color};font-size:${size}px;letter-spacing:${sp};text-indent:${sp}">${LAT}</span>`

const C = [
  { n: 'الشدّة الملوّنة', en: 'Coloured diacritics',
    why: 'الفتحة والشدّة بلون دافئ — الحركات هي العلامة، مو شكل مضاف جنب الاسم',
    note: 'The two marks you chose become the brand device. Nothing is added beside the name; the name carries it.',
    big: (c) => diacritics('Lalezar', 92, 62, c ? '#fff' : TD, W),
    fav: (c) => `<span style="font-family:'Lalezar';font-size:26px;color:${W}">${SH}</span>`,
    favBg: T },

  { n: 'اللوح', en: 'The panel',
    why: 'الاسم محفور داخل لوح أخضر — يشتغل على ورقة، على لافتة، وعلى شاشة',
    note: 'Knocked out of a teal panel. The most robust lockup there is: it survives photocopying, a clinic noticeboard and a dark home screen unchanged.',
    big: (c) => `<span class="panel" style="background:${c ? '#fff' : T}">${word('Lalezar', 76, c ? T : '#fff')}</span>`,
    fav: () => `<span style="font-family:'Lalezar';font-size:30px;color:#fff">${NN}</span>`,
    favBg: T },

  { n: 'المهد', en: 'The cradle',
    why: 'الاسم جالس داخل قوس — نفس فكرة وعاء النون، بس تخدم الكلمة بدل ما تقف لوحدها',
    note: 'The bowl idea, demoted from a mark to a support. The word sits in it rather than beside it.',
    big: (c) => `<span class="cradle">${word('Lalezar', 80, c ? '#fff' : TD)}
      <svg viewBox="0 0 240 34" preserveAspectRatio="none"><path d="M6 4 C6 30 234 30 234 4" fill="none" stroke="${W}" stroke-width="9" stroke-linecap="round"/></svg></span>`,
    fav: () => `<svg viewBox="0 0 100 100" width="30" height="30"><path d="M18 34 C18 76 82 76 82 34" fill="none" stroke="${W}" stroke-width="12" stroke-linecap="round"/></svg>`,
    favBg: T },

  { n: 'الاثنان', en: 'The pair',
    why: 'نفس الاسم مكتوب مرّتين، واحدة وراء الثانية وبينهما إزاحة صغيرة — المريض والطالب، نفس الحالة، شخصان',
    note: 'The same word twice, one sand copy set a little behind the teal one. Two people on one case, drawn without drawing anybody. Two full copies of the string, so no letter join is broken.',
    big: (c) => `<svg class="lock" viewBox="0 0 300 120" height="132">
      <text x="143" y="96" font-family="Lalezar" font-size="76" fill="${W}" text-anchor="middle">${AR}</text>
      <text x="157" y="86" font-family="Lalezar" font-size="76" fill="${c ? '#fff' : TD}" text-anchor="middle">${AR}</text></svg>`,
    fav: () => `<svg viewBox="0 0 100 100" width="36" height="36">
      <text x="44" y="76" font-family="Lalezar" font-size="72" fill="${W}" text-anchor="middle">${NN}</text>
      <text x="58" y="66" font-family="Lalezar" font-size="72" fill="#fff" text-anchor="middle">${NN}</text></svg>`,
    favBg: T },

  { n: 'الجسر', en: 'The bridge',
    why: 'الاسم واقف على خط، وبطرفي الخط نقطتان: الطالب والمريض. جسرك نفسه، بس مرسوم تحت الكلمة',
    note: 'Your bridge, as the logo rather than as an illustration: the word stands on a line whose two ends are the two people. One dot teal, one sand — they are not the same person.',
    big: (c) => `<span class="bridge">${word('Lalezar', 78, c ? '#fff' : TD)}
      <svg viewBox="0 0 240 22"><circle cx="8" cy="11" r="7.5" fill="${W}"/><circle cx="232" cy="11" r="7.5" fill="${c ? '#fff' : T}"/><rect x="14" y="7.5" width="212" height="7" rx="3.5" fill="${c ? 'rgba(255,255,255,.5)' : '#b9cbcc'}"/></svg></span>`,
    fav: () => `<svg viewBox="0 0 100 100" width="30" height="30"><circle cx="16" cy="50" r="13" fill="${W}"/><circle cx="84" cy="50" r="13" fill="#fff"/><rect x="26" y="44" width="48" height="12" rx="6" fill="rgba(255,255,255,.55)"/></svg>`,
    favBg: T },

  { n: 'التدرّج', en: 'The gradient',
    why: 'لون واحد يمشي بالكلمة من الأخضر للدافئ — من المريض للطالب، بحرف واحد متّصل',
    note: 'One colour travelling across the word, teal to sand. Painted as a gradient on a single text element, never by cutting the string into two spans — that would break the joins between letters.',
    big: (c) => `<svg class="lock" viewBox="0 0 300 110" height="130">
      <defs><linearGradient id="g${c ? 'd' : 'l'}" x1="1" y1="0" x2="0" y2="0">
        <stop offset="0" stop-color="${c ? '#ffffff' : TD}"/><stop offset=".5" stop-color="${c ? '#ffffff' : TD}"/><stop offset="1" stop-color="${W}"/></linearGradient></defs>
      <text x="150" y="86" font-family="Lemonada" font-size="74" font-weight="600"
        fill="url(#g${c ? 'd' : 'l'})" text-anchor="middle">${AR}</text></svg>`,
    fav: () => `<svg viewBox="0 0 100 100" width="34" height="34"><defs><linearGradient id="gf" x1="1" x2="0">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="${W}"/></linearGradient></defs>
      <text x="50" y="74" font-family="Lemonada" font-size="74" font-weight="600" fill="url(#gf)" text-anchor="middle">${NN}</text></svg>`,
    favBg: T },

  { n: 'الرقعة والمدّة', en: 'Ruq’a, underlined',
    why: 'خطّ الرقعة اللي عجبك، مع مدّة طويلة تحته',
    note: 'The calligraphic hand from 08, given the long sweep underneath that the hand actually wants. Reads as a place rather than an app.',
    big: (c) => `<span class="kash">${word('Aref Ruqaa', 80, c ? '#fff' : TD)}
      <svg viewBox="0 0 240 20"><path d="M14 12 C60 2 190 2 228 12" fill="none" stroke="${W}" stroke-width="7" stroke-linecap="round"/></svg></span>`,
    fav: () => `<span style="font-family:'Aref Ruqaa';font-size:30px;color:#fff">${NN}</span>`,
    favBg: T },

  { n: 'الطاق', en: 'The arch',
    why: 'الاسم داخل طاق مدبّب — عمارة عراقية، مو أيقونة تطبيق',
    note: 'An arch, not a rounded square. It is the one shape that says where this is without a flag or a map, and it holds a calligraphic word far better than a box does.',
    big: (c) => `<span class="arch" style="background:${c ? '#fff' : T}">${word('Aref Ruqaa', 62, c ? T : '#fff')}</span>`,
    fav: () => `<svg viewBox="0 0 100 100" width="30" height="30"><path d="M50 4 C86 4 92 40 92 62 L92 96 L8 96 L8 62 C8 40 14 4 50 4 Z" fill="${W}"/></svg>`,
    favBg: T },

  { n: 'الطابع', en: 'The stamp',
    why: 'دائرة، الاسم بالوسط، والاسم اللاتيني دائر حولها — ختم عيادة',
    note: 'A round stamp. It is the form a clinic already trusts, and it is the only lockup here that carries both names without stacking them.',
    big: (c) => `<svg class="lock" viewBox="0 0 200 200" height="172">
      <defs><path id="r${c ? 'd' : 'l'}" d="M 26,100 A 74,74 0 0 0 174,100" fill="none"/></defs>
      <circle cx="100" cy="100" r="92" fill="none" stroke="${c ? '#fff' : T}" stroke-width="6"/>
      <circle cx="100" cy="100" r="80" fill="none" stroke="${W}" stroke-width="2"/>
      <text x="100" y="104" font-family="Aref Ruqaa" font-size="58" font-weight="700"
        fill="${c ? '#fff' : TD}" text-anchor="middle">${AR}</text>
      <text font-family="IBM Plex Sans Arabic" font-size="17" font-weight="600" letter-spacing="5"
        fill="${W}"><textPath href="#r${c ? 'd' : 'l'}" startOffset="50%" text-anchor="middle">${LAT}</textPath></text>
      </svg>`,
    fav: () => `<svg viewBox="0 0 100 100" width="30" height="30"><circle cx="50" cy="50" r="42" fill="none" stroke="${W}" stroke-width="8"/><circle cx="50" cy="50" r="16" fill="${W}"/></svg>`,
    favBg: T },

  { n: 'المكدّس', en: 'Stacked',
    why: 'الاسمان فوق بعض بخيط بينهما — أوضح شكل لمن يكون الشعار صغير بالرأس',
    note: 'Both names, stacked, with a rule between them. The dullest option on the sheet and the one that will survive being 90px wide in a page header.',
    big: (c) => `<span class="stack">${word('Zain', 76, c ? '#fff' : TD, 'font-weight:700')}
      <i style="background:${W}"></i>${lat(W, 14)}</span>`,
    fav: () => `<span style="font-family:'Zain';font-weight:800;font-size:30px;color:#fff">${NN}</span>`,
    favBg: T },

  { n: 'المضغوط', en: 'Condensed',
    why: 'حروف طويلة وضيّقة — شكل مختلف تماماً عن كل شي فوق',
    note: 'A tall, narrow silhouette. Included because every other option on this sheet is wide, and the shape of the word is the thing you recognise from across a room.',
    big: (c) => `<span class="tall">${word('Katibeh', 104, c ? '#fff' : TD)}${lat(W, 13, '.5em')}</span>`,
    fav: () => `<span style="font-family:'Katibeh';font-size:36px;color:#fff">${NN}</span>`,
    favBg: T },

  { n: 'الرفيع', en: 'Refined',
    why: 'خط أنيق بخطّين رفيعين فوق وتحت — أقرب شي لعيادة خاصة',
    note: 'The most formal register here. Worth seeing because سَنّون has to recruit students as well as reassure patients, and students judge whether a thing looks real.',
    big: (c) => `<span class="fine" style="border-color:${c ? 'rgba(255,255,255,.55)' : '#cfd9d9'}">${word('El Messiri', 70, c ? '#fff' : TD, 'font-weight:700')}</span>`,
    fav: () => `<span style="font-family:'El Messiri';font-weight:700;font-size:30px;color:#fff">${NN}</span>`,
    favBg: T },
]

const card = (c, i) => `
<section class="card">
  <header><span class="num">${String(i + 1).padStart(2, '0')}</span>
    <div><h2>${c.n}</h2><p class="en">${c.en}</p></div>
    <div class="fav" style="background:${c.favBg}">${c.fav(true)}</div>
  </header>
  <p class="why">${c.why}</p>
  <div class="stage light">${c.big(false)}</div>
  <div class="stage dark">${c.big(true)}</div>
  <p class="note">${c.note}</p>
</section>`

const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8">
<link rel="stylesheet" href="./fonts.css">
<style>
*{box-sizing:border-box}
body{margin:0;background:#fbfaf8;color:#16282b;font-family:'IBM Plex Sans Arabic',system-ui;padding:44px 40px 60px}
.head{max-width:1520px;margin:0 auto 30px}
.head h1{font-family:'Cairo';font-size:33px;margin:0 0 8px;color:${TD}}
.head p{margin:0;font-family:'Cairo';color:#5d6b6d;font-size:15px;line-height:1.9;max-width:1050px}
.head .l{direction:ltr;text-align:left;font-size:13px;color:#7c8a8c;margin-top:10px;line-height:1.7}
.grid{max-width:1520px;margin:0 auto;display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.card{background:#fff;border:1px solid #e6e3dd;border-radius:18px;padding:22px 24px 20px}
.card header{display:flex;gap:13px;align-items:center;margin-bottom:7px}
.num{font:13px ui-monospace,monospace;color:#fff;background:${T};border-radius:7px;padding:4px 8px;direction:ltr;flex:none}
.card h2{margin:0;font-family:'Cairo';font-size:22px;color:${TD};font-weight:700}
.en{margin:1px 0 0;font-size:12px;color:#8b9799;direction:ltr;text-align:left;letter-spacing:.07em;text-transform:uppercase}
.fav{margin-inline-start:auto;width:46px;height:46px;border-radius:11px;display:flex;align-items:center;justify-content:center;flex:none}
.why{margin:0 0 15px;font-family:'Cairo';font-size:14px;line-height:1.95;color:#4a5b5d}
.stage{height:190px;display:flex;align-items:center;justify-content:center;border-radius:13px;padding:14px 26px}
.light{background:#f7f5f1}
.dark{background:${T};margin-top:10px}
.note{margin:13px 0 0;font-size:12.5px;line-height:1.75;color:#6d7b7d;direction:ltr;text-align:left;border-top:1px solid #eeebe5;padding-top:11px}
.lock{display:block;overflow:visible}
.lat{direction:ltr;font-family:'IBM Plex Sans Arabic';font-weight:600;display:block;text-align:center}

/* per-concept lockups */
.dz{position:relative;display:inline-block;line-height:1.5}
.dz .ov{position:absolute;inset:0}
.panel{display:inline-block;padding:14px 34px 22px;border-radius:16px;line-height:1.35}
.cradle,.kash,.bridge{display:inline-block;text-align:center;line-height:1.3}
.cradle svg,.kash svg,.bridge svg{display:block;width:100%;height:30px;margin-top:-6px}
.kash svg{height:18px;margin-top:-2px}
.bridge svg{height:20px;margin-top:2px}
.canopy{display:inline-block;text-align:center;line-height:1}
.canopy b{display:block;font-size:96px;line-height:.5;margin-bottom:26px}
.arch{display:inline-block;padding:30px 40px 20px;border-start-start-radius:90px;border-start-end-radius:90px;border-end-start-radius:12px;border-end-end-radius:12px;line-height:1.6}
.stamp{width:186px;height:186px;border-radius:50%;border:5px solid;display:flex;flex-direction:column;align-items:center;justify-content:center;line-height:1.5}
.stamp em{font-style:normal;direction:ltr;font-size:12px;letter-spacing:.34em;text-indent:.34em;font-weight:600;margin-top:2px}
.stack{display:inline-block;text-align:center;line-height:1.4}
.stack i{display:block;height:3px;width:62%;margin:6px auto 7px;border-radius:2px}
.tall{display:inline-block;text-align:center;line-height:1.05}
.tall .lat{margin-top:12px}
.fine{display:inline-block;padding:12px 30px;border-top:2px solid;border-bottom:2px solid;line-height:1.55}
</style></head><body>
<div class="head">
  <h1>&#x633;&#x64E;&#x646;&#x651;&#x648;&#x646; &#x2014; &#x627;&#x644;&#x62C;&#x648;&#x644;&#x629; &#x627;&#x644;&#x62B;&#x627;&#x644;&#x62B;&#x629;: &#x627;&#x644;&#x627;&#x633;&#x645; &#x647;&#x648; &#x627;&#x644;&#x634;&#x639;&#x627;&#x631;</h1>
  <p>&#x631;&#x641;&#x636;&#x62A; &#x633;&#x62A;&#x62A;&#x639;&#x634;&#x631; &#x639;&#x644;&#x627;&#x645;&#x629; &#x645;&#x631;&#x633;&#x648;&#x645;&#x629;&#x60C; &#x648;&#x639;&#x62C;&#x628;&#x643; &#x634;&#x64A;&#x621;&#x627;&#x646; &#x641;&#x642;&#x637;: &#x62E;&#x637;&#x651; &#x631;&#x642;&#x645; ٢ &#x648;&#x62E;&#x637;&#x651; &#x631;&#x642;&#x645; ٨.
  &#x647;&#x630;&#x64A; &#x627;&#x644;&#x62C;&#x648;&#x644;&#x629; &#x643;&#x644;&#x651;&#x647;&#x627; &#x639;&#x644;&#x649; &#x627;&#x644;&#x643;&#x62A;&#x627;&#x628;&#x629; &#x646;&#x641;&#x633;&#x647;&#x627; &#x2014; &#x645;&#x627; &#x628;&#x64A;&#x647;&#x627; &#x639;&#x644;&#x627;&#x645;&#x629; &#x645;&#x62E;&#x62A;&#x631;&#x639;&#x629; &#x62A;&#x642;&#x641; &#x62C;&#x646;&#x628; &#x627;&#x644;&#x627;&#x633;&#x645;&#x60C; &#x648;&#x643;&#x644;&#x651; &#x627;&#x62A;&#x651;&#x62C;&#x627;&#x647; &#x645;&#x639;&#x631;&#x648;&#x636; &#x639;&#x644;&#x649; &#x627;&#x644;&#x623;&#x628;&#x64A;&#x636; &#x648;&#x639;&#x644;&#x649; &#x627;&#x644;&#x623;&#x62E;&#x636;&#x631;&#x60C; &#x648;&#x645;&#x639;&#x627;&#x647; &#x623;&#x64A;&#x642;&#x648;&#x646;&#x629; &#x635;&#x63A;&#x64A;&#x631;&#x629; &#x645;&#x634;&#x62A;&#x642;&#x651;&#x629; &#x645;&#x646;&#x647; &#x628;&#x627;&#x644;&#x632;&#x627;&#x648;&#x64A;&#x629;.</p>
  <p class="l">Twelve wordmark-led directions. Nothing is invented beside the name &mdash; every mark here is derived from it. 01&ndash;05 are the heavy display face from 02; 07&ndash;09 the calligraphic hand from 08; 06 and 10&ndash;12 are new registers, for contrast. The small square at the top corner of each card is that direction&rsquo;s favicon.</p>
</div>
<div class="grid">${C.map(card).join('')}</div>
</body></html>`
fs.writeFileSync('sheet3.html', html)
console.log('ok', C.length)
