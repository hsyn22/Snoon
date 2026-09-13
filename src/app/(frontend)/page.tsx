import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { Eyebrow, Section } from '@/components/ui/section'
import { footer, home, howItWorks, landing } from '@/lib/copy'

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

export default function HomePage() {
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

            {/* Three short promises. They answer the questions a patient asks
                before anything else: what does it cost, what do I have to sign
                up for, and is it safe. */}
            <dl className="mt-10 grid gap-4 sm:grid-cols-3">
              {home.promises.map((promise, index) => (
                <div
                  key={promise.title}
                  className="animate-rise lift rounded-lg border border-border bg-surface p-4 shadow-sm"
                  style={{ '--delay': `${280 + index * 70}ms` } as React.CSSProperties}
                >
                  <dt className="font-bold text-accent">{promise.title}</dt>
                  <dd className="mt-1 text-sm text-foreground-muted">{promise.body}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        <Section id="how" tone="muted">
          <h2 className="reveal text-xl font-bold sm:text-2xl">{howItWorks.title}</h2>

          {/* The one deliberately expressive thing on the page, and it earns its
              place: these four steps are a sequence, and a line that fills as
              you read down them says so more directly than the prose can.
              `end-*` rather than `left`/`right` — the line runs down the start
              edge, which in Arabic is the right. */}
          <ol className="draw-line relative mt-6 space-y-4 after:absolute after:end-[1.0625rem] after:top-4 after:-z-10 after:h-[calc(100%-2rem)] after:w-0.5 after:origin-top after:bg-accent/25 after:content-['']">
            {howItWorks.steps.map((step, index) => (
              <li key={step} className="reveal flex gap-4">
                <span
                  aria-hidden="true"
                  className="ltr-run flex size-9 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground"
                >
                  {index + 1}
                </span>
                <p className="text-pretty pt-1.5 text-sm text-foreground-muted">{step}</p>
              </li>
            ))}
          </ol>
        </Section>

        {/* The student side gets its own band rather than a card in a row: it is
            one of two audiences, not one of three features. */}
        <Section>
          <h2 className="reveal text-xl font-bold sm:text-2xl">{home.studentsTitle}</h2>
          <p className="reveal mt-3 text-pretty text-foreground-muted">{home.studentsBody}</p>
          <Link
            href="/student"
            className="press reveal mt-6 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 font-bold text-accent-foreground"
          >
            {home.studentsAction}
          </Link>
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
