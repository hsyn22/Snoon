"""
Bending the name into a shape.

The critique that produced this file: on CHIPPED TOOTH the tooth's outline is
*made by* the arrangement of the lettering, while every mark so far has been a
drawn shape with a word dropped inside it, or a shape stuck onto a letter. Two
of the references are Arabic arranged into a shape — one into a star, one into a
ribbon — and that is the move.

So nothing here adds anything to the letters. It bends them, and the silhouette
of the bent word is the mark.

The letters are still never drawn: they are the font's own outlines, extracted
by HarfBuzz in `outline.py` and checked against the browser by `verify.mjs`. A
warp moves the points those outlines are made of. It cannot invent a letter and
it cannot change which letters are there.

Curves are flattened to short segments *before* warping. Warping a Bezier's
control points instead of its actual points is what makes bent type go lumpy —
the control points do not lie on the curve, so they do not move where the curve
needs them to.
"""
import json
import math

FLATNESS = 6.0        # units on a 1000-em; ~0.6% of the em, invisible at any size


# ---- flattening ----------------------------------------------------------

def _bez3(p0, p1, p2, p3, n):
    out = []
    for i in range(1, n + 1):
        t = i / n
        s = 1 - t
        out.append((
            s * s * s * p0[0] + 3 * s * s * t * p1[0] + 3 * s * t * t * p2[0] + t * t * t * p3[0],
            s * s * s * p0[1] + 3 * s * s * t * p1[1] + 3 * s * t * t * p2[1] + t * t * t * p3[1],
        ))
    return out


def _bez2(p0, p1, p2, n):
    out = []
    for i in range(1, n + 1):
        t = i / n
        s = 1 - t
        out.append((
            s * s * p0[0] + 2 * s * t * p1[0] + t * t * p2[0],
            s * s * p0[1] + 2 * s * t * p1[1] + t * t * p2[1],
        ))
    return out


def _steps(pts):
    d = sum(math.dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))
    return max(2, min(160, int(d / FLATNESS) + 2))


class FlattenPen:
    """Records each contour as a list of points, subdividing every curve."""

    def __init__(self):
        self.contours = []
        self._c = None
        self._p = (0, 0)

    def moveTo(self, pt):
        self._c = [pt]
        self._p = pt

    def lineTo(self, pt):
        self._c.append(pt)
        self._p = pt

    def curveTo(self, *pts):
        # Cubic, possibly a chain of them sharing implied on-curve points.
        prev = self._p
        for i in range(0, len(pts) - 2, 2):
            a, b, c = pts[i], pts[i + 1], pts[i + 2]
            self._c += _bez3(prev, a, b, c, _steps([prev, a, b, c]))
            prev = c
        self._p = prev

    def qCurveTo(self, *pts):
        prev = self._p
        pts = list(pts)
        if pts[-1] is None:                       # a closed all-off-curve contour
            pts = pts[:-1]
            prev = ((pts[0][0] + pts[-1][0]) / 2, (pts[0][1] + pts[-1][1]) / 2)
            self._c = [prev]
            pts = pts + [pts[0]]
        for i in range(len(pts) - 1):
            ctrl, nxt = pts[i], pts[i + 1]
            on = nxt if i == len(pts) - 2 else ((ctrl[0] + nxt[0]) / 2, (ctrl[1] + nxt[1]) / 2)
            self._c += _bez2(prev, ctrl, on, _steps([prev, ctrl, on]))
            prev = on
        self._p = prev

    def closePath(self):
        if self._c:
            self.contours.append(self._c)
            self._c = None

    endPath = closePath

    def addComponent(self, name, tr):
        pass


# ---- warps ---------------------------------------------------------------

def bend(radius, cx, down=True):
    """
    Wrap the word around a circle.

    `down=True` bends it into an arch — the middle stays put and the two ends
    swing downward, which is the shape a molar makes: a wide rounded crown with
    a leg coming down on each side. `down=False` gives the smile.

    The tighter the radius the more of a circle the word wraps, so one number
    takes it from a faint curve to a closed horseshoe.
    """
    sign = 1.0 if down else -1.0

    def f(x, y):
        theta = (x - cx) / radius
        d = radius - sign * y
        return (cx + d * math.sin(theta), sign * (radius - d * math.cos(theta)))

    return f


def envelope(x0, x1, y0, y1, left, right):
    """
    Squeeze the word between two profile curves.

    `left` and `right` take v in 0..1 (top to bottom of the word) and return the
    x the word's edge should sit at, so the word fills whatever silhouette those
    two curves describe.
    """
    def f(x, y):
        u = (x - x0) / (x1 - x0)
        v = (y - y0) / (y1 - y0)
        v = min(max(v, 0.0), 1.0)
        a, b = left(v), right(v)
        return (a + u * (b - a), y)

    return f


def apply(contours, f):
    return [[f(x, y) for (x, y) in c] for c in contours]


def to_path(contours):
    out = []
    for c in contours:
        if len(c) < 2:
            continue
        out.append("M" + " ".join(f"{x:.1f} {y:.1f}" for x, y in c) + "Z")
    return "".join(out).replace("M", "M", 1)


def path_d(contours):
    parts = []
    for c in contours:
        if len(c) < 2:
            continue
        parts.append("M" + f"{c[0][0]:.1f} {c[0][1]:.1f}" +
                     "".join(f"L{x:.1f} {y:.1f}" for x, y in c[1:]) + "Z")
    return "".join(parts)
