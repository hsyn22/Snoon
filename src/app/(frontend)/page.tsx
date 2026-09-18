import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { Eyebrow, Section } from '@/components/ui/section'
import {
  citiesSection,
  faqSection,
  fees,
  home,
  howItWorks,
  nav,
  safetySection,
  treatmentsSection,
} from '@/lib/copy'
import { getCities, getTreatmentTypes } from '@/lib/config'
import {
  CheckIcon,
  ExpiryIcon,
  ImageNoGeoIcon,
  MinimalFormIcon,
  PinIcon,
  ShieldPhoneIcon,
} from '@/components/ui/icon'
import { MatchMotif } from '@/components/brand/match-motif'
import { MatchBridge } from '@/components/brand/match-bridge'
import { STEP_SCENES } from '@/components/brand/step-scenes'
import { SiteFooter } from '@/components/site-chrome'

/** One icon per safety point, in the order the copy lists them. The steps used
 *  to have a matching list; they carry scenes now — see step-scenes.tsx. */
const SAFETY_ICONS = [ShieldPhoneIcon, ImageNoGeoIcon, ExpiryIcon, MinimalFormIcon]

/**
 * The landing page.
 *
 * Three jobs, in this order: say what سنون is in one line, get a patient to the
 * form, and tell a student there is something here for them. Everything else is
 * subordinate to those.
 *
 * No JavaScript at all — every element is a server-rendered link. The median
 * visitor is on a low-end Android on a slow connection, and this page has to be
 * usable the instant the HTML lands rather than after hydration.
 *
 * The cinematic 3D scene from the product vision is deliberately not here. See
 * "The landing page" in CLAUDE.md.
 */
/**
 * The headline, one span per word, for the full tier's word-by-word reveal.
 *
 * **Per word, never per letter.** Arabic shapes each letter according to its
 * neighbours within a word, so wrapping letters individually breaks the joins
 * and renders the headline as a row of disconnected forms. Words are separated
 * by spaces and shape independently, so splitting there is safe — and it is the
 * only split this codebase should ever do to Arabic text.
 *
 * The spans are inert at the other two tiers: `.word` has no rules outside
 * `[data-motion='full']`, so this costs a few tags of HTML and nothing else.
 * Rendered on the server, so there is no JavaScript involved in the effect at
 * all — the browser is simply given text that is already split.
 */
function Words({ text, from = 0 }: { text: string; from?: number }) {
  return (
    <>
      {text.split(' ').map((word, index) => (
        <span
          key={`${word}-${index}`}
          className="word"
          style={{ '--word-delay': `${(from + index) * 80 + 260}ms` } as React.CSSProperties}
        >
          {word}
          {index < text.split(' ').length - 1 ? '\u00A0' : null}
        </span>
      ))}
    </>
  )
}

/**
 * The opening of an audience band.
 *
 * Takes its colour from `--color-accent-muted` rather than naming one, so the
 * same markup is green in the patients' band and orange inside `.student-area`
 * — the wrapper re-points the accent tokens and nothing here has to know that
 * audiences have colours. That is the same trick `tokens.css` already relies on
 * for the whole `/student` area, and it is why adding a third audience later
 * would not touch this component.
 *
 * The heading is an `h2` and the band's own sections keep their `h2`s: the band
 * is a region of the page, not a level of the document outline. `aria-labelledby`
 * on the `<section>` is what actually tells a screen reader which band it is in,
 * and it is the part that would be missed if this were only a coloured div.
 */
function BandOpener({
  id,
  eyebrow,
  title,
  body,
}: {
  id: string
  eyebrow: string
  title: string
  body: string
}) {
  return (
    <div className="bg-accent-muted">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-12">
        <p className="inline-flex rounded-full bg-surface px-3 py-1 text-xs font-bold text-accent">
          {eyebrow}
        </p>
        <h2 id={id} className="reveal rule-in mt-4 text-2xl font-bold sm:text-3xl">
          {title}
        </h2>
        <p className="reveal mt-3 max-w-2xl text-pretty text-foreground-muted">{body}</p>
      </div>
    </div>
  )
}

/**
 * One FAQ group — the questions for a single audience.
 *
 * Both groups used to live in one section with the students' heading coloured by
 * hand. They sit in their own bands now, so the colour comes from whichever band
 * wraps them and `text-accent` is correct in both.
 */
function FaqGroup({ items }: { items: readonly { q: string; a: string }[] }) {
  return (
    <div className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
      {items.map((item) => (
        <details key={item.q} name="faq" className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold marker:content-none">
            {item.q}
            {/* Rotates to a minus when open. A rule rather than an icon swap, so
                there is nothing to load and nothing to script. */}
            <span
              aria-hidden="true"
              className="relative size-5 shrink-0 rounded-full bg-accent-muted before:absolute before:inset-x-1 before:top-1/2 before:h-0.5 before:-translate-y-1/2 before:bg-accent-strong before:content-[''] after:absolute after:inset-y-1 after:inset-x-0 after:mx-auto after:w-0.5 after:bg-accent-strong after:transition-transform after:content-[''] group-open:after:scale-y-0"
            />
          </summary>
          <p className="text-pretty px-4 pb-4 text-sm text-foreground-muted">{item.a}</p>
        </details>
      ))}
    </div>
  )
}

/**
 * The treatment and city lists come from Payload, so this page cannot be baked
 * once at build time — an admin adding a city would see nothing change until the
 * next deployment. Re-generated at most every five minutes instead, the same as
 * `/case/new`: still pre-rendered and fast for a patient on a slow connection,
 * and a config edit appears without a deploy.
 */
export const revalidate = 300

export default async function HomePage() {
  const [treatments, cities] = await Promise.all([getTreatmentTypes(), getCities()])

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Not sticky: on a 360px screen a fixed bar costs a tenth of the viewport
          for the whole scroll, and this page is short.

          Both competitors put a four-item menu behind a hamburger. Ours is two
          anchors and a link, so there is nothing to script, nothing to open and
          nothing that breaks before hydration. The two anchors drop below 640px
          rather than collapsing into a drawer: at 360px they do not fit beside
          the wordmark, and a page this short is scrollable to both sections
          anyway — a menu that only exists to scroll a short page is a drawer
          nobody needed. The primary action is deliberately not repeated here;
          the hero's is one screen away and at most one primary per screen. */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
          {/* The lockup says which part of سنون this is. "للمراجعين" is a branch
              of the brand, not a link and not a second name — so it sits beside
              منصة سنون in a lighter weight and the warm colour. The student
              route is the hero's second button and the footer column; it left
              the header when this became the visitor's side of the product. */}
          <Wordmark className="text-accent" branch={nav.forPatients} />
          <nav className="flex items-center gap-4 text-sm">
            <a href="#how" className="hidden text-foreground-muted hover:text-accent sm:inline">
              {home.navHow}
            </a>
            <a href="#faq" className="hidden text-foreground-muted hover:text-accent sm:inline">
              {home.navFaq}
            </a>
          </nav>
        </div>
      </header>

      <main id="main" className="page-enter grow">
        {/* Hero. A gradient wash rather than an illustration: سنون has no
            photography yet, and a stock image of a stranger's teeth would be
            worse than none. */}
        {/* `hero-drift` animates the ::before below — one very soft radial,
            drifting over 28 seconds. Slow and small enough to read as depth
            rather than as movement, and `isolate` keeps it behind the text
            without a z-index on every child. */}
        <div className="hero-drift relative isolate overflow-hidden bg-gradient-to-b from-accent-muted to-background before:pointer-events-none before:absolute before:-top-1/3 before:end-[-15%] before:-z-10 before:h-[36rem] before:w-[36rem] before:rounded-full before:bg-[radial-gradient(circle,var(--color-accent)_0%,transparent_65%)] before:opacity-[0.09] before:content-['']">
          {/* The full tier's gradient mesh. Three empty spans styled entirely
              from motion.css, and invisible at every other tier — an element
              with no rules costs three tags of HTML, against a second
              stylesheet request that would cost a round trip. */}
          <div className="mesh" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>

          <div className="mx-auto w-full max-w-3xl px-4 pb-12 pt-10 sm:pb-16 sm:pt-14">
            {/* Two columns from `md` up, stacked below it.
                The picture used to sit under the buttons, four scrolls down on
                a phone, which made it an illustration of something the page had
                already finished saying. Beside the headline it is the first
                thing a visitor looks at, and it explains سنون before they read
                a word — which is what it was drawn for.

                On a phone it comes straight after the headline and before the
                buttons, for the same reason: the picture is the argument, the
                buttons are what you do about it. */}
            <div className="grid gap-x-8 md:grid-cols-[1fr_minmax(0,22rem)]">
              <div className="md:col-start-1 md:row-start-1">
                {/* The entrance stagger. Each step is 70ms behind the last,
                    which is about the shortest gap that still reads as a
                    sequence rather than as everything arriving at once. */}
                <div className="animate-rise" style={{ '--delay': '0ms' } as React.CSSProperties}>
                  <Eyebrow>{home.eyebrow}</Eyebrow>
                </div>

                <h1
                  className="animate-rise mt-4 text-balance text-3xl font-bold leading-tight sm:text-4xl"
                  style={{ '--delay': '70ms' } as React.CSSProperties}
                >
                  <span className="text-accent">
                    <Words text={home.headlineAccent} />
                  </span>{' '}
                  <Words text={home.headlineRest} from={home.headlineAccent.split(' ').length} />
                </h1>

                <p
                  className="animate-rise mt-4 max-w-xl text-pretty text-foreground-muted"
                  style={{ '--delay': '140ms' } as React.CSSProperties}
                >
                  {home.subhead}
                </p>
              </div>

              {/* Explicit row and column rather than `order`: three children in
                  a two-column grid would wrap, and `order` only re-sequences
                  them into the same wrong cells. The picture spans both rows of
                  the second column so it sits beside the text *and* the
                  buttons. */}
              <div
                className="animate-rise mt-8 md:col-start-2 md:row-span-2 md:row-start-1 md:mt-0 md:self-center"
                style={{ '--delay': '210ms' } as React.CSSProperties}
              >
                <MatchBridge className="mx-auto w-full max-w-md md:max-w-none" />
              </div>

              <div
                className="animate-rise mt-8 flex flex-col gap-3 sm:flex-row md:col-start-1 md:row-start-2 md:mt-7"
                style={{ '--delay': '280ms' } as React.CSSProperties}
              >
                {/* One half of the shared-element transition. The other half
                    carries the same `data-flip-id` on `/case/new`, and that
                    pairing is the whole mechanism: on a capable phone this
                    button travels across and grows into the form's heading
                    instead of the page cutting. On every other device the
                    attribute is inert. */}
                <Link
                  href="/case/new"
                  data-flip-id="case-entry"
                  className="press inline-flex min-h-12 items-center justify-center rounded-full bg-accent-fill px-6 font-bold text-accent-foreground shadow-md"
                >
                  {home.primaryAction}
                </Link>
                <Link
                  href="/student"
                  className="press inline-flex min-h-12 items-center justify-center rounded-full border-2 border-student bg-surface px-6 font-bold text-student-strong"
                >
                  {home.secondaryAction}
                </Link>
              </div>
            </div>

            {/* Three short promises. They answer the questions a patient asks
                before anything else: what does it cost, what do I have to sign
                up for, and is it safe. */}
            <dl className="stagger mt-10 grid gap-4 sm:grid-cols-3">
              {home.promises.map((promise, index) => (
                <div
                  key={promise.title}
                  className="animate-rise lift rounded-lg border border-border bg-surface p-4 shadow-sm"
                  style={{ '--delay': `${360 + index * 70}ms` } as React.CSSProperties}
                >
                  <dt className="font-bold text-accent">{promise.title}</dt>
                  <dd className="mt-1 text-sm text-foreground-muted">{promise.body}</dd>
                </div>
              ))}
            </dl>

            {/* What it costs, before anything else on the page can imply
                otherwise. Haider's answer to the open question: سنون takes
                nothing, but some universities charge a symbolic fee for their
                own students' services and the student states it up front.
                Saying only the first half is how somebody arrives expecting
                free treatment and is asked for money — the exact harm this
                project exists to prevent. */}
            <p
              className="animate-rise mt-6 text-pretty rounded-lg border border-warm/40 bg-warm-muted px-4 py-3 text-sm"
              style={{ '--delay': '540ms' } as React.CSSProperties}
            >
              {fees.long}
            </p>

          </div>
        </div>

        {/* ── The shared band ──────────────────────────────────────────────
            Everything above and including this section is read by both sides at
            once, so it stays in the third person: "الطالب يتواصل وية المراجع",
            never "يتواصل وياك". The two audience bands below each name their
            reader in a heading, and only there may the copy address somebody
            directly. */}

        <Section id="how" tone="muted">
          <h2 className="reveal rule-in text-xl font-bold sm:text-2xl">{howItWorks.title}</h2>

          {/* A rail, not a stack.
              Four cards on top of each other is four things to scroll past
              before the page continues. Side by side with one in view and the
              rest a swipe away, they read as what they are — a sequence you
              move through — and the section costs one screen instead of four.
              It is also the shape ClinMatch uses for the same content, noted in
              docs/competitors.md.

              Native scroll snapping, so there is nothing to script: the rail
              scrolls with a thumb, snaps to each card, and on a desktop the
              four simply sit in a row with no scrolling at all. `-mx-4 px-4`
              lets it bleed to the screen edges on a phone while the first card
              still lines up with the text above it — a rail that stops at the
              page margin looks like a mistake. */}
          <ol className="steps-rail stagger mt-7 flex snap-x snap-mandatory gap-4 overflow-x-auto overflow-y-hidden pb-4 md:grid md:grid-cols-4 md:overflow-visible">
            {howItWorks.steps.map((step, index) => {
              const Scene = STEP_SCENES[index] ?? STEP_SCENES[0]
              return (
                <li
                  key={step}
                  className="reveal lift flex min-h-full w-[80%] shrink-0 snap-center flex-col rounded-xl border border-border bg-surface p-4 shadow-sm sm:w-[46%] md:w-auto"
                >
                  {/* A scene, not an icon. ClinMatch's step cards carry a
                      small picture of the step happening rather than a symbol
                      labelling it, and on a page explaining an unfamiliar
                      process to somebody who has never used one, that is most
                      of the difference. See step-scenes.tsx. */}
                  <span aria-hidden="true" className="pop relative inline-block">
                    <Scene />
                    {/* The number rides the corner of the scene, so the
                        sequence is readable without a second column taking
                        width a phone does not have. */}
                    <span className="ltr-run absolute -top-1 -start-1 flex size-6 items-center justify-center rounded-full bg-accent-fill text-xs font-bold text-accent-foreground">
                      {index + 1}
                    </span>
                  </span>
                  <p className="mt-4 text-pretty text-sm leading-relaxed text-foreground-muted">
                    {step}
                  </p>
                </li>
              )
            })}
          </ol>

          {/* How far along the rail you are. Driven by `scroll(self inline)` on
              the rail itself — the browser reads the scroll position with no
              listener and no JavaScript, which is the honest version of the
              "motion follows scroll progress" idea. Hidden where the four cards
              are all visible at once, because then it would always be full. */}
          <div className="steps-progress md:hidden" aria-hidden="true">
            <span />
          </div>
        </Section>

        {/* ── The مراجع's band, in green ───────────────────────────────────
            Everything from here to the students' band is one audience's, and
            the page says so before it says anything else. Green is already the
            default accent, so nothing wraps this — it is the students' band
            that changes colour, which keeps the landing page's own palette the
            one both audiences arrived through. */}
        <BandOpener
          id="patients"
          eyebrow={home.patientsBandEyebrow}
          title={home.patientsBandTitle}
          body={home.patientsBandBody}
        />

        {/* What you can actually get. The biggest thing the page was missing:
            a patient's first question is whether their problem is covered at
            all, and سنون never answered it. */}
        <Section>
          <Eyebrow>{treatmentsSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{treatmentsSection.title}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{treatmentsSection.body}</p>

          {/* `stagger` on the list and `reveal` on each chip, so at the full
              tier the treatments arrive one after another rather than as a
              block. Same mechanism as the card grids: the offsets are in
              `animation-range`, never in a delay, which would stall halfway if
              somebody stopped scrolling. */}
          <ul className="stagger mt-6 flex flex-wrap gap-2">
            {treatments.map((treatment) => (
              <li key={treatment.id} className="reveal">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3.5 py-2 text-sm font-bold text-accent-strong">
                  <CheckIcon className="size-3.5" />
                  {treatment.nameAr}
                </span>
              </li>
            ))}
          </ul>

          {/* The guided questions, directly under the list of treatments —
              which is the one place on the page where somebody discovers that
              they cannot find their problem in it. Until now the tree was
              linked from the footer and from inside the case form, both of
              which you only reach after deciding what to ask for, so the one
              visitor it was built for never saw it.

              Styled as a quiet card rather than a second primary button: the
              band already has one action and this is the way round to it, not a
              competitor to it. */}
          <div className="reveal lift mt-8 rounded-xl border border-accent-light bg-accent-muted p-5">
            <h3 className="font-bold text-accent-strong">{home.guideTitle}</h3>
            <p className="mt-2 text-pretty text-sm text-foreground-muted">{home.guideBody}</p>
            <Link
              href="/case/guide"
              className="press mt-4 inline-flex min-h-11 items-center justify-center rounded-full border-2 border-accent bg-surface px-5 font-bold text-accent"
            >
              {home.guideAction}
            </Link>
          </div>
        </Section>

        {/* The one section neither competitor can write, because neither does
            the work behind it. Every line here is something the code does. */}
        <Section tone="muted">
          <Eyebrow>{safetySection.eyebrow}</Eyebrow>
          {/* Deliberately the largest heading below the hero. The lead under it
              used to say "your phone number is the most important thing you
              give us", which raised a worry a reader had not arrived with —
              the opposite of what this section is for. */}
          <h2 className="reveal rule-in mt-4 text-2xl font-bold sm:text-3xl">
            {safetySection.title}
          </h2>
          <p className="reveal mt-3 text-foreground-muted">{safetySection.subtitle}</p>

          <div className="stagger mt-6 grid gap-4 sm:grid-cols-2">
            {safetySection.points.map((point, index) => {
              const Icon = SAFETY_ICONS[index] ?? CheckIcon
              return (
              <div
                key={point.title}
                className="reveal lift rounded-lg border border-border bg-surface p-4 shadow-sm"
              >
                <span
                  aria-hidden="true"
                  className="pop flex size-10 items-center justify-center rounded-lg bg-accent-muted text-accent-strong"
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="mt-3 font-bold">{point.title}</h3>
                <p className="mt-2 text-pretty text-sm text-foreground-muted">{point.body}</p>
              </div>
              )
            })}
          </div>
        </Section>

        {/* Where سنون works, said plainly — including that it is new and some
            cities will be quiet. A patient who hears nothing should know why. */}
        <Section>
          <Eyebrow>{citiesSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{citiesSection.title}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{citiesSection.body}</p>

          <ul className="stagger mt-6 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city.id} className="reveal">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                  <PinIcon className="text-accent" />
                  {city.nameAr}
                </span>
              </li>
            ))}
          </ul>

          <p className="reveal mt-5 text-sm text-foreground-muted">{citiesSection.note}</p>
        </Section>

        {/* The patients' questions, inside the patients' band.
            Native <details>, so the accordion needs no JavaScript. Both
            competitors script theirs; this one is free, works before hydration,
            and is what a screen reader already understands. */}
        <Section id="faq" tone="muted">
          <Eyebrow>{faqSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">
            {faqSection.patientsHeading}
          </h2>

          {/*
            * The two groups have moved apart rather than been merged.
            *
            * They used to sit in one section under two coloured sub-headings,
            * which was the first fix for a FAQ that answered patients only. Now
            * that the page itself is split by audience, a student's questions
            * belong in the students' band — a reader should not have to scroll
            * past eight questions addressed to somebody else to reach theirs.
            *
            * `name="faq"` is still shared across both groups, so opening one
            * closes any other — one attribute rather than any script.
            */}
          <FaqGroup items={faqSection.items} />

          {/* The band's one action, at the end of the band rather than repeated
              through it. At most one primary per screen. */}
          <Link
            href="/case/new"
            className="press reveal mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-accent-fill px-6 font-bold text-accent-foreground shadow-md"
          >
            {home.primaryAction}
          </Link>
        </Section>

        {/* ── The student's band, in orange ─────────────────────────────────
            `.student-area` re-points the accent tokens at the orange ramp, so
            every `text-accent`, `bg-accent-muted` and `bg-accent-fill` inside
            this div turns orange without one component below knowing that
            audiences have colours. It is the same wrapper every `/student` page
            already wears, which is what makes the band read as the door into
            that side of the product rather than as a differently coloured
            paragraph. */}
        <div className="student-area">
          <BandOpener
            id="students"
            eyebrow={home.studentsBandEyebrow}
            title={home.studentsTitle}
            body={home.studentsBody}
          />

          <Section>
            <div className="stagger grid gap-4 sm:grid-cols-3">
              {home.studentsPoints.map((point) => (
                <div
                  key={point.title}
                  className="reveal lift rounded-lg border border-border bg-surface p-4 shadow-sm"
                >
                  <h3 className="font-bold text-accent">{point.title}</h3>
                  <p className="mt-2 text-pretty text-sm text-foreground-muted">{point.body}</p>
                </div>
              ))}
            </div>
          </Section>

          <Section tone="muted">
            <Eyebrow>{faqSection.eyebrow}</Eyebrow>
            <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">
              {faqSection.studentsHeading}
            </h2>
            <FaqGroup items={faqSection.studentItems} />

            <Link
              href="/student"
              className="press reveal mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-accent-fill px-6 font-bold text-accent-foreground shadow-md"
            >
              {home.studentsAction}
            </Link>
          </Section>
        </div>

        {/* The "متجر سنون — قريباً" band used to sit here and is gone on
            Haider's instruction. A "coming soon" panel is a promise the site
            cannot keep, and it is the only thing on the page that advertises
            something that does not exist. The store is still planned; its place
            in the navigation model is still kept in `copy.ts` and CLAUDE.md, so
            nothing has to be retrofitted — but it is not shown until it is
            real, and when it is it gets its own site. */}

        <Section tone="accent">
          <h2 className="reveal text-2xl font-bold sm:text-3xl">{home.closingTitle}</h2>
          <p className="reveal mt-3 text-pretty opacity-90">{home.closingBody}</p>
          {/* Both doors, side by side. The patient's stays primary — it is the
              side that arrives cold and the side سنون exists to serve — but a
              student reaching the bottom of the page now has somewhere to go
              instead of a band addressed to somebody else. */}
          <div className="reveal mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/case/new"
              className="press inline-flex min-h-12 items-center justify-center rounded-full bg-surface px-6 font-bold text-accent shadow-md"
            >
              {home.primaryAction}
            </Link>
            <Link
              href="/student"
              className="press inline-flex min-h-12 items-center justify-center rounded-full border border-current px-6 font-bold"
            >
              {home.closingStudentAction}
            </Link>
          </div>

          {/* The motif, retired from the hero to here. It takes its colour from
              the text it sits in, so on the accent band it is white without a
              variant — which is exactly why it was drawn with `currentColor`.
              Decoration at this point: the page has already explained itself. */}
          <MatchMotif className="mx-auto mt-10 h-16 w-full max-w-xs opacity-50" />
        </Section>
      </main>

      {/* The same footer every other page wears. The landing page had its own
          one-column version, which meant the one page a stranger is most likely
          to land on had the *least* wayfinding — no way back to a lost tracking
          link, nothing for a student. Columns by audience, from
          `site-chrome.tsx`. */}
      <SiteFooter />

    </div>
  )
}
