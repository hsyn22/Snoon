# Logo

Four rounds so far, in `concepts-round-2.png`, `concepts-round-3.png` and `round4.png`.
Nothing is chosen yet and nothing is wired into the product: `src/` still says
`سنون / SNOON`, and it stays that way until a direction is picked.

## Where this stands

**Round four is on the table and waiting on a pick.** See `round4.png` for the seven
directions and `insitu.png` for the two strongest shown at the size they are actually met
at — a site header and an app icon, not a hero.

Rounds one to three were rejected, and the reason was recorded at the time: every round
had been a guess at one person's taste with no reference to guess from. **That block is
now cleared.** Haider sent fourteen logos he likes, and they say one thing consistently —
**every one of them merges a shape with the name**, and the Arabic ones do it inside the
letters themselves: the kaf of «كتاب» is a book, the alif of «حلاق» is a scissor blade, a
coffee pot sits in «قهوة», a lime slice fills a counter in «ليمون», and CHIPPED TOOTH sets
its lettering inside a tooth. Round four is built from that and from nothing else.

**The two signals agree, which is the useful part.** Round two's only signal was that he
liked **Lalezar** and **Aref Ruqaa** as ways of writing the name. The new reference sheet's
Arabic logos are heavy rounded display faces — «ليمون» is Lalezar's register almost
exactly. So the face he picked and the references he sent point the same way, and round
four is mostly Lalezar.

Still true, so nobody tries them again: **Canva's design generation is disabled on his
team**, and his **Figma seat is View-only on the starter tier**.

Nothing about the logo blocks launch. `src/` still says `سنون / SNOON` and works, and it
stays that way until a direction is picked.

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

## Round four — a shape merged with the name

Seven directions in `round4.png`, built from the reference sheet. Each is **one typeset
word plus one drawn object**, and which letter the object meets is the idea:

| | | |
|---|---|---|
| 01 | **الجذر** — the final noon grows roots and *is* a molar | Lalezar |
| 02 | **السن في السين** — one of the seen's own uprights is a real tooth | Lalezar |
| 03 | **خط اللثة** — the word stands on gums | Baloo Bhaijaan 2 |
| 04 | **الاسم داخل السن** — the name knocked out of a tooth | Lalezar |
| 05 | **المرآة** — a mouth mirror in the waw's counter | Lemonada |
| 06 | **القوس** — the name set along the dental arch | Marhey |
| 07 | **الرقعة على اللثة** — the same, in the calligraphic hand | Aref Ruqaa |

**01 is the recommendation.** It is the only one where the letter *becomes* the object
rather than carrying one — the kaf-is-a-book move — and it is the only one that survives
both tests in `insitu.png`: legible as a wordmark in a 26px header, and distinctive as an
app icon down to 18px.

**04 is an icon, not a lockup, and `insitu.png` is what settles it.** At 30px in a header
the knocked-out name is a smudge. It is the best stamp on the sheet and it needs a
separate wordmark beside it.

Weaker, and said plainly rather than left for him to work out: **02** still reads as a
smudge on the seen, **05**'s mirror is too small to carry its highlight at any size the
header would use, and **07**'s gum crests read as bread rolls.

### Nothing here is placed by eye

The first pass put the tooth through the middle of the word, because a letter's box says
nothing about where the strokes inside it are — the seen's three uprights sit in its right
two thirds and its tail sweeps out under the rest. So the geometry is measured and
committed, and every object is positioned off it:

- `glyphs.mjs` → `glyph-positions.json` — each letter's box, from a Range in the browser.
- `profile.mjs` → `ink-profile.json` — the ink skyline, whose peaks are the uprights
  inside a letter. This is what locates the seen's three teeth, the shadda, the waw and
  the two walls of the final noon's bowl.
- `measure.mjs` → `measurements.json` — the enclosed counters, found by flooding the
  background inward from outside the canvas. This is what ruled Lalezar out for the mirror
  direction and Lemonada in: Lemonada's waw counter has **fifteen times** the area.

Change the face and the objects move with the letters, because they are placed in em units
off these files rather than typed in as coordinates.

### `shapes.mjs` may never draw a letter

It holds the incisor, the molar, the roots, the mirror head and the gum line, and that is
all it is allowed to hold. The rule above — Arabic is typeset, never drawn — is the one
that keeps the name from turning into a word that does not exist, and a shape file is
exactly where it would erode.

### Rebuilding round four

`playwright` is deliberately **not** a dependency of the product: it is a docs tool, and
the app should not carry it. Install it alongside, fetch the faces into `fonts/` with a
`fonts.css` beside them, then:

    pnpm add -D -w playwright     # remove again when finished
    node audition.mjs             # every face against the real string, first
    node glyphs.mjs && node profile.mjs && node measure.mjs
    node sheet4.mjs  && node shot.mjs sheet4.html round4.png 1500 1200
    node insitu.mjs  && node shot.mjs insitu.html insitu.png 1240 900

`browser.mjs` names the sandbox's Chromium explicitly, because the browser build that
ships there will not match whatever the installed `playwright` expects.

**Audition first, always.** `audition.png` is ten faces set in the real string `سَنّون`;
all ten spell it correctly. Three of the fifteen faces tried in round three did not, and a
face is never judged on sample text.
