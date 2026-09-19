"""
Round ten — the smile family, built with letters plus kashida.

What the sweeps established, and it is worth keeping:

- Warping the word continuously along a shape draws the shape and destroys the
  reading. Placing the letters rigidly at stations keeps the reading and draws
  nothing.
- **Kashida is the way out of that**, and it is Arabic's own device rather than
  a trick: the connecting stroke may be extended to any length without touching
  the letters, so the letters stay letters and the stretched joins become the
  shape.
- Closed shapes still fail: going round a loop puts half the letters upside
  down, and unlike نجمة's four separated letters سَنّون has to stay joined.

So the shapes that work are open curves — and a mouth is an open curve.

One thing the word turns out to own: **both of its noons carry a dot**, so there
are two dots sitting above the line already. On a smile they read as eyes
without a single drawn mark.
"""
import math
import stations, along, warp

CREAM, DARK, TEAL, WARM = '#f6f1e8', '#12201f', '#13585c', '#e0a668'
GR, ADV = stations.groups()


def mark(key, perim=1.0, reverse=True, closed=False, thick=150, spread=1.0,
         scale=1.0, depth=None):
    fn = along.SPINES[key]
    kw = {} if depth is None else {'depth': depth}
    _, plen = along.resample(fn(1000.0, **kw), closed=closed)
    s = 1000.0 * (ADV * perim) / plen
    spine = fn(s, **kw)
    cs = stations.place(GR, ADV, spine, closed=closed, reverse=reverse,
                        scale=scale, spread=spread)
    cs += stations.kashida(GR, ADV, spine, closed=closed, reverse=reverse,
                           thick=thick, spread=spread)
    return cs


def bbox(cs):
    xs = [p[0] for c in cs for p in c]; ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def render(cs, fill, h=190):
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    p = 70
    return (f'<svg viewBox="{x0-p} {y0-p} {x1-x0+p*2} {y1-y0+p*2}" style="max-height:{h}px">'
            f'<path d="{d}" fill="{fill}"/></svg>')


V = [
    ('ابتسامة', dict(key='smile', depth=0.5), 'الكلمة تنزل بالوسط وترفع بالأطراف — خط الابتسامة نفسه. نقطتين النونين يقعدون فوق الخط.'),
    ('ابتسامة عميقة', dict(key='smile', depth=0.85), 'نفس الشي بانحناء أعمق.'),
    ('ابتسامة عريضة', dict(key='smile', depth=0.5, perim=1.35), 'الكشيدة أطول، فالابتسامة أوسع والحروف متباعدة.'),
    ('ابتسامة — كشيدة ثخينة', dict(key='smile', depth=0.6, thick=230), 'خط الوصل أثخن، فيصير هو الشكل الأساسي.'),
    ('قوس', dict(key='arcup', depth=0.55), 'مقلوبة — قوس بدل ابتسامة.'),
    ('قوس عميق', dict(key='arcup', depth=0.9), 'قوس أعمق، أقرب لقوس الفك.'),
    ('قوس الفك', dict(key='arch', perim=1.15), 'حدوة — قوس الفك من فوق.'),
    ('قوس الفك — أوسع', dict(key='arch', perim=1.5, thick=190), 'نفسه بكشيدة أطول وأثخن.'),
]

cards = []
for title, kw, note in V:
    cs = mark(**kw)
    cards.append(f'''<section class="card">
      <header><span class="ar">{title}</span></header>
      <div class="cream">{render(cs, DARK)}</div>
      <div class="teal">{render(cs, CREAM, h=160)}</div>
      <div class="small">{render(cs, TEAL, h=44)}{render(cs, TEAL, h=27)}{render(cs, TEAL, h=17)}</div>
      <p class="why">{note}</p>
    </section>''')

open('round10.html','w').write(f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
  *{{box-sizing:border-box}}
  body{{margin:0;background:#e9e4da;font-family:'Cairo',system-ui;direction:rtl;padding:28px}}
  h1{{font-size:21px;margin:0 0 6px;color:{DARK}}}
  .lede{{font-size:13px;color:#5e5a52;margin:0 0 22px;max-width:82ch;line-height:1.95}}
  .grid{{display:grid;grid-template-columns:repeat(4,1fr);gap:20px}}
  .card{{background:#fff;border-radius:18px;overflow:hidden}}
  header{{padding:12px 16px;border-bottom:1px solid #eee}}
  .ar{{font-size:13.5px;font-weight:700;color:{DARK}}}
  .cream,.teal{{display:flex;align-items:center;justify-content:center;padding:22px}}
  .cream{{background:{CREAM}}} .teal{{background:{TEAL}}}
  .small{{display:flex;align-items:flex-end;justify-content:center;gap:18px;padding:14px;border-top:1px solid #eee}}
  svg{{width:auto;max-width:100%}}
  .why{{margin:0;padding:11px 16px 15px;font-size:11.5px;line-height:1.9;color:#5d6f70;border-top:1px solid #eee}}
</style>
<h1>سَنّون — الجولة العاشرة: الكشيدة هي اللي ترسم</h1>
<p class="lede">الحل طلع بالكشيدة — خط الوصل العربي اللي يتمدد لأي طول بدون ما يمس الحروف. الحروف تبقى حروف تنقرا، والوصلات الممدودة هي اللي تعمل الشكل. هذا مو حيلة، هذا أصلاً من الخط العربي، ونفس اللي تعمله «نجمة».<br><b>وشي اكتشفته:</b> بالاسم نونين، وكل نون إلها نقطة — يعني عدنا نقطتين فوق الخط أصلاً. على خط الابتسامة يقرون عيون، بدون ما نرسم ولا نقطة.</p>
<div class="grid">{''.join(cards)}</div>''')
print('ok')
