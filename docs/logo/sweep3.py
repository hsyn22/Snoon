import math
import stations, along, warp

DARK = '#12201f'
GR, ADV = stations.groups()


def mark(key, perim=1.3, reverse=False, closed=True, thick=150, spread=1.0, scale=1.0):
    fn = along.SPINES[key]
    _, plen = along.resample(fn(1000.0), closed=closed)
    s = 1000.0 * (ADV * perim) / plen
    spine = fn(s)
    cs = stations.place(GR, ADV, spine, closed=closed, reverse=reverse,
                        scale=scale, spread=spread)
    cs += stations.kashida(GR, ADV, spine, closed=closed, reverse=reverse,
                           thick=thick, spread=spread)
    return cs


def bbox(cs):
    xs = [p[0] for c in cs for p in c]; ys = [p[1] for c in cs for p in c]
    return min(xs), min(ys), max(xs), max(ys)


def render(cs, fill, h=130):
    d = warp.path_d(cs)
    x0, y0, x1, y1 = bbox(cs)
    p = 60
    return (f'<svg viewBox="{x0-p} {y0-p} {x1-x0+p*2} {y1-y0+p*2}" style="max-height:{h}px">'
            f'<path d="{d}" fill="{fill}"/></svg>')


rows = []
for key, closed in [('smile', False), ('arch', False), ('molar', True),
                    ('incisor', True), ('ring', True), ('lens', True)]:
    cells = []
    for perim in (1.0, 1.3, 1.6):
        for rev in (False, True):
            cs = mark(key, perim=perim, reverse=rev, closed=closed)
            cells.append(f'<div class="c"><span>p{perim} {"↺" if rev else "↻"}</span>{render(cs, DARK)}</div>')
    rows.append(f'<h2>{key}</h2><div class="row">{"".join(cells)}</div>')

open('sweep3.html','w').write(f'''<!doctype html><meta charset="utf-8">
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
