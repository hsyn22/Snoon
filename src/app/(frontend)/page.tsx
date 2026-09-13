import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { Eyebrow, Section } from '@/components/ui/section'
import {
  citiesSection,
  faqSection,
  footer,
  home,
  howItWorks,
  landing,
  safetySection,
  treatmentsSection,
  trustRow,
} from '@/lib/copy'
import { getCities, getTreatmentTypes } from '@/lib/config'
import {
  CallAgreedIcon,
  CheckIcon,
  ClinicIcon,
  ExpiryIcon,
  ImageNoGeoIcon,
  MinimalFormIcon,
  PinIcon,
  ShieldPhoneIcon,
  SubmitIcon,
} from '@/components/ui/icon'
import { MatchMotif } from '@/components/brand/match-motif'

/** One icon per safety point and per step, in the order the copy lists them. */
const SAFETY_ICONS = [ShieldPhoneIcon, ImageNoGeoIcon, ExpiryIcon, MinimalFormIcon]
const STEP_ICONS = [SubmitIcon, CheckIcon, CallAgreedIcon, ClinicIcon]

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
          for the whole scroll, and this page is short. */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
          <Wordmark className="text-accent" />
          <Link
            href="/student"
            className="text-sm font-medium text-foreground-muted underline-offset-4 hover:underline"
          >
            {home.forStudents}
          </Link>
        </div>
      </header>

      <main id="main" className="grow">
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
            {/* The entrance stagger. Each step is 70ms behind the last, which is
                about the shortest gap that still reads as a sequence rather
                than as everything arriving at once. */}
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

            <div
              className="animate-rise mt-7 flex flex-col gap-3 sm:flex-row"
              style={{ '--delay': '210ms' } as React.CSSProperties}
            >
              <Link
                href="/case/new"
                className="press inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground shadow-md"
              >
                {home.primaryAction}
              </Link>
              <Link
                href="/student"
                className="press inline-flex min-h-12 items-center justify-center rounded-full border border-border bg-surface px-6 font-medium"
              >
                {home.secondaryAction}
              </Link>
            </div>

            {/* The hero had nothing to look at, which is most of why it read as
                a form. Not photography — سنون has none and a stock mouth would
                be worse than nothing — but the product's own idea as a shape:
                two people who each need what the other has, meeting. */}
            <div
              className="animate-rise mt-8 flex justify-center"
              style={{ '--delay': '280ms' } as React.CSSProperties}
            >
              <MatchMotif className="h-20 w-full max-w-sm text-accent sm:h-24" />
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

            {/* The four facts a patient checks before reading anything else.
                A strip rather than four more cards: they are one thought. */}
            <ul
              className="animate-rise mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm"
              style={{ '--delay': '580ms' } as React.CSSProperties}
            >
              {trustRow.map((fact) => (
                <li key={fact} className="flex items-center gap-1.5 text-foreground-muted">
                  <CheckIcon className="text-accent" />
                  {fact}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* What you can actually get. The biggest thing the page was missing:
            a patient's first question is whether their problem is covered at
            all, and سنون never answered it. */}
        <Section>
          <Eyebrow>{treatmentsSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{treatmentsSection.title}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{treatmentsSection.body}</p>

          <ul className="reveal mt-6 flex flex-wrap gap-2">
            {treatments.map((treatment) => (
              <li key={treatment.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-muted px-3.5 py-2 text-sm font-bold text-accent-strong">
                  <CheckIcon className="size-3.5" />
                  {treatment.nameAr}
                </span>
              </li>
            ))}
          </ul>

          <p className="reveal mt-5 text-sm text-foreground-muted">{treatmentsSection.note}</p>
        </Section>

        <Section id="how" tone="muted">
          <h2 className="reveal rule-in text-xl font-bold sm:text-2xl">{howItWorks.title}</h2>

          {/* The one deliberately expressive thing on the page, and it earns its
              place: these four steps are a sequence, and a line that fills as
              you read down them says so more directly than the prose can.
              `end-*` rather than `left`/`right` — the line runs down the start
              edge, which in Arabic is the right. */}
          <ol className="stagger draw-line relative mt-6 space-y-4 after:absolute after:end-[1.0625rem] after:top-4 after:-z-10 after:h-[calc(100%-2rem)] after:w-0.5 after:origin-top after:bg-accent/25 after:content-['']">
            {howItWorks.steps.map((step, index) => {
              const Icon = STEP_ICONS[index] ?? CheckIcon
              return (
                <li key={step} className="reveal flex gap-4">
                  <span
                    aria-hidden="true"
                    className="ltr-run flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
                  >
                    {index + 1}
                  </span>
                  <p className="flex flex-1 items-start gap-2.5 text-pretty pt-1.5 text-sm text-foreground-muted">
                    {/* The number says where you are in the sequence; the icon
                        says what happens. Neither carries meaning alone that the
                        sentence does not, so both are hidden from a reader. */}
                    <Icon className="mt-0.5 shrink-0 text-accent" />
                    <span>{step}</span>
                  </p>
                </li>
              )
            })}
          </ol>
        </Section>

        {/* The one section neither competitor can write, because neither does
            the work behind it. Every line here is something the code does. */}
        <Section>
          <Eyebrow>{safetySection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{safetySection.title}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{safetySection.body}</p>

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
                  className="flex size-10 items-center justify-center rounded-lg bg-accent-muted text-accent-strong"
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
        <Section tone="muted">
          <Eyebrow>{citiesSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{citiesSection.title}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{citiesSection.body}</p>

          <ul className="reveal mt-6 flex flex-wrap gap-2">
            {cities.map((city) => (
              <li key={city.id}>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-sm">
                  <PinIcon className="text-accent" />
                  {city.nameAr}
                </span>
              </li>
            ))}
          </ul>

          <p className="reveal mt-5 text-sm text-foreground-muted">{citiesSection.note}</p>
        </Section>

        {/* The student side gets its own band rather than a card in a row: it is
            one of two audiences, not one of three features. */}
        <Section>
          <h2 className="reveal rule-in text-xl font-bold sm:text-2xl">{home.studentsTitle}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{home.studentsBody}</p>
          <Link
            href="/student"
            className="press reveal mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground"
          >
            {home.studentsAction}
          </Link>
        </Section>

        {/* Native <details>, so the accordion needs no JavaScript. Both
            competitors script theirs; this one is free, works before hydration,
            and is what a screen reader already understands. */}
        <Section tone="muted">
          <Eyebrow>{faqSection.eyebrow}</Eyebrow>
          <h2 className="reveal rule-in mt-4 text-xl font-bold sm:text-2xl">{faqSection.title}</h2>

          <div className="mt-6 divide-y divide-border overflow-hidden rounded-lg border border-border bg-surface">
            {faqSection.items.map((item) => (
              <details key={item.q} name="faq" className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 font-bold marker:content-none">
                  {item.q}
                  {/* Rotates to a minus when open. A rule rather than an icon
                      swap, so there is nothing to load and nothing to script. */}
                  <span
                    aria-hidden="true"
                    className="relative size-5 shrink-0 rounded-full bg-accent-muted before:absolute before:inset-x-1 before:top-1/2 before:h-0.5 before:-translate-y-1/2 before:bg-accent-strong before:content-[''] after:absolute after:inset-y-1 after:inset-x-0 after:mx-auto after:w-0.5 after:bg-accent-strong after:transition-transform after:content-[''] group-open:after:scale-y-0"
                  />
                </summary>
                <p className="text-pretty px-4 pb-4 text-sm text-foreground-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Section>

        {/* The supplies store is not built. Its place in the navigation model is
            kept deliberately — see "Future: the supplies store" in CLAUDE.md. */}
        <Section tone="muted">
          <h2 className="text-lg font-bold">{landing.supplies.title}</h2>
          <p className="mt-2 text-sm text-foreground-muted">{landing.supplies.body}</p>
          <p className="mt-3 inline-flex rounded-full bg-surface px-3 py-1 text-xs font-bold text-foreground-muted">
            {landing.supplies.action}
          </p>
        </Section>

        <Section tone="accent">
          <h2 className="reveal text-2xl font-bold sm:text-3xl">{home.closingTitle}</h2>
          <p className="reveal mt-3 text-pretty opacity-90">{home.closingBody}</p>
          <Link
            href="/case/new"
            className="press reveal mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-surface px-6 font-bold text-accent shadow-md"
          >
            {home.primaryAction}
          </Link>
        </Section>
      </main>

      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-3xl px-4 py-8">
          <Wordmark className="text-accent" />
          <p className="mt-3 text-pretty text-xs text-foreground-muted">{footer.disclaimer}</p>
          <p className="mt-4 flex gap-5 text-xs">
            <Link href="/privacy" className="underline underline-offset-4">
              {footer.privacy}
            </Link>
            <Link href="/terms" className="underline underline-offset-4">
              {footer.terms}
            </Link>
          </p>
        </div>
      </footer>
    </div>
  )
}
