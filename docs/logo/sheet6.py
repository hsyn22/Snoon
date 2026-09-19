"""
Round six — the word bent until its own silhouette is the mark.

Nothing is added. Every shape on this sheet is the six letters of the name and
nothing else; only their arrangement changes.
"""
import math
import outline
import warp

INK, CREAM, DARK, TEAL = '#12201f', '#f6f1e8', '#12201f', '#13585c'

FACES = {
    'Lalezar': ('fonts/ttf/Lalezar-400.ttf', 400),
    'Baloo': ('fonts/ttf/Baloo-800.ttf', 800),
    'Cairo': ('fonts/ttf/Cairo-900.ttf', 900),
}

BASE = {k: outline.word_contours(p, w) for k, (p, w) in FACES.items()}


def bent(face, radius, down=True):
    contours, adv = BASE[face]
    f = warp.bend(radius, adv / 2, down)
    return warp.apply(contours, f), adv


def bbox(cs):
    xs = [p[0] for c in cs for p in c]
    ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def svg(cs, fill, pad=90, h=210):
    x0, y0, x1, y1 = bbox(cs)
    vb = f"{x0 - pad} {y0 - pad} {x1 - x0 + pad * 2} {y1 - y0 + pad * 2}"
    return (f'<svg viewBox="{vb}" style="max-height:{h}px">'
            f'<path d="{warp.path_d(cs)}" fill="{fill}" fill-rule="nonzero"/></svg>')


def card(title, note, cs, wide=False):
    return f'''<section class="card{' wide' if wide else ''}">
      <header><span class="ar">{title}</span></header>
      <div class="cream">{svg(cs, DARK)}</div>
      <div class="teal">{svg(cs, CREAM, h=170)}</div>
      <div class="small">{svg(cs, TEAL, h=42)}{svg(cs, TEAL, h=26)}{svg(cs, TEAL, h=17)}</div>
      <p class="why">{note}</p>
    </section>'''


cards = []

# The arch, tightening. At radius = advance/pi the word closes to a half circle.
adv = BASE['Lalezar'][1]
half = adv / math.pi
for r, label in [
    (1500, 'قوس خفيف'),
    (1050, 'قوس'),
    (820, 'قوس عميق'),
    (round(half), 'نصف دائرة — القوس الكامل'),
    (600, 'حدوة'),
    (520, 'حدوة ضيّقة'),
]:
    cs, _ = bent('Lalezar', r, down=True)
    deg = round(adv / r * 180 / math.pi)
    cards.append(card(f'{label} — {deg}°', f'نفس الكلمة، منحنية {deg} درجة. ما زدنا ولا شي — الشكل هو حدود الكلمة نفسها.', cs))

# The same thing the other way up.
for r, label in [(1050, 'ابتسامة'), (700, 'ابتسامة عميقة')]:
    cs, _ = bent('Lalezar', r, down=False)
    cards.append(card(label, 'مقلوبة — الكلمة تعمل ابتسامة بدل القوس.', cs))

# And in the two other faces, at the shape that reads best.
for face in ['Baloo', 'Cairo']:
    a = BASE[face][1]
    cs, _ = bent(face, round(a / math.pi), down=True)
    cards.append(card(f'القوس الكامل — {face}', f'نفس الانحناء بخط {face}.', cs))

html = f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}}
  h1{{font-size:21px;margin:0 0 6px;color:{DARK}}}
  .lede{{font-size:13px;color:#5e5a52;margin:0 0 22px;max-width:78ch;line-height:1.95}}
  .grid{{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}}
  .card{{background:#fff;border-radius:18px;overflow:hidden}}
  header{{padding:13px 18px;border-bottom:1px solid #eee}}
  .ar{{font-size:14px;font-weight:700;color:{DARK}}}
  .cream,.teal{{display:flex;align-items:center;justify-content:center;padding:24px}}
  .cream{{background:{CREAM}}} .teal{{background:{TEAL}}}
  .small{{display:flex;align-items:flex-end;justify-content:center;gap:22px;padding:18px;border-top:1px solid #eee}}
  svg{{width:auto;max-width:100%}}
  .why{{margin:0;padding:12px 18px 16px;font-size:12px;line-height:1.95;color:#4d5d5e;border-top:1px solid #eee}}
</style>
<h1>سَنّون — الجولة السادسة: الكلمة هي الشكل</h1>
<p class="lede">ما اكو ولا شكل مرسوم بهاي الورقة. كل وحدة منهن هي حروف الاسم الستة وبس — الفرق الوحيد هو ترتيبهن. الحدود الخارجية للكلمة المنحنية هي الشعار، مثل ما حروف CHIPPED TOOTH هي اللي تعمل شكل السن، ومثل الخط العربي المرتّب بشكل نجمة بالمراجع اللي دزيتها.</p>
<div class="grid">{''.join(cards)}</div>'''

open('sheet6.html', 'w').write(html)
print('ok', len(cards), 'cards')
