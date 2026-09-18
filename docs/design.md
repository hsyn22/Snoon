# Design and motion — the long version

Carved out of `CLAUDE.md` verbatim when that file was reorganised, because it is reference
rather than rules: a new session does not need to read it to start work, and it was a third
of what every session paid for in context.

**The binding rules are still in `CLAUDE.md`** under "Arabic and RTL", "UI conventions" and
"Motion". This file is the reasoning behind them — read it before changing anything about
the motion tiers, the landing page or the visual identity, and before answering a question
about a tool or a competitor for the second time.

---

### Motion, and the tools that were not used

Haider asked whether an AI site builder — blink.new was the example — could
design سنون, or "any other tool that produces unique animated websites". The
answer recorded here because it will be asked again:

**Not that class of tool.** blink.new and its siblings (Lovable, Bolt, v0) are
app *generators*: they write a codebase, provision a database and authentication,
and host the result. سنون is not a landing page. It is a case lifecycle with
atomic claiming, an access-control table enforced by projection types, EXIF
stripping, retention scrubbing, two-stage case handoff, day matching and 547
tests — and the privacy rules that make it safe to point at real patients are
exactly what a generator has no way to know about. Pointing one at this repo
does not design it; it replaces it.

Where such a tool **is** genuinely useful is the same place ClinMatch and
AsnanLink were: as a source of visual ideas. Prompt it, screenshot the result,
and treat the screenshots as reference — see `docs/competitors.md`.

**The want behind the question was right, and is answered in CSS.** Motion is in
`src/styles/motion.css`. No JavaScript, no library, no second request.

The arithmetic is most of the argument, and it is worth stating with figures that were
actually measured rather than remembered. **Corrected:** this file said "GSAP roughly 70KB
gzipped", which was wrong — 72KB is the *raw* minified size of the core. Measured from
cdnjs, gzipped, which is what the wire carries:

| | gzipped |
|---|---|
| `gsap` core | **28 KB** |
| `ScrollTrigger` | **18 KB** |
| `Flip` | **9.5 KB** |
| framer-motion | ~50 KB |

So GSAP core plus ScrollTrigger is **46KB against a 287KB page** — a sixth more, and the
second largest thing سنون downloads after the typeface. Real, but not the four-times
overstatement the old number implied. **GSAP is also free now**, plugins included, since
Webflow acquired it; "the paid plugins" is no longer a reason.

**The size is no longer the main argument. This is:** every scroll effect on this page runs
on a `view()` or `scroll()` timeline, which the browser drives **off the main thread**.
ScrollTrigger drives the same effects from a scroll handler **on** the main thread. On the
4x-throttled cheap Android this project exists to serve, swapping CSS scroll timelines for
ScrollTrigger buys nothing visually and makes the scrolling worse. It would be 46KB spent to
go backwards.

**And one plugin is actively unsafe here:** SplitText splits text per character, which breaks
Arabic letter joining — the rule this file states twice. Never point it at Arabic.

**Where GSAP genuinely earns its place — and it is the only place:** `Flip`, for the
shared-element page transition that React's `<ViewTransition>` cannot give us yet. That is a
real capability CSS has no answer for. What buys it without charging the median user is the
tier gate — `data-motion` is decided before first paint, so the script loads **only at
`full`, and only once the browser is idle**. A weak phone downloads nothing, measured.
**Built** — see "the shared-element morph" below. Nothing else here uses GSAP, and the
argument above is why: every scroll effect stays in CSS.

### Three tiers, chosen before the first paint

Haider's follow-up was the right one: keep this for middling phones, drop it for
weak ones, and give a capable device something much stronger. `[data-motion]` on
`<html>` selects between:

| tier | who gets it | what it is |
|---|---|---|
| `none` | ≤2GB, ≤4 cores, data saver, or a reduced-motion preference | nothing moves; no rule in `motion.css` applies |
| `standard` | **the default, and every unknown** | staggered entrance, scroll reveals, the drawn line, press and lift |
| `full` | ≥8GB and ≥8 cores (or ≥8 cores and a fine pointer where `deviceMemory` is unimplemented) | a drifting three-layer gradient mesh, the headline a word at a time, parallax depth on scroll, richer reveals, a glowing line tip |

Measured on the same Slow 3G rig, all three: **267 KB, first paint 2.2–2.3s,
loaded 6.8s.** `none` runs **zero** animations at runtime; `standard` thirteen;
`full` sixteen.

Things worth not undoing:

- **The decision runs as an inline script in `<head>`**, not an effect.
  `src/lib/motion-tier.ts` holds it as a string. An effect runs after paint, and
  on a slow connection the page is painted long before React arrives — which is
  exactly this visitor. Next's own "preventing flash before hydration" guide is
  this pattern.
- **`standard` is the server-rendered default and every fallback.** JavaScript
  disabled keeps it; React's Strict Mode remount in development resets `<html>`
  to it; an unrecognised browser stays on it; a thrown exception leaves it. The
  free tier is the floor, never the expensive one and never nothing.
- **The gate is `:not([data-motion='none'])`, not a list of the two tiers that
  animate.** Everything that starts at `opacity: 0` must fail towards visible, so
  an attribute that is missing or momentarily cleared shows content rather than
  hiding it.
- **The full tier's CSS lives in the same stylesheet everyone downloads**, which
  looks wrong and is not. It is about a kilobyte compressed; a second stylesheet
  fetched only by capable devices would cost a 400ms round trip before a byte
  arrives, against roughly twenty milliseconds of transfer. The separate file is
  the more expensive option, and expensive for exactly the phone being protected.
- **`deviceMemory` is capped at 8 by spec** to limit fingerprinting, so `>= 8`
  means "8GB or more". `hardwareConcurrency` alone is a weak signal on Android,
  where mid-range chips report eight cores of which four are small — it only ever
  promotes a device in combination with memory or a pointer.
- **`?motion=none|standard|full` overrides the detection**, so a tier can be seen
  on a real phone rather than inferred. It matches those three literals only: the
  value goes straight into an attribute that selects CSS.
- **Arabic is split per word, never per letter.** Arabic shapes each letter
  according to its neighbours inside a word, so wrapping letters individually
  breaks the joins and renders a headline as disconnected forms. Words shape
  independently, so splitting on spaces is safe — and it is the only split this
  codebase should ever do to Arabic text. The split is server-rendered, so even
  the full tier's headline effect involves no JavaScript.
- Deliberately **not** read from client hints. The server could be told the
  device memory by header, but reading headers in the root layout opts the whole
  app out of static prerendering, and a statically served landing page is worth
  more to a patient on a slow connection than a perfectly chosen tier.

`tests/motion-tier.test.ts` runs the real script string against a fake browser —
it ships as a string, so it is neither type-checked nor linted, and that is the
kind of code that rots quietly.

Rules it follows, and which new motion must follow too:

- **Transform and opacity only.** Both composite on the GPU. Animating height,
  top or margin is where a cheap Android starts to stutter.
- **Never hide content that motion might not reveal.** The scroll-driven rules
  live inside `@supports (animation-timeline: view())`, and the `opacity: 0`
  starting state is set *inside* that gate — so a browser without support shows
  the text plainly. A missing animation must degrade to visible, never to blank.
  That ordering is the safety property; putting the starting state outside the
  gate would blank the page on an unsupported browser.
- **`prefers-reduced-motion` wins**, and the global rule zeroes delays as well as
  durations. Verified: under the preference nothing on the landing page renders
  below half opacity at first paint, while the same page without it starts with
  seventeen elements hidden and animates them in.
- **A scroll-driven animation does not finish — it freezes where the reader
  stopped.** This is the property to keep in mind above every other rule here,
  and getting it wrong produced the worst bug of the design work: at the `full`
  tier a third of the screen sat permanently blurred, because cards were still
  inside a long `animation-range` when somebody stopped scrolling. A `view()`
  timeline is tied to scroll position, not to a clock, so a half-played reveal
  stays half-played indefinitely. Two consequences, both now enforced:
  **every reveal range ends inside `entry`**, so an element is fully resolved by
  the time its top edge finishes entering the viewport; and **only properties
  that stay readable half-applied may be animated** — opacity and a small lift
  qualify, `filter: blur()` does not. Blur was also a violation of this file's
  own first rule, since it is not a free compositor property. The one range left
  deliberately long is the line down the "how it works" steps, where tracking the
  reader *is* the effect. `frozen.mjs`-style checking — stop at many scroll
  positions and assert nothing on screen is part-drawn — is how this was caught
  and is worth repeating after any change here.
- **A full-page screenshot will tell you the page is broken when it is not.**
  Playwright's `fullPage` capture does not drive a scroll timeline, so every
  section below the fold comes back blank — the landing page photographs as a
  headline followed by two thousand pixels of empty grey. That is the tool, not
  the page. Verify scroll-driven work by actually scrolling: step down the page,
  screenshot the viewport at each stop, and run the part-drawn sweep. Judging
  this from one tall image is how somebody "fixes" an animation that was fine.
- **A tier has to be visibly different or it is not a tier.** The first attempt
  failed this, and Haider's verdict was exact: "there is not a lot of difference
  between the normal and the strong — it's only the header." The mesh and the
  parallax were tuned so far down that on a phone the only visible difference was
  the headline arriving a word at a time. The fix was not more effects but
  **sequence**: at `full` a grid reveals its cards one after another
  (`.stagger`, driven by shifting `animation-range` per child rather than by a
  delay, which would fight the scroll timeline and stall if somebody stopped),
  and section headings draw their own rule (`.rule-in`, animating `clip-path` so
  nothing reflows).
- **The second full-tier pass**, after "أريد يكون فعلاً قوي". The rule it follows is that
  every addition has to be something the standard tier does not do *at all*, rather than more
  of the same effect: a mote travelling the bridge curve on an `offset-path`, the badge's ring
  breathing, section headings arriving from the start edge instead of from below, cards
  tilting up from a bottom origin, and chips scaling in. Peak concurrent animations on the
  landing page: **52 at standard, 71 at full.**
- **The mote is the only loop in سنون**, and a deliberate exception to "nothing loops in the
  reader's peripheral vision". The picture's whole claim is that something passes between two
  people; a still line asserts that, a moving one shows it. It is 4.5 units on a 340-unit
  drawing, it moves at walking pace, and it is inside a figure the reader is already looking
  at.
- **Never use the `animation` shorthand on anything inside `.stagger`.** The shorthand resets
  every animation longhand it does not name, `animation-range` included — and the per-child
  ranges that drive the stagger are set by an equally specific rule earlier in the file. Doing
  this reverted every staggered child to the default `cover 0% cover 100%` range, which only
  completes once an element has scrolled off the *top*, so a chip sitting in the middle of the
  screen sat frozen at six per cent opacity. It is the frozen-reveal bug in its least obvious
  form: nothing about the CSS looks wrong. Use `animation-name`. The part-drawn sweep is what
  caught it, and is the reason to keep running it.
- **The register is calm.** This site asks people who cannot afford a dentist to
  trust it with a photograph of their mouth. Nothing bounces, nothing spins,
  nothing slides in from off-screen, and nothing loops in the reader's
  peripheral vision while they are trying to read. The page should look like it
  is settling, not performing.
- Hover effects are behind `@media (hover: hover)`: on a touch screen `:hover`
  sticks after a tap and leaves one card looking selected for no reason.

The 3D/WebGL landing scene is still out — see "The landing page" below. This is
what replaces it, at a cost that can be stated in kilobytes.

### Measured on a slow phone

Non-negotiable 7 is a claim, so it was measured rather than assumed: a production build,
Chrome throttled to Slow 3G (400kbps, 400ms RTT) with the CPU at 4x, on a 360px viewport.
Transfer is the wire size — `content-length` is reported decoded and overstates a gzipped
response several times over, which is the whole question on a slow connection.

| page | transferred | first paint | loaded |
|---|---|---|---|
| landing | 167 KB → 269 KB → **287 KB** | 1.7s → 2.1s → **2.5s** | 4.8s → 6.8s → **6.9s** |
| `/case/new` | 172 KB → 269 KB → **280 KB** | 1.7s → 2.0s → **2.5s** | 4.9s → 6.8s → **6.9s** |
| tracking, with a photograph | 194 KB | 1.7s | 5.3s |
| `/case/new`, second visit | 1 KB | 0.5s | 0.6s |

The second numbers are after the design pass, and the difference is almost entirely the
typeface: about 94KB across four files. It was accepted deliberately rather than by accident.
`display: 'swap'` means text paints in the fallback at first paint and the real face swaps in
later, so **nothing is blocked** — first paint moved 0.4s, not four seconds — and a returning
visitor pays none of it. The alternative was a product that looks unfinished to the students
it needs to recruit. If that trade ever looks wrong, it reverses by changing two lines in
`layout.tsx`.

The one real failure it found: **a case with photographs took 23 seconds and 1.1MB**, because
the grid showed them at about 170px wide and was sending the full 1600px file. Payload now
generates a 480px `thumb` on upload and `/api/case-photos/[id]?size=thumb` serves it —
same authorisation, falling back to the original when a photograph predates the size, so a
missing thumbnail is slow rather than broken. That is 194KB and 5.3s.

Worth knowing when changing anything here:

- **A new image size needs a Payload migration.** The sizes are columns on the upload
  collection; without `payload migrate` the size is silently not generated.
- **A stale `.next` will lie to you.** Twice during this work a build served an older bundle
  and the thumbnail appeared not to be generated at all. `rm -rf .next` before measuring
  anything.
- Upload is the patient's cost, not download: at 400kbps a 12MB photograph is roughly four
  minutes. Raised with Haider and **kept at 12MB** — photographs are optional, so a patient
  on a slow connection can simply not send one, and a limit that rejects a real photo is
  worse than one that is occasionally slow.

### The landing page

**It was too short, and that was the real problem.** Haider compared it against
ClinMatch and AsnanLink and said the obvious true thing: theirs are several times
the length of ours. The gap was never polish — the page answered almost none of
the questions a patient arrives with. Four sections were added, and each exists
because a real question had no answer:

- **What can I get?** — the treatment list, read from Payload. A patient's first
  question is whether their problem is covered at all, and سنون never said.
  ClinMatch puts the same chips in their hero.
- **What happens to my number?** — the one section neither competitor can write,
  because neither does the work behind it. Every line is something the code does:
  one student ever sees the number, and only after claiming; GPS is stripped from
  photographs; contact details are erased after the retention period; nothing is
  collected that matching does not need.
- **Does it work where I live?** — the city list, also from Payload, and with it
  the plain admission that سنون is new and some cities will be quiet. A patient
  who hears nothing should know why rather than assume the site is broken.
- **An FAQ**, as native `<details>`. Both competitors script their accordion;
  this one needs no JavaScript, works before hydration, and is already understood
  by a screen reader. **It is in two groups now**, one per audience: it was eight
  patient questions with a single student one at the bottom, which tells a student
  exactly what the old copy did — that سنون is a site for patients that will also
  take their registration if pressed. The students' heading carries their orange,
  the second and last place that colour appears on an otherwise green page, and
  for the same reason as the first: it names a section students own rather than
  decorating one. Every student answer is something the code actually does, which
  is the point of them — whether their number is safe, whether a case can be taken
  back, and whether سنون charges are all answered by the access-control table, the
  contact window, and the fact that there is no payment code anywhere. That last
  one is the answer عالجني cannot write.

Then a second pass, after Haider looked at it on a phone: **visual elements**,
because the page was still text in boxes. The hero gained `MatchMotif` — two arcs
rising from opposite corners to meet, which is the product's own idea drawn as a
shape rather than decoration, and the answer to a hero with nothing to look at
when سنون has no photography and should acquire none. Each safety point and each
step gained its own icon instead of four identical ticks. The mesh was calmed at
the same time: the warm layer at 0.4 opacity read yellow-green and muddy against
the teal rather than warm, and now sits at 0.16.

The page reads Payload now, so it carries `revalidate = 300` like `/case/new`.
Cost of roughly tripling the content and adding the artwork: **277 KB against
267**, first paint 2.5s against 2.3s. The bridge, the footer columns and the
extra motion rules took it to **285 KB**, first paint 2.6s — eight kilobytes for
the picture that explains the product. The copy pass, the stronger full tier and the step
cards land it at **287 KB**, first paint 2.5s.

**Three things were cut from this page, all on Haider's instruction and all worth not
re-adding:**

- **The row of four ticks under the hero.** ✓ سنون مجاني · ✓ العلاج بعيادة الجامعة · … It
  said nothing the three promise cards above it had not, and it spent the tick — which is
  doing real work on the treatment chips — on filler. A tick everywhere is a tick nowhere.
- **"متجر سنون — قريباً".** A promise the site cannot keep; see the store section.
- **The stage caveat under the treatments** ("not every treatment is available at every
  stage…"). True, and detail nobody needs before submitting: the matching already handles it.

**The hero's picture is the hero.** It sat under the buttons, four scrolls down on a phone,
which made it an illustration of something the page had already finished saying. It is now
beside the headline from `md` up and directly under it below that — the first thing a visitor
looks at, explaining سنون before they read a word, which is what it was drawn for. Placement
is explicit `col-start`/`row-start`, not `order`: three children in a two-column grid wrap,
and `order` only re-sequences them into the same wrong cells.

**The three UI libraries in the reel Haider sent — Animaster Lib, Skiper UI, Vengance UI.**
Asked whether they could make something visually astonishing. Recorded because the question
will come back:

- **They are not installable dependencies.** They are shadcn-style "copy the component into
  your repo" collections, most of the good parts behind a PRO paywall, and what they copy in
  is React components built on framer-motion, GSAP and — for the WebGL shader ones —
  three.js. three.js alone is around 150KB gzipped against a 287KB page.
- **The register is wrong, and that matters more than the weight.** Their house look is
  dark-mode agency: neon shaders, scrambling type, cursor trails, a spinning 3D object over
  near-black. سنون asks people who cannot afford a dentist to trust it with a photograph of
  their mouth, and this file already records that the register is calm. A nightclub hero
  would not read as premium here; it would read as a different company.
- **Two of their categories are pointless for this audience** — Mouse Effects and Hover
  Effects are pointer-only, and the median user is on a touch screen.
- **What is worth taking is the composition, not the code**: the picture as the hero rather
  than as a footnote (done), and **page transitions**, which is the one thing in that list
  that would genuinely raise the product and costs nothing — the View Transitions API is
  native. Note before starting it: `ViewTransition` is not exported by the installed
  `react` 19.2.8, so it would come from the canary React that Next bundles for the client,
  and that needs verifying rather than assuming. It also could not be judged in the
  single-file preview, which had no navigation at all — **the preview now carries both the
  landing page and the case form and swaps between them**, precisely so the morph can be felt
  on a phone before there is a deployment. See below.

**The steps are a rail, not a stack.** Haider's note, and it is right twice over: four cards
stacked is four screens to scroll past before the page continues, and a sequence laid out
side by side reads as a sequence. One card in view with the next peeking, swiped through,
snapping — native `scroll-snap`, nothing scripted — and four across with no scrolling at all
from `md`. It is also the shape ClinMatch uses for the same content.

The progress bar under it is driven by `scroll-timeline: --snoon-rail inline` on the rail and
`timeline-scope` on the section. A **named** timeline, not `scroll(self)`: the bar is a
sibling of the rail rather than a descendant, so it has no scrollable ancestor to read, and a
named timeline published by the rail is the only way to drive it. Its fallback is
`inline-size: 100%` — a progress bar stuck at zero looks broken, one stuck at full reads as
"nothing to scroll here".

**Page transitions: what is actually possible, and what is not.** Asked for after the
four-card motion reference. Checked rather than assumed:

- **React's `<ViewTransition>` is not available.** `react` 19.2.8 does not export it, and
  Next's bundled `react-experimental` has it only as a symbol. Using it means putting the
  whole app on React experimental, which is not a trade this product makes for an animation.
- **The CSS-only `@view-transition { navigation: auto }` is cross-document**, so it does not
  fire on Next's client-side navigation. Getting it would mean replacing `<Link>` with plain
  `<a>` — losing prefetch, and making the browser hold the old page until the new one is
  ready. On a 400kbps connection that is a frozen screen, which is non-negotiable 7 traded
  away for a flourish.
- **What is built instead:** `.page-enter` on every page's `<main>`, in `PageShell` and on
  the landing page. The arriving page fades and lifts over 260ms on mount, which is when the
  App Router swaps the segment. Not a shared-element morph, but navigation reads as a move
  rather than a cut, and it keeps client-side routing and prefetch. Revisit when
  `<ViewTransition>` ships in stable React.

**And then the shared-element morph, with GSAP Flip.** Asked for directly — "نكدر نستعمل
GSAP؟", then "سويه". `src/components/page-transitions.tsx`. Tapping the landing page's primary
button makes it *become* the case form's heading: it travels up the screen and grows into it,
rather than one page cutting to another. It is the one effect in that whole reference
catalogue that CSS here has no answer to, and it is the case this file already named as where
GSAP would genuinely earn its place.

The reason it is affordable is the tier gate, and the gate is the point rather than a detail:

- **Three gates, in order, before a byte of GSAP is fetched.** `data-motion === 'full'`; no
  `prefers-reduced-motion`; and the import runs inside `requestIdleCallback`, so it never
  competes with anything on the critical path. The `import()` is dynamic so it becomes its own
  chunk, and a chunk is only fetched when the import runs.
- **Measured, same build, same 360px viewport:** `none` **283 KB / 18 requests**, `standard`
  **283 KB / 18 requests**, `full` **322 KB / 21 requests**. The two cheap tiers are
  byte-identical — the median phone this project exists to serve downloads nothing for this.
  Slow 3G on the landing page is unchanged at **284 KB, first paint 2.6s**.
- **Everything degrades to the `.page-enter` fade.** GSAP not loaded yet, the destination
  missing its half of the pair, anything thrown — the navigation is an ordinary one. A
  transition is the last thing that may ever break a link.

Two findings worth not rediscovering:

- **`absolute: true` is the obvious setting in `Flip.from` and it was wrong here.** Lifting the
  heading out of flow for the flight let the rest of the arriving page collapse upwards by its
  height and then drop back when it landed — a jolt through the whole form, on the one page a
  patient must never find unsettling. In flow, the destination is laid out correctly from the
  first frame and only the heading moves. Keep `scale: true` (size by transform, so the flight
  stays on the compositor) and leave `absolute` off.
- **Capture on `click`, in the capture phase — not on `pointerdown`.** `pointerdown` fires for
  taps that never become navigations: a drag away, a modified click that opens a new tab. Each
  one left `data-flipping` set on `<html>`, which suppresses the CSS fade for *every later
  navigation*, and left stale bounds in `pending` so the next flight would start from somewhere
  the reader never tapped. Capture-phase `click` runs before Next's own handler while the old
  page is still on screen, and modified clicks are skipped. A 1200ms expiry then clears any
  capture whose navigation never arrived, because a click can still be cancelled downstream or
  a route can fail. Verified by blocking the navigation in a capture listener and watching
  `<html>` come back clean.

**The preview artifact carries two pages now**, built by `snapshot.mjs` in the scratchpad.
Three things about it that are easy to get wrong a second time:

- **It loads GSAP from cdnjs, behind the same gate as the real site** — `full` tier only, and
  only once the browser is idle. A preview that always loaded it would misreport what a given
  phone actually gets, which is the one question the preview exists to answer.
- **The second page rides in a `<script type="text/html">` block**, with `</script>` escaped
  inside it. Anything else and the case form's own markup closes the tag early.
- **Nothing in a preview may submit**, so `submit` is cancelled globally — and the send is
  then *played*: the spinner runs, and after a beat the real success card appears. Only that
  one card is lifted from a real submission, never the page around it, because that page
  carries a name, a number and a live tracking token. `successcard.mjs` refuses to write the
  file if anything matching a phone number or a token is inside it, and `previewsend.mjs`
  checks the built preview again.
- **The pending label is read from the button's `data-submitting`**, not copied into the
  preview script. One string in `copy.ts`, so the preview cannot drift from the product.

### The five tool cards, and what was taken from them

Haider sent five: backgrounds.supply, transitions.dev, deck.gallery, godly.design,
animos.app — asking which could be used, and for "something premium for the strong version".
Fetched rather than judged from the cards. **One of the five has anything that goes into this
codebase.**

- **transitions.dev — yes, and free.** 37 transitions outside the paywall, as CSS and React
  snippets. Most are wrong here for reasons this file already states: pointer-only ones
  (3D tilt with cursor glare, avatar-group hover, card-stack hover) miss a touch-screen
  median user; the accordion animates `height`; confetti on a medical form is grotesque; and
  the loops (shimmer text, organic shimmer) are what "nothing loops in the reader's
  peripheral vision" exists to exclude. **Three were taken** — success check, spinner-to-check
  and error-state shake — and all three were rewritten rather than copied, because theirs
  animate `filter: blur()` and `height`.
- **godly.design — yes, but not as code.** A free gallery, the same use as ClinMatch and
  AsnanLink in `docs/competitors.md`: reference, screenshotted, never pointed at this repo.
- **backgrounds.supply — no.** $49 one-off for 1,273 background *image files*. A single one
  is a multiple of what this whole page weighs, and their house look is dark neon, which is
  the register argued against twice above. Genuinely useful for Instagram and launch
  graphics, which is a different problem.
- **deck.gallery — not for the site.** Presentation decks. Worth keeping for the day a dental
  college has to be pitched.
- **animos.app — not for the site.** It exports MP4s of a design. A marketing tool.

**What was built, and why these three.** All from the free tier, all in CSS, no library, and
each one attached to a moment that had nothing:

1. **The spinner in the submit button.** `useFormStatus` already swapped the label; on a
   400kbps link with a photograph attached, nothing else on screen moved for several seconds.
   The ring is the only loop in سنون besides the bridge's mote, and the exception is the
   opposite of the mote's: this is not peripheral, it is the thing somebody is staring at
   while they wonder whether the site has died. Under `prefers-reduced-motion` and at `none`
   it sits still and the words carry it.
2. **The tick that draws itself on `?new=1`.** The single most important screen in the
   product — a patient has just handed over a phone number and a photograph of their mouth —
   and it opened with a paragraph. It draws on a clock, never a scroll timeline, for the same
   reason the bridge's line does: a half-drawn tick reads as a failure. At `full` the ring
   answers with one outward pulse and then stops; a success that keeps pulsing reads as a
   notification demanding something.
3. **The shake on a form-level refusal.** 4px and settles, against their 10px four times —
   this is a medical form, not a wrong password. Deliberately **not** on field errors: those
   sit under the field somebody is already looking at, while a form-level error appears at
   the bottom with nothing else changing, which is the one that gets missed.

**The safety property is the reveal rule stated backwards, and it is what to check after any
change here:** the finished state is what the markup renders, and the unfinished state exists
only inside the motion gate. Verified by driving a real submission at all three tiers and
under `prefers-reduced-motion`: the tick ends at `stroke-dashoffset: 0` every time, with
nothing left running. Nothing here can leave a success looking like a failure.

**A landing-page measurement includes prefetch.** The wire figure moved 283 KB → 292 KB
between two clean builds with no landing-page change, which is Next prefetching `/case/new`
and `/student` from the hero buttons — so making the case form bigger shows up on the landing
page's number. It is paid once and is why a second visit to `/case/new` measures 1 KB. Worth
knowing before hunting a regression that is not there.

### What ClinMatch and AsnanLink actually do better, and the one thing taken

Haider sent screen recordings of both and said their animation is better, ClinMatch
especially. Watched frame by frame rather than judged from a description — `ffmpeg` into
contact sheets, then a dense burst across one carousel advance.

**The finding that mattered is not what it looked like from a distance.** ClinMatch's step
carousel appears to slide; it does not. The card sits still and **the illustration inside it
animates** — a profile card whose fields fill in and gain a tick, a listing being picked out,
a calendar confirming a day. Their step cards carry a small picture of the step *happening*
rather than a symbol labelling it, and on a page explaining an unfamiliar process to somebody
who has never used one, that is most of the difference between the two pages.

**So that is what was taken.** `src/components/brand/step-scenes.tsx` — four scenes replacing
the four icon tiles in the steps rail. One rule governs all of them and it is the point:

- **Every scene is drawn complete in the markup; animation only ever adds motion on top.**
  No line starts empty, no tick starts undrawn, nothing starts at `opacity: 0`.

That is deliberately *not* how ClinMatch do it. Theirs assemble from nothing, which is
prettier and which this codebase cannot safely copy: a reveal that plays from empty has to be
triggered, and CSS offers only a clock (which fires while the card is still far below the
fold, so it is over before anybody looks) or a scroll timeline (which freezes where the reader
stopped — the bug that once left a third of this page blurred, and which here would leave a
half-drawn tick reading as a failure). Starting complete removes the entire class of problem:
there is no tier, browser or scroll position at which one of these is part-drawn. Verified by
sampling every animated element's opacity twelve times across the cycle at all three tiers —
**nothing ever drops below 0.35**, and `none` and `prefers-reduced-motion` run zero
animations.

This is the second deliberate exception to "nothing loops in the reader's peripheral vision",
after the bridge's mote, and the argument is the same: these sit inside cards somebody swipes
to and looks at, and each one's claim is that something *happens* at that step. Every cycle is
slow, small, and mostly pause.

**A scene has to be judged at its real size, not in the editor.** The queue scene was built
as white rows on a pale ground with a translucent band sweeping across them; at 96 pixels the
rows did not separate and the band read as a smear. It was rebuilt as solid bars with real
gaps and the taken case as the only coloured thing in the picture. Contrast between
neighbouring shapes is the whole job at this size.

Cost: **286 KB, first paint 2.7s** — unchanged, because four inline SVGs and a block of
keyframes are noise against the typeface.

**What was deliberately not taken:**

- **ClinMatch's auto-advancing carousel.** It is motion, and it is the wrong kind: it takes
  control from the reader, fights a slow phone, and is an accessibility problem. Our rail
  snaps and reports its position with a scroll-driven progress bar, which is the honest
  version of the same idea.
- **AsnanLink's hero.** A tilted device mockup with floating chips — "New Cairo", "Patient A
  Needs A Crown Fix", "It's A Match!" — staggering in on load. Well made, and it is a
  screenshot of an app سنون does not have. The bridge diagram already does that job without
  inventing a product.
- **AsnanLink's flip countdown to launch.** سنون has no launch date and must not invent one.

**And the one thing left on the list is now built: each audience has its own colour.**
ClinMatch run patients green and students amber throughout; Haider chose orange for students
and green for the people they treat. It answers "nothing talks to students" in a way copy
alone could not — a student who lands on `/student` is on a page that is visibly theirs.

Four things about it that are not obvious and should survive:

- **The scope is surfaces one audience owns, not decoration.** `/student/*` is orange
  throughout, each figure in the bridge wears their own, and a student call to action is
  orange wherever it appears — including the landing page's second button, which is the one
  place the orange appears on a green page and is exactly the point. The landing page itself
  stays green: it is the door both audiences come through, and a page in two brand colours
  reads as two products rather than as one with two sides.
- **It is one wrapper and one class, not an edit to twenty components.**
  `student/layout.tsx` wraps everything in `.student-area`, which re-points the accent tokens
  at the orange ramp. Every `text-accent`, every `tone="accent"` card and every primary button
  inside turns orange on its own, and no component learns that audiences have colours. That is
  what keeps `tokens.css` the only place a colour lives — the rule this whole file rests on.
- **A filled button and accent-coloured text are now two different tokens.** They were one,
  and light orange cannot do both jobs: white on a 75% orange is about 2:1, and an orange dark
  enough to carry white is brown — which is literally what the first attempt shipped, and not
  what was asked for. So `--color-accent-fill` is what a button is made of and
  `--color-accent` is what text is made of. On the teal they are the same value and the
  patient side is byte-identical; on the orange the fill is light with near-black ink on it,
  and the text is a darker orange that reads at label size. Any new filled surface uses
  `-fill`, or it will go brown the next time somebody re-themes.
- **The warning colour moved from amber to a light red**, on Haider's instruction, because
  amber at 75° sat right beside the students' orange and a warning ribbon has to be
  unmistakably not a brand colour. Danger went deeper at the same time so the two reds
  separate. Two reds is only affordable because every ribbon carries its Arabic label as well
  as its colour — that rule is what pays for this, and is not one to relax later on the
  strength of having got away with it here.

**The steps were cards before they were a rail.** Four sentences each with a 16px icon read, in Haider's words, as
icons put there to fill a gap rather than to mean anything — which was fair. Each step is a
card with a real icon in a tile at the size of the number beside it. The casualty is the long
drawn line that used to run behind them: an opaque card sits on top of it, so it became
invisible the moment they became cards. What replaces it is a short connector in each gap,
aligned to the icon tiles, arriving with its own card.

**The bridge diagram — built.** `src/components/brand/match-bridge.tsx`. Haider's idea and
the right one: a student in a lab coat on one side, a patient on the other, a line joining
them with the name sitting on it. It is the one picture that explains سَنّون without a
sentence, and it replaced `MatchMotif` in the hero rather than joining it — the abstract and
the literal must not share a hero, so the motif moved to the closing band, where being
decoration is the whole job. Rules it inherits and which any change must keep:

- **No faces.** The heads are plain circles. A figure with eyes would also make it a picture
  of two particular people rather than of two roles.
- **Inline SVG**, like `MatchMotif` and the icon set, and **colour from tokens** rather than
  literals so `tokens.css` still re-themes everything.
- **The two figures are different colours on purpose** — accent and warm. They are not the
  same person, and what each has that the other needs is the entire product.
- **It sits on light surfaces only.** The accent-coloured student would disappear on the
  accent band; moving it there needs a variant, not a copy.
- **The line animates on a clock, not on a scroll timeline**, at every tier that animates.
  A `view()` timeline freezes where the reader stopped, and a half-drawn line between two
  people reads as a broken connection rather than a made one. It is also the one place other
  than the motif arcs where `stroke-dashoffset` is allowed against the transform-and-opacity
  rule: there is no transform that draws a line.

The line is deliberately plain. What belongs on it is open, and the badge holds the place
with the wordmark until there is a logo.

**Nothing on it overstates.** No testimonials, no user counts, no waiting time,
and — deliberately — no claim that the treatment itself is free, only that سنون
takes nothing. Whether the university charges for materials is not ours to state
and is not known; see the open question below.

A cinematic 3D clinic scene is described in the product vision. **It is not in the MVP.**
It is the single most expensive, slowest, most performance-risky part of the plan, and it
sits in front of a product whose value is matching patients to students. Build a fast,
warm, Arabic-first landing page with three clear entry points — patient, student, supplies —
and revisit the cinematic entrance in v2 once matching works.

If asked to build it anyway, raise the performance cost on low-end Android first.

---

