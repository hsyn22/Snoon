"""
Running the name along an arbitrary path, so the word draws the shape.

This is the نجمة move, and it is not the same as bending. On that logo the four
letters are not curved text — the connected word *is* the star's outline, and you
read it round the shape: up, right, down, left. The word became the stroke that
draws the thing.

So a shape is given as a spine — any open or closed path — and the word is laid
along it: the distance across the word picks a point on the spine, and the height
of the word is measured out along the spine's normal. Bending around a circle
(`warp.bend`) is the special case where the spine is an arc.

Two things this needs that a plain bend does not:

- **The word has to be squashed.** Wrapped round a tooth whose perimeter is about
  the word's own length, an unsquashed word is nearly as thick as the shape is
  wide and the silhouette disappears. Haider's note that the word may be
  compressed is what makes this legal, and `thick` is that control.
- **Direction matters.** Arabic reads right to left, so which end of the word
  meets the start of the spine, and which way round the spine runs, decides
  whether the shape reads as a word at all.
"""
import math


def resample(points, closed=True, n=1600):
    """A path as evenly spaced points plus its running length."""
    pts = list(points)
    if closed and pts[0] != pts[-1]:
        pts.append(pts[0])
    acc, total = [0.0], 0.0
    for i in range(1, len(pts)):
        total += math.dist(pts[i - 1], pts[i])
        acc.append(total)
    out, j = [], 0
    for i in range(n):
        s = total * i / (n - 1)
        while j < len(acc) - 2 and acc[j + 1] < s:
            j += 1
        seg = acc[j + 1] - acc[j]
        t = 0.0 if seg == 0 else (s - acc[j]) / seg
        out.append((pts[j][0] + (pts[j + 1][0] - pts[j][0]) * t,
                    pts[j][1] + (pts[j + 1][1] - pts[j][1]) * t))
    return out, total


def follow(spine_pts, box, thick=0.4, reverse=False, flip=False, closed=True,
           start=0.0, span=1.0):
    """
    Lay the word along a spine.

    `thick` scales the word's height — at 1.0 it keeps its own proportions, which
    is almost never what a wrapped word wants. `start` and `span` place the word
    on part of the spine rather than all of it. `reverse` runs it the other way
    round; `flip` puts the word's body on the other side of the line.
    """
    pts, total = resample(spine_pts, closed=closed)
    n = len(pts)
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0
    ymid = (y0 + y1) / 2

    def at(u):
        f = (start + u * span) % 1.0 if closed else max(0.0, min(1.0, start + u * span))
        i = min(n - 2, max(0, int(f * (n - 1))))
        p, q = pts[i], pts[i + 1]
        dx, dy = q[0] - p[0], q[1] - p[1]
        L = math.hypot(dx, dy) or 1.0
        return p, (dx / L, dy / L)

    def f(x, y):
        u = (x - x0) / w
        if reverse:
            u = 1.0 - u
        p, (tx, ty) = at(u)
        nx, ny = (-ty, tx) if not flip else (ty, -tx)
        d = (y - ymid) * thick * (h / h)
        return (p[0] + nx * d, p[1] + ny * d)

    return f


# ---- spines ---------------------------------------------------------------
# All are written on a roughly 1000-wide box centred on the origin and are
# scaled by the caller. y is down, as everywhere else in this pipeline.

def _ellipse(rx, ry, n=400, cx=0.0, cy=0.0, a0=-math.pi / 2, sweep=2 * math.pi):
    return [(cx + rx * math.cos(a0 + sweep * i / (n - 1)),
             cy + ry * math.sin(a0 + sweep * i / (n - 1))) for i in range(n)]


def incisor(scale=1.0, n=460):
    """A front tooth: rounded crown, straight flanks, a taper to a blunt root."""
    pts = []
    for i in range(n):
        v = i / (n - 1)
        a = math.pi * (1 - 2 * v)                     # right flank down, left flank up
        if v <= 0.5:
            t = v / 0.5
            x = 1.0 - 0.62 * t ** 1.7
            y = -0.85 + 1.85 * t
        else:
            t = (v - 0.5) / 0.5
            x = -(1.0 - 0.62 * (1 - t) ** 1.7)
            y = 1.0 - 1.85 * t
        pts.append((x * scale, y * scale))
    # Round the crown across the top.
    crown = [(math.cos(math.pi * (1 - i / 60)) * 1.0 * scale,
              (-0.85 - 0.5 * math.sin(math.pi * i / 60)) * scale) for i in range(61)]
    return pts[:1] + crown + pts[1:]


def molar(scale=1.0):
    """A back tooth: wide crown, a waist, two roots."""
    P = [(1.00, -0.75), (1.02, -0.30), (0.92, 0.05), (0.78, 0.30),
         (0.70, 0.75), (0.58, 1.05), (0.44, 1.12), (0.30, 0.95),
         (0.20, 0.55), (0.10, 0.32), (0.00, 0.28), (-0.10, 0.32),
         (-0.20, 0.55), (-0.30, 0.95), (-0.44, 1.12), (-0.58, 1.05),
         (-0.70, 0.75), (-0.78, 0.30), (-0.92, 0.05), (-1.02, -0.30),
         (-1.00, -0.75), (-0.86, -1.10), (-0.50, -1.30), (0.00, -1.34),
         (0.50, -1.30), (0.86, -1.10)]
    return [(x * scale, y * scale) for x, y in P]


def arcup(scale=1.0, n=220, depth=0.62):
    """An arch: high in the middle, falling at both ends."""
    return [(scale * (-1 + 2 * i / (n - 1)),
             scale * (0.2 - depth * (1 - (2 * i / (n - 1) - 1) ** 2)))
            for i in range(n)]


def smile(scale=1.0, n=220, depth=0.62):
    """
    A real smile: the line dips in the middle and lifts at the corners.

    The first version of this had its sign the wrong way round and produced an
    arch, which is the same curve a mouth makes when it is *not* smiling.
    """
    return [(scale * (-1 + 2 * i / (n - 1)),
             scale * (depth * (1 - (2 * i / (n - 1) - 1) ** 2) - 0.2))
            for i in range(n)]


def arch(scale=1.0, n=300):
    """The dental arch seen from above: a horseshoe, open at the bottom."""
    out = []
    for i in range(n):
        a = math.pi * 1.16 * (i / (n - 1)) - math.pi * 0.08
        out.append((scale * math.sin(a - math.pi / 2) * -1.0,
                    scale * math.cos(a - math.pi / 2) * -0.92))
    return out


def drop(scale=1.0, n=300):
    out = []
    for i in range(n):
        a = 2 * math.pi * i / (n - 1) - math.pi / 2
        r = 1 - 0.55 * math.cos(a / 2) ** 6
        out.append((scale * r * math.cos(a) * 0.9, scale * (r * math.sin(a) * 1.05)))
    return out


def lens(scale=1.0, n=300):
    """Lips: two arcs meeting at the corners."""
    out = []
    for i in range(n):
        t = i / (n - 1)
        x = -1 + 2 * t
        out.append((scale * x, scale * -0.55 * (1 - x * x)))
    for i in range(n):
        t = i / (n - 1)
        x = 1 - 2 * t
        out.append((scale * x, scale * 0.55 * (1 - x * x)))
    return out


def ring(scale=1.0):
    return _ellipse(scale, scale)


SPINES = {'incisor': incisor, 'molar': molar, 'smile': smile, 'arcup': arcup,
          'arch': arch, 'drop': drop, 'lens': lens, 'ring': ring}
