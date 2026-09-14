# Logo

Eight directions, rendered in `concepts-round-2.png`. Nothing here is chosen yet, and
nothing here is wired into the product: `src/` still says `سنون / SNOON`, and it stays
that way until a direction is picked.

Three rounds so far, in `concepts-round-*.png`. Nothing is chosen yet and nothing is
wired into the product: `src/` still says `سنون / SNOON`, and it stays that way until a
direction is picked.

## Where this stands

**Three rounds, twenty-eight directions, all rejected.** Round three was rejected in one
word. Generating a fourth batch the same way is not a plan — the problem was never a
shortage of ideas, it is that every round has been a guess at one person's taste with no
reference to guess from.

So the next round waits on Haider sending two or three logos he likes, from any field. One
reference is worth more than another thirty guesses.

Two things checked and closed off, so nobody tries them again: **Canva's design generation
is disabled on his team**, and his **Figma seat is View-only on the starter tier**, so
neither can be handed the job from a session like this one.

The one piece of signal from three rounds is in round two: he liked **Lalezar** and
**Aref Ruqaa** as ways of writing the name, and nothing about any mark. Start there.

Nothing about the logo blocks launch. `src/` says `سنون / SNOON` and works.

## Round one — eight drawn marks. All rejected.

Marks invented from nothing in particular. Verdict: none of them.

## Round two — eight marks again, this time with a source. All rejected.

Built from the logo ChatGPT made him, which he half-liked, and from the spelling
decision he made at the same time. Same verdict. What it did produce was the first
piece of real signal in three rounds, and it came from a part nobody was asking about:

> the only two things I kind of liked … is the type of font that was used to write the
> word سنون in Arabic, in number two and number eight

Those are **Lalezar** (heavy rounded display) and **Aref Ruqaa** (calligraphic ruqʿa).

## Round three — the name is the logo

The signal says he is responding to the **lettering**, not to marks standing beside it.
So round three drops invented marks entirely: twelve wordmark-led directions, every one
of them a treatment of the word itself, and every favicon derived from the wordmark
rather than designed separately.

- **01–05** are Lalezar, the face from round two's 02: coloured diacritics, a knockout
  panel, a cradle, the word doubled as a pair, and the word standing on a bridge.
- **07–09** are Aref Ruqaa, the face from round two's 08: underlined, inside an arch,
  and inside a round stamp.
- **06 and 10–12** are new registers for contrast — Lemonada with a gradient, Zain
  stacked, Katibeh condensed, El Messiri formal.

Two techniques worth keeping, both forced by Arabic:

- **Two colours through one word is a gradient or two stacked copies, never two spans.**
  Arabic shapes each letter by its neighbours, and a span boundary inside a word breaks
  the join. 06 paints a gradient onto one text element; 01 stacks two full copies of the
  string and clips the upper one to the band the fatha and shadda sit in; 04 stacks two
  full copies offset from each other. None of them cuts the string.
- **Three of the fifteen new faces auditioned mangle the string outright** — Qahiri,
  Blaka and Alkalami each render `سَنّون` as something else. Audition against the real
  string before using a face, never against sample text.

## What was wrong with the ChatGPT logo

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

    node sheet.mjs  && node shot.mjs sheet.html  concepts-round-2.png 1600 1200
    node sheet3.mjs && node shot.mjs sheet3.html concepts-round-3.png 2100 1200 1.6

Thirty faces have now been auditioned against the real string `سَنّون`; all fifteen render the
fatha and shadda correctly. The ones used here are Reem Kufi, Lalezar, Marhey,
Baloo Bhaijaan 2, Kufam, Cairo and Aref Ruqaa.

## Every mark is shown four ways

Because a logo is not the large version. Each card shows the mark large, reversed on the
brand teal, at 32px and 16px, and in a single ink — the app icon on a dark home screen and
the rubber stamp on a clinic form are both real, and a mark that only works at 150px has
not been tested.
