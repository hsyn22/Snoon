import { caseStatus } from '@/lib/copy'

/**
 * The card, the ribbon, the chip and the meta row.
 *
 * This is the anatomy ClinMatch's listing card uses, and it is worth taking
 * almost whole because every part of it has a direct equivalent here: a status
 * across the top in its own colour, a reference code in small type, the
 * treatments as chips, then location, days and date as icon rows.
 *
 * What is deliberately NOT taken: their "Featured" pill, their view counter and
 * their price band. A featured slot is how a matching platform turns into a
 * marketplace, a view count treats a patient's case as content with an audience,
 * and pricing is the university's to state, not ours.
 */

/** A surface that groups one thing. `flush` when a ribbon sits on top. */
export function Card({
  children,
  className,
  tone = 'plain',
}: {
  children: React.ReactNode
  className?: string
  tone?: 'plain' | 'accent'
}) {
  const surface = tone === 'accent' ? 'bg-accent-muted border-accent/25' : 'bg-surface border-border'
  return (
    <article className={`overflow-hidden rounded-lg border ${surface} shadow-sm ${className ?? ''}`}>
      {children}
    </article>
  )
}

export function CardBody({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`p-4 ${className ?? ''}`}>{children}</div>
}

/**
 * Status across the top of a card, in the status's own colour.
 *
 * A student reading a queue on a phone should not have to find the word
 * "بانتظار طالب" in a paragraph. The colour is the first thing read and the
 * label confirms it — colour alone is never the only signal, because it has to
 * survive a cheap screen in daylight and a reader who cannot distinguish it.
 */
type StatusTone = 'neutral' | 'accent' | 'positive' | 'warning' | 'danger'

const ribbonTones: Record<StatusTone, string> = {
  neutral: 'bg-surface-muted text-foreground-muted',
  accent: 'bg-accent text-accent-foreground',
  positive: 'bg-positive text-accent-foreground',
  warning: 'bg-warning text-foreground',
  danger: 'bg-danger text-accent-foreground',
}

/** Which colour each lifecycle state reads as. Labels stay in copy.ts. */
export const statusTone: Record<keyof typeof caseStatus, StatusTone> = {
  REQUESTED: 'accent',
  MATCHED: 'accent',
  CONTACTED: 'accent',
  APPOINTMENT_CONFIRMED: 'positive',
  COMPLETED: 'positive',
  NO_CONTACT: 'warning',
  RETURNED_TO_QUEUE: 'warning',
  NO_SHOW: 'warning',
  CANCELLED: 'danger',
  EXPIRED: 'neutral',
}

export function CardRibbon({
  label,
  detail,
  tone = 'accent',
}: {
  label: string
  /** One line saying what the status means for the reader. Optional. */
  detail?: string
  tone?: StatusTone
}) {
  return (
    <div
      className={`flex flex-wrap items-baseline gap-x-3 gap-y-0.5 px-4 py-2 text-xs ${ribbonTones[tone]}`}
    >
      <span className="font-bold">{label}</span>
      {detail ? <span className="opacity-90">{detail}</span> : null}
    </div>
  )
}

/**
 * A treatment, a tag, a short fact. `muted` marks a treatment this student's
 * stage may not perform — present on the case, not theirs to do.
 */
export function Chip({
  children,
  tone = 'accent',
  icon,
}: {
  children: React.ReactNode
  tone?: 'accent' | 'muted' | 'warning'
  icon?: React.ReactNode
}) {
  const tones = {
    accent: 'bg-accent-muted text-accent-strong',
    muted: 'border border-dashed border-border bg-surface text-foreground-muted',
    warning: 'bg-warm-muted text-foreground',
  } as const
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${tones[tone]}`}
    >
      {icon}
      {children}
    </span>
  )
}

/**
 * An icon and a value. The label is the icon, which is why `label` here is the
 * accessible name rather than visible text — two Arabic words of label before
 * every value is what made the old card read like a database dump.
 */
export function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <p className="flex items-start gap-2 text-sm text-foreground-muted">
      <span className="mt-1 text-accent">{icon}</span>
      <span className="sr-only">{label}: </span>
      <span className="text-foreground">{children}</span>
    </p>
  )
}
