"""
Round eight — the name stretched until it fills the shape.

Three lines, thickened until they touch and become one mass, with the lettering
cut back out. The outline is a consequence of the type, which is the whole of
the note about CHIPPED TOOTH.
"""
import fit, warp

CREAM, DARK, TEAL, WARM = '#f6f1e8', '#12201f', '#13585c', '#e0a668'
AR = 'سَنّون'
PLAT = 'منصة'

LINES = {k: fit.line(k) for k in (AR, PLAT, 'SNOON')}

# Which line sits in which band of the silhouette, and where it lands vertically.
# The gaps are smaller than twice the thickening, so the three lines merge into
# one mass rather than reading as three stacked words.
BANDS = [
    (PLAT, 0.04, 0.17, 120, 470),
    (AR, 0.22, 0.55, 560, 1440),
    ('SNOON', 0.60, 0.94, 1530, 2290),
]

TWO = [
    (AR, 0.05, 0.42, 130, 1080),
    ('SNOON', 0.50, 0.94, 1180, 2060),
]


def build(profile, bands=BANDS, width=1000.0):
    out = []
    for text, v0, v1, top, bot in bands:
        cs, box = LINES[text]
        out += fit.fit(cs, box, profile, v0, v1, top, bot, width=width)
    return out


def bbox(cs):
    xs = [p[0] for c in cs for p in c]
    ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def render(cs, grow, ink, knock, h=260):
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    p = grow + 40
    vb = f"{x0-p} {y0-p} {x1-x0+p*2} {y1-y0+p*2}"
    body = (f'<path d="{d}" fill="{ink}" stroke="{ink}" stroke-width="{grow*2}"'
            f' stroke-linejoin="round" stroke-linecap="round"/>')
    if knock:
        body += f'<path d="{d}" fill="{knock}"/>'
    return f'<svg viewBox="{vb}" style="max-height:{h}px">{body}</svg>'


CARDS = [
    ('سن أمامي — ثلاث أسطر', 'incisor', 62, BANDS),
    ('ضرس — ثلاث أسطر', 'molar', 62, BANDS),
    ('سن أمامي — سطران', 'incisor', 62, TWO),
    ('ضرس — سطران', 'molar', 62, TWO),
    ('سن أمامي — لحام أخف', 'incisor', 34, BANDS),
    ('قطرة', 'drop', 62, BANDS),
    ('ختم', 'seal', 62, BANDS),
    ('ضرس — سطران، لحام أخف', 'molar', 34, TWO),
]

cards = []
for title, key, grow, bands in CARDS:
    cs = build(fit.PROFILES[key], bands)
    cards.append(f'''<section class="card">
      <header><span class="ar">{title}</span></header>
      <div class="cream">{render(cs, grow, DARK, CREAM)}</div>
      <div class="teal">{render(cs, grow, CREAM, TEAL, h=230)}</div>
      <div class="sil">{render(cs, grow, '#b9b3a6', None, h=150)}</div>
      <div class="small">{render(cs, grow, TEAL, '#fff', h=54)}{render(cs, grow, TEAL, '#fff', h=32)}{render(cs, grow, TEAL, '#fff', h=20)}</div>
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
  header{{padding:13px 18px;border-bottom:1px solid #eee}}
  .ar{{font-size:14px;font-weight:700;color:{DARK}}}
  .cream,.teal,.sil{{display:flex;align-items:center;justify-content:center;padding:22px}}
  .cream{{background:{CREAM}}} .teal{{background:{TEAL}}} .sil{{background:#f4f2ee;border-top:1px solid #eee}}
  .small{{display:flex;align-items:flex-end;justify-content:center;gap:20px;padding:16px;border-top:1px solid #eee}}
  svg{{width:auto;max-width:100%}}
</style>
<h1>سَنّون — الجولة الثامنة: الحروف ممدودة حتى تملأ الشكل</h1>
<p class="lede">ثلاث أسطر — منصة، سَنّون، SNOON — كل سطر ممدود حتى يوصل لحافة الشكل بارتفاعه، وبعدين مسمّخين حتى يلتصقون ويصيرون كتلة وحدة، والاسم مقصوص منها. يعني الحد الخارجي طلع من الكتابة نفسها، مو شكل مرسوم وحطّينا بداخله كلمة. الشريط الرمادي يوريك الكتلة لحالها.</p>
<div class="grid">{''.join(cards)}</div>'''
open('sheet8.html', 'w').write(html)
print('ok')
