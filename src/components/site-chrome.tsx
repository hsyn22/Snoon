import Link from 'next/link'
import { Wordmark } from '@/components/brand/wordmark'
import { footer, home } from '@/lib/copy'

/**
 * The header and footer every page wears.
 *
 * Until now only the landing page had them, and the rest of the site — the whole
 * student side, the tracking page, the case form — opened on a bare `سنون` in
 * grey 14px type. That is the single loudest "this is a Google Form" signal:
 * the pages a person actually spends time in had no chrome at all, so they read
 * as forms someone sent them rather than as parts of a product.
 *
 * Not sticky. On a 360px screen a fixed bar costs a tenth of the viewport for
 * the whole scroll, and these pages are short.
 */
export function SiteHeader({ action }: { action?: React.ReactNode }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-4">
        <Link href="/" className="text-accent" aria-label={home.backToHome}>
          <Wordmark />
        </Link>
        {action}
      </div>
    </header>
  )
}

/**
 * Columns by audience, which is how ClinMatch's footer is organised and is the
 * right split here too: a patient and a student want completely different links
 * and neither should have to read past the other's.
 *
 * The disclaimer stays — سنون matches people and does not deliver care, and that
 * belongs on every page rather than only in /terms.
 */
export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border bg-surface">
      <div className="mx-auto w-full max-w-3xl px-4 py-10">
        <Wordmark className="text-accent" />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <nav aria-label={footer.forPatients}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">
              {footer.forPatients}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/case/new" className="hover:text-accent">
                  {footer.submitCase}
                </Link>
              </li>
              <li>
                <Link href="/#how" className="hover:text-accent">
                  {footer.howItWorks}
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label={footer.forStudents}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">
              {footer.forStudents}
            </h2>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li>
                <Link href="/student/signup" className="hover:text-accent">
                  {footer.studentSignUp}
                </Link>
              </li>
              <li>
                <Link href="/student" className="hover:text-accent">
                  {footer.studentDashboard}
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <p className="mt-8 text-pretty text-xs text-foreground-muted">{footer.disclaimer}</p>
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
  )
}

/**
 * Header, a centred measure, and footer — what every page below the landing
 * page is. `width` widens for the student queue, which benefits from the extra
 * room on a tablet while still being designed at 360px.
 */
export function PageShell({
  children,
  action,
  width = 'narrow',
}: {
  children: React.ReactNode
  action?: React.ReactNode
  width?: 'narrow' | 'wide'
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader action={action} />
      <main
        id="main"
        className={`mx-auto w-full grow px-4 py-8 ${width === 'wide' ? 'max-w-3xl' : 'max-w-xl'}`}
      >
        {children}
      </main>
      <SiteFooter />
    </div>
  )
}
