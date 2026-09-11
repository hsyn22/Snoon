import Link from 'next/link'

/**
 * One button, everywhere.
 *
 * Before this, roughly a dozen places each wrote out
 * `flex min-h-11 items-center justify-center rounded-md bg-accent …` by hand,
 * and they had already drifted — different heights, different radii, some with a
 * shadow and some without. That drift is most of what makes a page look like a
 * form rather than a product: nothing is individually wrong, but nothing lines
 * up either.
 *
 * Returned as a class string rather than as a component so it works on a
 * `<button>`, a `<Link>` and a bare `<a>` without three wrappers, and so a
 * Client Component can use it without importing anything that pulls the server
 * in.
 *
 * Variants, and when to reach for each:
 *   primary   — the one action the page exists for. At most one per screen.
 *   secondary — a real alternative, outlined so it does not compete.
 *   quiet     — navigation and escape hatches. Reads as a link with a tap target.
 *   danger    — destructive or closing. Rare on purpose.
 */
export type ButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
type Variant = ButtonVariant

const base =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-center ' +
  'font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-55'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-foreground shadow-sm hover:bg-accent-strong',
  secondary: 'border border-border bg-surface text-foreground hover:border-accent hover:text-accent',
  quiet: 'text-accent hover:bg-accent-muted',
  danger: 'border border-danger bg-surface text-danger hover:bg-danger hover:text-accent-foreground',
}

export function buttonClass(variant: Variant = 'primary', className?: string) {
  return `${base} ${variants[variant]} ${className ?? ''}`
}

/**
 * A full-width button is the right default on a phone, which is the viewport
 * this product is designed at. Opt out with `w-auto` in `className`.
 */
export function ButtonLink({
  href,
  variant = 'primary',
  className,
  children,
}: {
  href: string
  variant?: Variant
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link href={href} className={buttonClass(variant, `w-full ${className ?? ''}`)}>
      {children}
    </Link>
  )
}
