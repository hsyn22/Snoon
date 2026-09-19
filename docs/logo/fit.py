"""
Fitting the name into a silhouette.

The point CHIPPED TOOTH makes and every earlier round missed: the tooth is not
drawn and the letters are not put inside it — the letters are stretched until
*they* fill it, so the outline is a consequence of the lettering. Two lines is
what makes that possible; one line of سَنّون is 2.2 times wider than it is tall
and no amount of bending turns that into a tooth.

So a silhouette is described as a profile — its left and right edge at every
height — and each line of type is stretched across the full width the profile
allows at its own band. Then the letters are thickened until they touch, and the
name is cut back out. Nothing is ever drawn.
"""
import math
import outline
import warp

FONT = 'fonts/ttf/Lalezar-400.ttf'
WEIGHT = 400


LATIN = 'fonts/ttf/Lalezar-latin.ttf'


def line(text):
    # The Arabic subset carries no Latin, so SNOON comes from the Latin subset
    # of the same face. Same design, same weight, different file.
    src = LATIN if all(ord(c) < 0x300 for c in text) else FONT
    cs, adv = outline.word_contours(src, WEIGHT, text)
    xs = [p[0] for c in cs for p in c]
    ys = [p[1] for c in cs for p in c]
    return cs, (min(xs), min(ys), max(xs), max(ys))


def fit(cs, box, profile, v0, v1, top, bottom, width=1000.0, inset=0.0):
    """
    Stretch one line so it spans the profile's full width at its own height.

    `profile(v)` returns the half-width at v, v running 0 at the silhouette's
    top to 1 at its bottom. `v0..v1` is the band this line occupies.
    """
    x0, y0, x1, y1 = box
    w, h = x1 - x0, y1 - y0

    def f(x, y):
        u = (x - x0) / w                      # 0..1 across the line
        t = (y - y0) / h                      # 0..1 down the line
        v = v0 + t * (v1 - v0)
        half = profile(v) * (1.0 - inset) * width
        return (u * 2 * half - half, top + (bottom - top) * t)

    return warp.apply(cs, f)


# ---- silhouettes, as half-width profiles ---------------------------------

def incisor(v):
    """
    One crown, one root. The taper has to be severe: the first attempt took the
    root down to 56% of the crown and every silhouette came out the same blob,
    because a profile that never really narrows is not a shape.
    """
    if v < 0.12:
        return math.sqrt(max(0.0, 1 - ((0.12 - v) / 0.12) ** 2)) * 0.97 + 0.03
    if v < 0.40:
        return 1.0
    t = (v - 0.40) / 0.60
    return 1.0 - 0.80 * t ** 1.5


def molar(v):
    """A wide crown on a short waist, then the roots' spread."""
    if v < 0.14:
        return math.sqrt(max(0.0, 1 - ((0.14 - v) / 0.14) ** 2)) * 0.95 + 0.05
    if v < 0.52:
        return 1.0
    t = (v - 0.52) / 0.48
    return 1.0 - 0.62 * t ** 1.4


def drop(v):
    """A drop, point up — for the directions that are not teeth."""
    if v < 0.5:
        t = v / 0.5
        return 0.08 + 0.92 * t * t
    return math.sqrt(max(0.0, 1 - ((v - 0.5) / 0.5) ** 2)) * 0.97 + 0.03


def seal(v):
    """A circle."""
    return math.sqrt(max(0.0, 1 - (2 * v - 1) ** 2))


PROFILES = {'incisor': incisor, 'molar': molar, 'drop': drop, 'seal': seal}
