# Logo — round two

Eight directions, rendered in `concepts-round-2.png`. Nothing here is chosen yet, and
nothing here is wired into the product: `src/` still says `سنون / SNOON`, and it stays
that way until a direction is picked.

## Why round one was thrown away

Round one was eight marks drawn from nothing in particular. Haider's verdict was the
short one — none of them. Round two starts from two things instead: the logo ChatGPT
made him, which he half-liked, and the spelling decision he made at the same time.

## What was wrong with the ChatGPT logo

Worth writing down, because most of it is the kind of mistake that repeats.

1. **The Arabic did not spell the name.** The word carried a three-dot cluster — that is
   `ث` or `ش`. There is no such letter in `سَنّون`. The letterforms were drawn as artwork
   rather than typeset, so nothing checked them. This is the only fatal one on the list:
   a logo that misspells the name is not a logo.
2. **`SUNOON`** — neither the old `SNOON` nor the new `SOON`.
3. **The smile floated.** An orange curve sat under the word, attached to nothing,
   touching no letter. It read as a sticker rather than as part of the mark.
4. **Cream and terracotta.** It is the palette every image generator reaches for, and it
   is not ours — `tokens.css` is deep teal with a warm sand beside it, chosen deliberately
   against the corporate blue every clinic site uses.
5. **No mark.** There was nothing that survived being shrunk. A wordmark alone cannot be
   an app icon, a favicon, or a stamp on a clinic form.
6. **An arbitrary ring** in one corner, meaning nothing.
7. **An English-only tagline**, on a product whose first non-negotiable is that Arabic is
   the product and not a mode.

Numbers 3, 4, 5 and 7 are fixed in directions 03 and 04, which keep the composition he
liked. Number 1 is fixed everywhere, by never drawing Arabic.

## The rule the whole round is built on

**Arabic is typeset, never drawn.** Every wordmark on the sheet is live text in a real
Arabic face, so the shaping, the fatha and the shadda come from the font. The two marks
that contain a letter (`seal`, `calli`) and the one that is a diacritic (`shadda`) are
`<text>` elements for the same reason. Marks that are pure geometry are paths.

## Rebuilding the sheet

The faces are not committed — about 1.5MB of woff2 from Google Fonts. Fetch them into
`fonts/` beside these scripts and write a `fonts.css` pointing at the local files, then:

    node sheet.mjs && node shot.mjs sheet.html concepts-round-2.png 1600 1200

Fifteen faces were auditioned against the real string `سَنّون`; all fifteen render the
fatha and shadda correctly. The ones used here are Reem Kufi, Lalezar, Marhey,
Baloo Bhaijaan 2, Kufam, Cairo and Aref Ruqaa.

## Every mark is shown four ways

Because a logo is not the large version. Each card shows the mark large, reversed on the
brand teal, at 32px and 16px, and in a single ink — the app icon on a dark home screen and
the rubber stamp on a clinic form are both real, and a mark that only works at 150px has
not been tested.
