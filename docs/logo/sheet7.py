"""
Round seven — the silhouette is what the letters, thickened, add up to.

Round six bent the word and it still read as curved text, because a word has
gaps in it and gaps mean there is no single mass to have a boundary. CHIPPED
TOOTH does not have that problem: its letters are packed until they make one
solid, and the outline of that solid is the tooth.

So: thicken the letterforms until neighbours touch and the word becomes one
mass, then cut the name back out of it. The outer boundary is then made
entirely by the arrangement of the letters — nothing is drawn — and bending the
word before thickening it decides what that boundary is shaped like.

The thickening is a stroke of the word's own path, which is a dilation by a
disc: exactly the operation that closes the gaps without moving a letter.
"""
import math
import outline
import warp

CREAM, DARK, TEAL = '#f6f1e8', '#12201f', '#13585c'
CONTOURS, ADV = outline.word_contours('fonts/ttf/Lalezar-400.ttf', 400)


def shape(radius=None, down=True):
    if radius is None:
        return CONTOURS
    return warp.apply(CONTOURS, warp.bend(radius, ADV / 2, down))


def bbox(cs):
    xs = [p[0] for c in cs for p in c]
    ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def mark(cs, grow, ink, knock, h=210, pad=None):
    """The thickened mass, with the name cut back out of it."""
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    pad = pad if pad is not None else grow + 60
    vb = f"{x0 - pad} {y0 - pad} {x1 - x0 + pad * 2} {y1 - y0 + pad * 2}"
    return (f'<svg viewBox="{vb}" style="max-height:{h}px">'
            f'<path d="{d}" fill="{ink}" stroke="{ink}" stroke-width="{grow * 2}"'
            f' stroke-linejoin="round" stroke-linecap="round"/>'
            f'<path d="{d}" fill="{knock}"/></svg>')


def solid(cs, grow, ink, h=210):
    """The same mass with nothing cut out — what shape does the word make?"""
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    pad = grow + 60
    vb = f"{x0 - pad} {y0 - pad} {x1 - x0 + pad * 2} {y1 - y0 + pad * 2}"
    return (f'<svg viewBox="{vb}" style="max-height:{h}px">'
            f'<path d="{d}" fill="{ink}" stroke="{ink}" stroke-width="{grow * 2}"'
            f' stroke-linejoin="round" stroke-linecap="round"/></svg>')


def card(title, note, cs, grow):
    return f'''<section class="card">
      <header><span class="ar">{title}</span></header>
      <div class="cream">{mark(cs, grow, DARK, CREAM)}</div>
      <div class="teal">{mark(cs, grow, CREAM, TEAL, h=170)}</div>
      <div class="sil">{solid(cs, grow, '#b9b3a6', h=100)}</div>
      <div class="small">{mark(cs, grow, TEAL, '#fff', h=40)}{mark(cs, grow, TEAL, '#fff', h=25)}{mark(cs, grow, TEAL, '#fff', h=16)}</div>
      <p class="why">{note}</p>
    </section>'''


half = ADV / math.pi
cards = []
for label, r, down, grow in [
    ('مستقيمة — لوح', None, True, 60),
    ('مستقيمة — لوح سميك', None, True, 105),
    ('قوس 117°', 1050, True, 95),
    ('قوس 150°', 820, True, 95),
    ('القوس الكامل 180°', round(half), True, 95),
    ('حدوة 205°', 600, True, 95),
    ('حدوة ضيّقة 236°', 520, True, 105),
    ('ابتسامة 117°', 1050, False, 95),
    ('ابتسامة عميقة 180°', round(half), False, 105),
]:
    cs = shape(r, down)
    deg = '' if r is None else f' — {round(ADV / r * 180 / math.pi)}°'
    cards.append(card(label, 'الشريط الرمادي تحت هو الكتلة لحالها: هذا الشكل اللي تعمله الحروف، بدون ما نرسم ولا خط.', cs, grow))

html = f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}}
  h1{{font-size:21px;margin:0 0 6px;color:{DARK}}}
  .lede{{font-size:13px;color:#5e5a52;margin:0 0 22px;max-width:80ch;line-height:1.95}}
  .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}}
  .card{{background:#fff;border-radius:18px;overflow:hidden}}
  header{{padding:13px 18px;border-bottom:1px solid #eee}}
  .ar{{font-size:14px;font-weight:700;color:{DARK}}}
  .cream,.teal,.sil{{display:flex;align-items:center;justify-content:center;padding:22px}}
  .cream{{background:{CREAM}}} .teal{{background:{TEAL}}} .sil{{background:#f4f2ee;border-top:1px solid #eee}}
  .small{{display:flex;align-items:flex-end;justify-content:center;gap:20px;padding:16px;border-top:1px solid #eee}}
  svg{{width:auto;max-width:100%}}
  .why{{margin:0;padding:11px 18px 15px;font-size:11.5px;line-height:1.9;color:#6b7a7a;border-top:1px solid #eee}}
</style>
<h1>سَنّون — الجولة السابعة: الكتلة اللي تعملها الحروف</h1>
<p class="lede">بالجولة السادسة حنيت الكلمة وبقت تقرا «كلمة منحنية» — لأن بالكلمة فراغات، والفراغات تعني ما اكو كتلة وحدة إلها حدود. شعار CHIPPED TOOTH ما عنده هاي المشكلة: حروفه مرصوصة حتى تصير كتلة وحدة، وحدود هاي الكتلة هي السن. فهنا سمّخت الحروف حتى تلتصق ببعض وتصير كتلة، وبعدين قصّيت الاسم منها. الحدود الخارجية صارت من ترتيب الحروف بس — ما اكو ولا شكل مرسوم. الشريط الرمادي يوريك الكتلة لحالها.</p>
<div class="grid">{''.join(cards)}</div>'''

open('sheet7.html', 'w').write(html)
print('ok', len(cards))
