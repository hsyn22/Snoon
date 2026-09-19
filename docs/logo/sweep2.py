import math
import stations, along, warp

DARK = '#12201f'
GR, ADV = stations.groups()


def lay(key, perim=1.3, scale=1.0, spread=1.0, reverse=False, closed=True, weld=0):
    fn = along.SPINES[key]
    probe = fn(1000.0)
    _, plen = along.resample(probe, closed=closed)
    s = 1000.0 * (ADV * perim) / plen
    return stations.place(GR, ADV, fn(s), closed=closed, reverse=reverse,
                          scale=scale, spread=spread)


def bbox(cs):
    xs = [p[0] for c in cs for p in c]; ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def render(cs, fill, h=130, weld=0):
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    p = max(50, weld + 30)
    vb = f"{x0-p} {y0-p} {x1-x0+p*2} {y1-y0+p*2}"
    st = f' stroke="{fill}" stroke-width="{weld*2}" stroke-linejoin="round" stroke-linecap="round"' if weld else ''
    return f'<svg viewBox="{vb}" style="max-height:{h}px"><path d="{d}" fill="{fill}"{st}/></svg>'


rows = []
for key, closed in [('molar', True), ('incisor', True), ('ring', True),
                    ('drop', True), ('lens', True), ('arch', False), ('smile', False)]:
    cells = []
    for perim in (1.0, 1.25, 1.55):
        for rev in (False, True):
            cs = lay(key, perim=perim, reverse=rev, closed=closed)
            cells.append(f'<div class="c"><span>p{perim} {"↺" if rev else "↻"}</span>{render(cs, DARK)}</div>')
    rows.append(f'<h2>{key}</h2><div class="row">{"".join(cells)}</div>')

open('sweep2.html','w').write(f'''<!doctype html><meta charset="utf-8">
<link rel="stylesheet" href="fonts.css">
<style>
 body{{margin:0;background:#f2efe9;font-family:'Cairo',system-ui;padding:20px;direction:rtl}}
 h2{{font-size:13px;color:#555;margin:14px 0 6px;direction:ltr;text-align:right}}
 .row{{display:grid;grid-template-columns:repeat(6,1fr);gap:10px}}
 .c{{background:#fff;border-radius:10px;padding:10px;text-align:center}}
 .c span{{display:block;font-size:9px;color:#999;direction:ltr;margin-bottom:4px}}
 svg{{width:auto;max-width:100%}}
</style>{''.join(rows)}''')
print('ok')
