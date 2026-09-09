import Link from 'next/link'

type EntryCardProps = {
  title: string
  body: string
  action: string
  note: string
  /** Omit to render a disabled card — used for entry points that are not built yet. */
  href?: string
}

/**
 * One of the landing page's entry points. Server component, no JavaScript: the
 * whole landing page must be usable on a low-end phone before hydration.
 */
export function EntryCard({ title, body, action, note, href }: EntryCardProps) {
  return (
    <div className="flex flex-col rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 grow text-sm text-foreground-muted">{body}</p>

      {href ? (
        <Link
          href={href}
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 text-sm font-medium text-accent-foreground"
        >
          {action}
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-surface-muted px-4 text-sm font-medium text-foreground-muted"
        >
          {action}
        </span>
      )}

      <p className="mt-2 text-xs text-foreground-muted">{note}</p>
    </div>
  )
}
