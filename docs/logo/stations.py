"""
The نجمة construction: each letter kept whole and turned to face the shape.

Wrapping the word continuously along a path (`along.py`) makes the silhouette
but costs the reading, because every letter is bent through a large angle. On
the نجمة logo the letters are not bent like that — each one stays a letter and
is *placed* on its arm of the star, and you turn your head rather than decode a
smear.

So here a glyph is moved rigidly: rotated to the path's direction at its own
station and set down, never stretched. A diacritic is not given a station of its
own — it rides its base letter's transform, or the fatha and the shadda go
wandering off around the shape on their own.
"""
import math
import outline
import along


def groups(path='fonts/ttf/Lalezar-400.ttf', weight=400, text=None):
    """Each base letter with the marks that belong to it."""
    kw = {} if text is None else {'text': text}
    gs, adv = outline.glyph_contours(path, weight, **kw)
    bases = [g for g in gs if g['advance'] > 0]
    out = [{'base': b, 'marks': []} for b in bases]
    for g in gs:
        if g['advance'] > 0:
            continue
        cx = (g['bbox'][0] + g['bbox'][2]) / 2
        # A mark belongs to the base whose span contains it; failing that, the
        # nearest one. Never to a station of its own.
        hit = next((o for o in out if o['base']['bbox'][0] <= cx <= o['base']['bbox'][2]), None)
        if hit is None:
            hit = min(out, key=lambda o: abs((o['base']['bbox'][0] + o['base']['bbox'][2]) / 2 - cx))
        hit['marks'].append(g)
    return out, adv


def place(gr, adv, spine_pts, closed=True, reverse=False, scale=1.0,
          lift=0.0, start=0.0, span=1.0, spread=1.0):
    """
    Set each letter down on the spine.

    `spread` stretches the stations apart or squeezes them together without
    touching the letters themselves, which is how the spacing is tuned to a
    shape whose perimeter is not the word's length.
    """
    pts, total = along.resample(spine_pts, closed=closed)
    n = len(pts)
    mid = adv / 2

    def at(u):
        f = (start + u * span) % 1.0 if closed else max(0.0, min(1.0, start + u * span))
        i = min(n - 2, max(0, int(f * (n - 1))))
        p, q = pts[i], pts[i + 1]
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy) or 1.0
        return p, math.atan2(dy, dx)

    out = []
    for g in gr:
        b = g['base']
        cx = (b['bbox'][0] + b['bbox'][2]) / 2
        u = 0.5 + (cx - mid) / adv * spread
        if reverse:
            u = 1.0 - u
        p, ang = at(min(max(u, 0.0), 1.0))
        ca, sa = math.cos(ang), math.sin(ang)

        def T(pt):
            lx, ly = (pt[0] - cx) * scale, (pt[1] - lift) * scale
            return (p[0] + lx * ca - ly * sa, p[1] + lx * sa + ly * ca)

        for c in b['contours']:
            out.append([T(q) for q in c])
        for m in g['marks']:
            for c in m['contours']:
                out.append([T(q) for q in c])
    return out


# In visual order — leftmost glyph first, as HarfBuzz returns RTL — سَنّون is
# ن | و | نّ | سَ, and Arabic joins seen→noon and noon→waw but **not** waw→noon.
# That gap is not a mistake to close: it is how the word is written.
JOINS = [(3, 2), (2, 1)]


def kashida(gr, adv, spine_pts, closed=True, reverse=False, thick=150.0,
            start=0.0, span=1.0, spread=1.0, bite=0.35, joins=JOINS, n=90):
    """
    The connecting strokes, run along the spine between the letters.

    This is the piece that makes نجمة work. Letters placed at stations stay
    readable but sit apart and draw nothing; a continuous warp draws the shape
    but bends every letter past reading. The kashida is the Arabic answer to
    exactly that — a connecting stroke that may be extended to any length
    without touching the letters — so the letters keep their shapes and the
    stretched joins become the shape's outline.

    `bite` runs each ribbon a little way under the letters at both ends so the
    join is seamless rather than butted.
    """
    pts, total = along.resample(spine_pts, closed=closed)
    npts = len(pts)
    mid = adv / 2

    def at(u):
        f = (start + u * span) % 1.0 if closed else max(0.0, min(1.0, start + u * span))
        i = min(npts - 2, max(0, int(f * (npts - 1))))
        p, q = pts[i], pts[i + 1]
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy) or 1.0
        return p, (dx / L, dy / L)

    def station(k):
        b = gr[k]['base']
        cx = (b['bbox'][0] + b['bbox'][2]) / 2
        u = 0.5 + (cx - mid) / adv * spread
        return 1.0 - u if reverse else u

    out = []
    for a, b in joins:
        ua, ub = station(a), station(b)
        lo, hi = (ua, ub) if ua < ub else (ub, ua)
        width = (hi - lo)
        lo -= width * bite
        hi += width * bite
        top, bot = [], []
        for i in range(n):
            u = lo + (hi - lo) * i / (n - 1)
            p, (tx, ty) = at(u)
            nx, ny = -ty, tx
            top.append((p[0] + nx * -thick, p[1] + ny * -thick))
            bot.append((p[0], p[1]))
        out.append(top + bot[::-1])
    return out
