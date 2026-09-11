/**
 * The page's rhythm.
 *
 * A landing page that is one continuous column of white cards reads as a form.
 * What makes a page feel finished is alternation — a full-bleed band of colour,
 * then breathing room, then white again — and consistent vertical spacing that
 * nothing has to think about locally.
 *
 * `tone` chooses the band. `full` lets the background run edge to edge while the
 * content stays in the same measure as everything else.
 */
export function Section({
  children,
  tone = 'plain',
  className,
  id,
}: {
  children: React.ReactNode
  tone?: 'plain' | 'muted' | 'accent'
  className?: string
  id?: string
}) {
  const band =
    tone === 'accent'
      ? 'bg-accent text-accent-foreground'
      : tone === 'muted'
        ? 'bg-surface-muted'
        : ''

  return (
    <section id={id} className={`${band} ${className ?? ''}`}>
      <div className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">{children}</div>
    </section>
  )
}

/** A small capitalised label above a heading. Sets context in one glance. */
export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="inline-flex rounded-full bg-warm-muted px-3 py-1 text-xs font-bold text-foreground">
      {children}
    </p>
  )
}
