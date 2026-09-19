"""
Round nine — the word laid along a shape, the way نجمة is laid along its star.

Only the Arabic word. No منصة, no SNOON: Haider's instruction, and it is the
right one — every reference on his sheet is one word.
"""
import math
import outline, warp, along

CREAM, DARK, TEAL = '#f6f1e8', '#12201f', '#13585c'
AR = 'سَنّون'

CONTOURS, ADV = outline.word_contours('fonts/ttf/Lalezar-400.ttf', 400, AR)
XS = [p[0] for c in CONTOURS for p in c]
YS = [p[1] for c in CONTOURS for p in c]
BOX = (min(XS), min(YS), max(XS), max(YS))
WORDLEN = BOX[2] - BOX[0]


def laid(spine_fn, thick, reverse=False, flip=False, closed=True, span=1.0, tighten=1.0):
    """Scale the spine so the word covers `span` of it, then lay the word on it."""
    probe = spine_fn(1000.0)
    _, plen = along.resample(probe, closed=closed)
    scale = 1000.0 * (WORDLEN / span) / plen * tighten
    spine = spine_fn(scale)
    f = along.follow(spine, BOX, thick=thick, reverse=reverse, flip=flip,
                     closed=closed, span=span)
    return warp.apply(CONTOURS, f)


def bbox(cs):
    xs = [p[0] for c in cs for p in c]
    ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def render(cs, fill, h=200, weld=0):
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    p = max(60, weld + 40)
    vb = f"{x0-p} {y0-p} {x1-x0+p*2} {y1-y0+p*2}"
    stroke = (f' stroke="{fill}" stroke-width="{weld*2}" stroke-linejoin="round"'
              f' stroke-linecap="round"') if weld else ''
    return f'<svg viewBox="{vb}" style="max-height:{h}px"><path d="{d}" fill="{fill}"{stroke}/></svg>'


VARIANTS = [
    ('سن أمامي', 'incisor', dict(thick=0.34), True),
    ('سن أمامي — أعرض', 'incisor', dict(thick=0.50), True),
    ('سن أمامي — بالعكس', 'incisor', dict(thick=0.34, reverse=True), True),
    ('ضرس', 'molar', dict(thick=0.34), True),
    ('ضرس — أعرض', 'molar', dict(thick=0.50), True),
    ('ضرس — بالعكس', 'molar', dict(thick=0.34, reverse=True), True),
    ('قوس الفك', 'arch', dict(thick=0.42, closed=False), False),
    ('قوس الفك — أعرض', 'arch', dict(thick=0.62, closed=False), False),
    ('ابتسامة', 'smile', dict(thick=0.55, closed=False), False),
    ('شفايف', 'lens', dict(thick=0.34), True),
    ('شفايف — أعرض', 'lens', dict(thick=0.48), True),
    ('قطرة', 'drop', dict(thick=0.34), True),
    ('دائرة', 'ring', dict(thick=0.34), True),
    ('دائرة — أعرض', 'ring', dict(thick=0.52), True),
]

cards = []
for title, key, kw, closed in VARIANTS:
    kw = dict(kw)
    kw.setdefault('closed', closed)
    cs = laid(along.SPINES[key], **kw)
    cards.append(f'''<section class="card">
      <header><span class="ar">{title}</span></header>
      <div class="cream">{render(cs, DARK)}</div>
      <div class="teal">{render(cs, CREAM, h=170)}</div>
      <div class="small">{render(cs, TEAL, h=46)}{render(cs, TEAL, h=28)}{render(cs, TEAL, h=18)}</div>
    </section>''')

html = f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}}
  h1{{font-size:21px;margin:0 0 6px;color:{DARK}}}
  .lede{{font-size:13px;color:#5e5a52;margin:0 0 22px;max-width:80ch;line-height:1.95}}
  .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}}
  .card{{background:#fff;border-radius:18px;overflow:hidden}}
  header{{padding:12px 16px;border-bottom:1px solid #eee}}
  .ar{{font-size:13.5px;font-weight:700;color:{DARK}}}
  .cream,.teal{{display:flex;align-items:center;justify-content:center;padding:20px}}
  .cream{{background:{CREAM}}} .teal{{background:{TEAL}}}
  .small{{display:flex;align-items:flex-end;justify-content:center;gap:18px;padding:14px;border-top:1px solid #eee}}
  svg{{width:auto;max-width:100%}}
</style>
<h1>سَنّون — الجولة التاسعة: الكلمة ترسم الشكل</h1>
<p class="lede">هاي حركة «نجمة»: الحروف مو مكتوبة على منحني — الكلمة الموصولة <b>هي</b> حدود الشكل، وتقراها وانت تدور وياها. الكلمة العربية بس، بدون «منصة» وبدون SNOON. ومسحوبة ومضغوطة بالارتفاع حتى تلف حول الشكل، مثل ما گلت.</p>
<div class="grid">{''.join(cards)}</div>'''
open('explore.html', 'w').write(html)
print('ok', len(cards))
