"""
The name, as outlines that came out of the font rather than off a pen.

Round four failed for one reason: every logo Haider sent fuses the object INTO
the letter — the kaf *is* the book — and that cannot be done to live text. It
needs the letters as editable shapes.

The repo's rule says Arabic is typeset, never drawn, and the rule is right: a
generated logo once misspelled the name because somebody drew the letterforms.
This does not break the rule, it mechanises it. HarfBuzz shapes the real string
with the real font — the same engine the browser uses — and the outlines come
out of the font's own glyph table. No hand ever touches a letter, and
`verify.mjs` then renders these paths against live text and fails on any
difference.

Output: one SVG path per glyph, in a coordinate system where y is down and the
baseline is 0, scaled so 1 unit = 1 em.
"""
import json
import sys
import uharfbuzz as hb
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.misc.transform import Transform
from fontTools.pens.boundsPen import BoundsPen

NAME = "سَنّون"   # س fatha ن shadda و ن
LABELS = ["seen", "fatha", "noon", "shadda", "waw", "noon-final"]


def outlines(path, weight=400, text=NAME):
    with open(path, "rb") as fh:
        data = fh.read()
    face = hb.Face(data)
    font = hb.Font(face)
    upem = face.upem
    font.scale = (upem, upem)
    # Google serves several of these as variable fonts, so the file's default
    # instance is not the weight the browser draws. Extracting the default and
    # comparing it against a rendered 700 is what made four faces disagree by
    # about 78%; both sides have to be pinned to the same point on the axis.
    font.set_variations({"wght": weight})

    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    assert buf.direction == "rtl", f"expected rtl, got {buf.direction}"
    hb.shape(font, buf)

    tt = TTFont(path, fontNumber=0)
    if "fvar" in tt:
        from fontTools.varLib import instancer
        tt = instancer.instantiateVariableFont(tt, {"wght": weight}, inplace=False)
    glyphset = tt.getGlyphSet()
    order = tt.getGlyphOrder()

    # A .notdef in the run means the face cannot write this name. Round three
    # found three faces that silently rendered something else; this is that
    # check, made mechanical.
    ids = [i.codepoint for i in buf.glyph_infos]
    if any(g == 0 for g in ids):
        raise SystemExit(f"{path}: font has no glyph for part of the name")

    glyphs, x, y = [], 0.0, 0.0
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        gname = order[info.codepoint]
        pen = SVGPathPen(glyphset, ntos=lambda v: f"{v:.2f}")
        # Font units are y-up and the em is upem; flip to y-down and normalise
        # to a 1000-unit em so every face lands in the same coordinate system.
        s = 1000.0 / upem
        t = Transform(s, 0, 0, -s, (x + pos.x_offset) * s, -(y + pos.y_offset) * s)
        glyphset[gname].draw(TransformPen(pen, t))
        d = pen.getCommands()
        if d:
            # The placed bounding box, so a shape can be fused to a letter's own
            # edge rather than to a guess at where that letter sits.
            bp = BoundsPen(glyphset)
            t2 = Transform(s, 0, 0, -s, (x + pos.x_offset) * s, -(y + pos.y_offset) * s)
            glyphset[gname].draw(TransformPen(bp, t2))
            bounds = [round(v, 2) for v in bp.bounds] if bp.bounds else None
            glyphs.append({"glyph": gname, "d": d,
                           "x": round((x + pos.x_offset) * s, 2),
                           "y": round(-(y + pos.y_offset) * s, 2),
                           "bbox": bounds})
        x += pos.x_advance
        y += pos.y_advance

    return {"upem": upem, "advance": round(x * 1000.0 / upem, 2),
            "count": len(buf.glyph_infos), "glyphs": glyphs}


if __name__ == "__main__":
    faces = {
        "Lalezar": ("fonts/ttf/Lalezar-400.ttf", 400),
        "Baloo": ("fonts/ttf/Baloo-800.ttf", 800),
        "Lemonada": ("fonts/ttf/Lemonada-700.ttf", 700),
        "Marhey": ("fonts/ttf/Marhey-700.ttf", 700),
        "Cairo": ("fonts/ttf/Cairo-900.ttf", 900),
        "Zain": ("fonts/ttf/Zain-900.ttf", 900),
    }
    out = {}
    for k, (p, w) in faces.items():
        try:
            out[k] = outlines(p, w)
            out[k]["weight"] = w
            print(f"{k}: {out[k]['count']} glyphs, advance {out[k]['advance']}", file=sys.stderr)
        except Exception as e:
            print(f"{k}: FAILED {e}", file=sys.stderr)
    with open("outlines.json", "w") as fh:
        json.dump(out, fh, indent=1)
