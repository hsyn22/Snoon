import Link from 'next/link'
import { EntryCard } from '@/components/entry-card'
import { footer, howItWorks, landing, site } from '@/lib/copy'

export default function HomePage() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4">
      <header className="py-6">
        <p className="text-xl font-semibold tracking-tight">{site.name}</p>
      </header>

      <main id="main" className="grow">
        <section className="pb-8">
          <h1 className="text-balance text-2xl font-bold sm:text-3xl">{site.tagline}</h1>
          <p className="mt-3 text-pretty text-foreground-muted">{site.description}</p>
        </section>

        {/* Three entry points. `supplies` is deliberately inert — the marketplace
            is a later phase, but its place in the navigation model is kept. */}
        <section className="grid gap-4 pb-10 sm:grid-cols-2">
          <EntryCard {...landing.patient} href="/case/new" />
          <EntryCard {...landing.student} href="/student" />
          <EntryCard {...landing.supplies} />
        </section>

        <section className="pb-10">
          <h2 className="text-lg font-semibold">{howItWorks.title}</h2>
          <ol className="mt-4 space-y-3">
            {howItWorks.steps.map((step, index) => (
              <li key={step} className="flex gap-3 text-sm text-foreground-muted">
                <span
                  aria-hidden="true"
                  className="ltr-run mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-medium text-foreground"
                >
                  {index + 1}
                </span>
                <span className="text-pretty">{step}</span>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-xs text-foreground-muted">
        <p className="text-pretty">{footer.disclaimer}</p>
        {/* These were written in the copy file long before the pages existed,
            which meant a promise nobody could read. */}
        <p className="mt-3 flex gap-4">
          <Link href="/privacy" className="underline">
            {footer.privacy}
          </Link>
          <Link href="/terms" className="underline">
            {footer.terms}
          </Link>
        </p>
      </footer>
    </div>
  )
}
