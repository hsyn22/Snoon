/**
 * Form furniture, shared.
 *
 * The point of pulling these out is not reuse — it is that a form built from
 * one set of pieces looks designed, and a form where every field styles itself
 * looks like a Google Form. Every input in سنون should come from here.
 */

/**
 * A named part of a long form.
 *
 * AsnanLink splits its patient form into a three-step wizard. A wizard makes a
 * long form feel shorter and costs round trips and state on a connection that
 * drops — which is the median connection here, and against the rule that a
 * rejected form must never empty itself. Named sections on one page give most of
 * the benefit and risk nothing.
 */
export function FormSection({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border border-border bg-surface p-5 shadow-sm">
      <h2 className="text-xs font-bold uppercase tracking-wide text-foreground-muted">{title}</h2>
      <div className="mt-4 space-y-5">{children}</div>
    </section>
  )
}

export const labelClass = 'block text-sm font-bold text-accent'
export const hintClass = 'mt-1 text-xs text-foreground-muted'

/**
 * Filled rather than outlined, which is what makes a field look like a control
 * rather than a box drawn around nothing. The border appears on focus.
 */
export const controlClass =
  'mt-2 min-h-12 w-full rounded-md border border-transparent bg-surface-muted px-3 text-foreground ' +
  'focus:border-accent focus:bg-surface aria-[invalid=true]:border-danger'

export const optionClass =
  'flex min-h-12 cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm ' +
  'has-[:checked]:border-accent has-[:checked]:bg-accent-muted'
