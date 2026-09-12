# Design brief for سنون / SNOON

Hand this whole file to a fresh Claude Design session. It is written to be
self-contained — that session has no access to the codebase, so everything it
needs is here, including the real Arabic copy.

Bring back: **a logo**, and **one page layout** (the landing page).

---

## The product, in plain words

سنون (pronounced *snoon*, Latin **SNOON**) connects two groups of people in Iraq
who each have something the other needs.

**Patients** who cannot afford a private dentist. Dental care in Iraq is expensive
and most people put it off until it hurts badly.

**Dental students** in their 4th and 5th year, who must treat a set number of real
patients to graduate. They spend a lot of effort finding those patients — asking
relatives, posting in group chats, standing outside the clinic.

Treatment happens **at the university's own teaching clinic, supervised by faculty**.
سنون does not treat anybody, does not employ anybody, and takes no money from
either side. It is a matching service and nothing else.

A patient fills in a short form — their city, what treatment they need, which days
they can come, their phone number, optionally a photograph of the problem. A
verified student sees cases matching their year and clinic, claims one, and only
then sees the phone number. They ring, agree a time, and treat them at the clinic.

---

## Who is looking at this, and what they are feeling

**The patient** is on a cheap Android phone, on a slow connection, possibly
embarrassed about the state of their teeth, and being asked to hand their phone
number and a photograph of the inside of their mouth to a website they have never
heard of. They are the person this exists to serve and the one with the most to
lose. **The single job of the design is to make them feel this is safe and real.**

**The student** is a busy 22-year-old who needs cases to graduate. They come back
to the site repeatedly and want it fast and dense, not beautiful. They are also
the harder group to recruit: if the site looks amateur, they will not sign up, and
without students there is nothing for the patients.

So the site has to look finished enough to convince a student, and warm enough to
convince a frightened patient. That tension is the whole design problem.

---

## The name, and how to write it

- Arabic **سنون** is primary. Latin **SNOON** is secondary.
- **Never write سَنّون.** With a shadda it is a different word. No diacritics, ever.
- The Arabic is the brand. If only one form can appear, it is the Arabic one.

---

## Language and direction — read this before drawing anything

**The product is Arabic and right-to-left.** RTL is the default, not a mode, not a
toggle. There is no English version and none is planned.

- Everything flows **right to left**. The logo sits top-**right**. Text aligns
  right. Arrows point **left** to mean "forward".
- **Do not lay out with Latin placeholder text.** Real Arabic is included below —
  use it. Latin placeholder hides RTL layout bugs that only appear with real
  content, and this has bitten the project before.
- Numbers stay Western (`1234`) and run left-to-right inside right-to-left
  sentences. Phone numbers and case reference codes (like `SN-4KP7QW`) are
  left-to-right runs inside Arabic paragraphs — they need visible breathing room
  so they do not collide with the surrounding punctuation.
- Arabic sits taller than Latin and needs more line height. Arabic also has no
  capital letters, so **an all-caps small label does not exist** — weight, size and
  colour are the only tools for that job.

---

## Hard constraints — what will be thrown away if you design it

These are not preferences. The median visitor is a low-end Android phone on a
connection measured at 400kbps. Anything violating these cannot ship:

1. **No photography.** None exists, and stock images of a stranger's teeth or a
   model in scrubs would be worse than nothing. Everything must be drawable in
   CSS and inline SVG.
2. **No video, no 3D, no WebGL, no scroll-driven animation.** A cinematic entrance
   was in the original vision and was cut for exactly this reason.
3. **No icon fonts and no icon packages.** Icons must be simple enough to draw as
   inline SVG paths — a pin, a calendar, a clock, a tick.
4. **One typeface, already chosen: IBM Plex Sans Arabic.** It is self-hosted and
   costs about 94KB, which is the single largest thing the site downloads. Two
   weights only, Regular (400) and Bold (700). **Do not introduce a second family
   or a third weight** — design within 400 and 700. If you need a display
   treatment, get it from size, colour and spacing.
5. **Design the 360px-wide phone first.** A laptop view is a nice-to-have. Tap
   targets never below 44px.
6. **The page must be readable the instant the HTML lands**, before any JavaScript.
   Nothing important may depend on hover, on a carousel, or on a script running.

You are not being asked to design within a poverty of ideas — you are being asked
to get richness out of colour, type, shape and space rather than out of assets.

---

## What exists today, and how much of it is negotiable

There is a working product with a first-pass identity. Treat it as a starting
position to confirm or overturn, not as a constraint.

**Colour.** A deep teal accent with a warm sand beside it, chosen to avoid the
corporate blue every clinic site uses, because the site asks frightened people to
trust it and cold blue is the wrong register. Current values, in OKLCH:

```
accent            oklch(48% 0.085 195)   deep teal — every primary action
accent-strong     oklch(38% 0.075 198)   its pressed/hover state
accent-muted      oklch(95% 0.025 195)   tinted surfaces
warm              oklch(72% 0.12 65)     warm sand — highlights, never a CTA
warm-muted        oklch(96% 0.03 75)
background        oklch(98.5% 0.004 195) off-white, carrying a trace of the accent hue
surface           oklch(100% 0 0)
surface-muted     oklch(96.5% 0.008 195)
border            oklch(91% 0.01 195)
foreground        oklch(24% 0.02 210)
foreground-muted  oklch(52% 0.015 210)
positive          oklch(52% 0.11 155)
warning           oklch(68% 0.13 75)
danger            oklch(54% 0.17 25)
```

**Tell us plainly whether this palette is right.** If teal is wrong, say so and
propose a replacement — changing it is one file. A competitor doing the same thing
in the US landed on almost the same teal independently, which is either
reassurance or a reason to differentiate; your call, but say which and why.

**The mark.** There is a placeholder: a line-drawn tooth with two small joined
circles in the crown, standing for the connection. It is adequate and it is not an
identity. **Replace it.**

**Light only.** There is no dark mode and none is planned.

---

## Deliverable 1 — the logo

A mark plus the Arabic wordmark سنون.

What it has to survive:

- **16px**, as a browser tab favicon, in one colour.
- **28px**, beside the wordmark in the site header — which is where it lives 99% of
  the time.
- A **single flat colour**, inheriting whatever it sits on: teal on white, white on
  teal, white on a dark footer. It must work with no fills and no gradients.
- Being drawn as **inline SVG in a 32×32 viewBox** — a few hundred bytes of path
  data, not an image file. That is a real constraint: if it needs fine detail or
  many shapes to read, it will not survive.

Where to look for the idea: the product is **a connection between two people**, one
of whom needs care and one of whom needs to learn. Teeth are the obvious
territory and the obvious trap — a literal tooth is what every dental clinic in
the world already uses. A smile, a link, two halves meeting, a bridge, the letter
س, the shape of a dental arch — all fair game. So is rejecting teeth entirely.

**Please give three directions, not one refined answer.** Each with a one-line
rationale, each shown at 16px / 28px / large, each in teal-on-white and
white-on-teal. We will pick one and ask you to refine it.

Two warnings from this specific market: avoid anything that reads as a hospital or
a government ministry, and avoid the cartoon-tooth-with-a-face that budget dental
clinics use — the students will not take it seriously.

---

## Deliverable 2 — the landing page

One page, laid out for a **360px phone**, with a note or a second artboard on how
it widens to a laptop.

This page has three jobs, in this order:

1. Say what سنون is in one line.
2. Get a patient to the case form.
3. Tell a student there is something here for them.

Everything else is subordinate to those three. There is a third audience — a future
dental supplies store — that must keep a visible place in the navigation model but
is **not built and must be shown as unavailable**, not as a live link.

### The real copy — lay out with this, not with placeholder

Top bar

- Brand: `سنون`
- One link: `للطلبة`

Hero

- Small label above the headline: `علاج أسنان بإشراف جامعي`
- Headline, two-tone — first half in the accent colour, second half in the text
  colour: `علاج أسنان` + `تكدر توصله`
- Sub-headline: `طلبة طب الأسنان بالسنة الرابعة والخامسة يحتاجون حالات لدراستهم. انت تحتاج علاج. سنون يوصّل بينكم، والعلاج يصير بعيادة الجامعة تحت إشراف الأساتذة.`
- Primary button: `قدّم حالتك`
- Secondary button: `أنا طالب`

Three promises

- `مجاناً` — `سنون ما ياخذ فلوس منك ولا من الطالب.`
- `بدون حساب` — `قدّم حالتك برابط واحد. ما تحتاج تسجّل.`
- `تحت إشراف` — `العلاج بعيادة الجامعة ويشرف عليه الأساتذة.`

How it works — heading `شلون يشتغل`, four numbered steps

1. `المريض يقدّم حالته: المدينة، نوع العلاج المطلوب، والأوقات اللي يكدر يجي بيها.`
2. `الطالب الموثّق يشوف الحالات اللي تناسب مرحلته وعيادته، ويحجز وحدة منها.`
3. `بعد الحجز بس، تظهر للطالب معلومات التواصل، ويتواصل وية المريض ويحدد الموعد.`
4. `العلاج يصير بعيادة الجامعة وتحت إشراف الأساتذة.`

The students' band

- `طالب طب أسنان؟`
- `شوف الحالات اللي تناسب مرحلتك وأيام دوامك بعيادتك، واحجز اللي تحتاجه لمتطلباتك. التسجيل يحتاج وثيقة تثبت إنك طالب.`
- Button: `دخول الطلبة`

The supplies entry point — **present but disabled**

- `مستلزمات طب الأسنان`
- `مواد وأدوات للطلبة والأطباء، ومنتجات العناية بالفم للمرضى.`
- Non-link label: `قريباً` · note: `لسه ما متوفر.`

Closing band

- `محتاج علاج أسنان؟`
- `قدّم حالتك بدقيقتين. ما تحتاج حساب ولا فلوس.`
- Button: `قدّم حالتك`

Footer, two columns by audience

- `للمرضى` — `قدّم حالة` · `شلون تشتغل`
- `للطلبة` — `سجّل كطالب` · `حسابي`
- Then, in small type, the disclaimer, which must appear and must not be hidden:
  `سنون منصة توصيل بين المرضى وطلبة طب الأسنان. العلاج يقدّمه الطالب داخل عيادة الجامعة وتحت إشراف جامعي. سنون ما يقدّم خدمة طبية وما يتحمل مسؤولية العلاج.`
- Links: `الخصوصية` · `الشروط`

---

## The register to aim for

**Warm, plain and finished.** Not clinical, not corporate, not startup-playful.

Two references were studied — a US competitor and an Egyptian one. What both get
right is simply that they look **finished**: a real mark, a page with rhythm
instead of one long column of white boxes, generous rounded cards with soft
shadows, headlines where one word takes the accent colour, small labels above
headings, full-bleed colour bands alternating with white.

What they get wrong, and what to avoid here:

- **Nothing competitive between students.** No "featured" placement, no ratings, no
  view counts, no leaderboards. Patients are not inventory and students are not
  bidding.
- **No prices, no "save 60%".** The university sets its own terms; money is not
  ours to talk about.
- **Never make it feel like browsing people.** These are clinical cases, not
  profiles. No faces, no names, no "meet our students".
- **No fake social proof.** There are no testimonials and no user count yet;
  inventing them would be the fastest way to lose the trust this page exists to
  build.

---

## What to hand back

So the result can be built rather than admired:

1. **The logo as SVG source** — three directions, each in a 32×32 viewBox, single
   colour, `currentColor`, no gradients or fills. Plus each shown at 16px and 28px
   so the small-size behaviour is visible.
2. **The landing page artboard at 360px**, and a note or artboard for the wider view.
3. **The palette as explicit values**, in OKLCH or hex — either confirming the
   values above or replacing them. Name the role of each colour, not just the
   swatch: which one is a primary action, which is a surface, which is a border.
4. **The type scale** — the actual sizes, weights and line heights used, in 400 and
   700 only.
5. **Spacing and radii** — the step scale used for padding and gaps, and the corner
   radii for small, medium and large surfaces.
6. **A sentence on anything you changed and why**, especially the palette. A
   decision with a reason behind it can be defended later; a swatch cannot.
