import Link from 'next/link'

/**
 * The shared vocabulary for سنون's custom admin views.
 *
 * The three views that read across into Drizzle — verification, cases and
 * reviews — were each hand-styled with inline rules, so every one of them had
 * its own idea of a heading, a card and a status colour, and none of them had an
 * empty state worth the name. This file is to those views what
 * `components/ui/*` is to the site: build from it rather than restyling
 * locally.
 *
 * **It cannot use Tailwind.** The Payload admin owns its own `<html>` and its
 * own root layout, so the site's stylesheet is not loaded there at all. Inline
 * styles are not a shortcut here; they are the only thing that reaches.
 *
 * **Every colour comes from Payload's own theme variables** rather than from a
 * literal, so these views follow the admin's light and dark themes instead of
 * fighting them — and an admin who switches theme does not find سنون's pages
 * unreadable. `--theme-elevation-*` runs from the background (0) to the
 * foreground (1000) in whichever theme is active, which is why nothing below
 * names a grey.
 */

const BORDER = '1px solid var(--theme-elevation-150)'

/** The page frame. One measure, one padding, RTL, and nothing else to decide. */
export function AdminPage({
  title,
  lead,
  wide = false,
  children,
}: {
  title: string
  /** What this page is for, in one line. Optional but almost always worth it. */
  lead?: string
  /** A table of many columns needs the room; a review queue does not. */
  wide?: boolean
  children: React.ReactNode
}) {
  return (
    <div
      dir="rtl"
      style={{
        padding: 'clamp(1rem, 4vw, 2rem)',
        maxWidth: wide ? '75rem' : '60rem',
        margin: '0 auto',
        color: 'var(--theme-elevation-800)',
      }}
    >
      <h1 style={{ margin: '0 0 0.35rem', fontSize: '1.6rem' }}>{title}</h1>
      {lead ? (
        <p style={{ margin: '0 0 1.5rem', color: 'var(--theme-elevation-600)' }}>{lead}</p>
      ) : (
        <div style={{ height: '1.5rem' }} />
      )}
      {children}
    </div>
  )
}

/** A bordered region with an optional heading and an optional action beside it. */
export function Panel({
  title,
  action,
  children,
  style,
}: {
  title?: string
  action?: React.ReactNode
  children: React.ReactNode
  style?: React.CSSProperties
}) {
  return (
    <section
      style={{
        border: BORDER,
        borderRadius: '0.5rem',
        background: 'var(--theme-elevation-0)',
        padding: '1.25rem',
        marginBottom: '1.25rem',
        ...style,
      }}
    >
      {title || action ? (
        <header
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: '0.75rem',
            marginBottom: title ? '0.9rem' : 0,
          }}
        >
          {title ? <h2 style={{ margin: 0, fontSize: '1.05rem' }}>{title}</h2> : <span />}
          {action}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export type Tone = 'neutral' | 'info' | 'success' | 'warning' | 'danger'

/*
 * **Colour is never the only signal**, the same rule the site follows. Every
 * `Tag` carries its Arabic label, and the colour only makes a page of them
 * scannable. An admin reading in a dark theme, or not distinguishing these hues,
 * loses nothing that matters.
 */
const TONE_BG: Record<Tone, string> = {
  neutral: 'var(--theme-elevation-100)',
  info: 'var(--theme-elevation-150)',
  success: 'var(--theme-success-100)',
  warning: 'var(--theme-warning-100)',
  danger: 'var(--theme-error-100)',
}

const TONE_FG: Record<Tone, string> = {
  neutral: 'var(--theme-elevation-700)',
  info: 'var(--theme-elevation-800)',
  success: 'var(--theme-success-750)',
  warning: 'var(--theme-warning-750)',
  danger: 'var(--theme-error-750)',
}

export function Tag({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.15rem 0.6rem',
        borderRadius: '999px',
        fontSize: '0.78rem',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: TONE_BG[tone],
        color: TONE_FG[tone],
      }}
    >
      {label}
    </span>
  )
}

/**
 * A count, with what it counts under it.
 *
 * Worth having in front of an admin for the reason recorded in `docs/incidents`:
 * a wrong stage-capability mapping makes cases invisible rather than merely
 * inconvenient, and the only symptom is REQUESTED climbing while nothing gets
 * claimed. A number nobody looks at does not catch that; a row of them at the
 * top of the page might.
 */
export function Stat({ label, value, tone = 'neutral' }: { label: string; value: number; tone?: Tone }) {
  return (
    <div
      style={{
        border: BORDER,
        borderRadius: '0.5rem',
        padding: '0.75rem 1rem',
        background: TONE_BG[tone],
        minWidth: '6rem',
      }}
    >
      {/* Western digits, and their own direction: a number inside an Arabic
          paragraph re-orders without one. */}
      <strong dir="ltr" style={{ display: 'block', fontSize: '1.5rem', color: TONE_FG[tone] }}>
        {value}
      </strong>
      <span style={{ fontSize: '0.8rem', color: 'var(--theme-elevation-600)' }}>{label}</span>
    </div>
  )
}

export function StatRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '1.25rem' }}>
      {children}
    </div>
  )
}

/** A plain data table. Headers are `<th scope="col">`, so this reads correctly
 *  to anyone using a screen reader rather than being a grid of divs. */
export function Table({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                style={{
                  textAlign: 'start',
                  padding: '0.5rem 0.6rem',
                  borderBottom: BORDER,
                  color: 'var(--theme-elevation-600)',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Cell({
  children,
  ltr = false,
}: {
  children: React.ReactNode
  /** A reference code, a date or a count re-orders inside an RTL row without
   *  a direction of its own. */
  ltr?: boolean
}) {
  return (
    <td
      style={{
        padding: '0.6rem',
        borderBottom: BORDER,
        verticalAlign: 'top',
        ...(ltr ? { direction: 'ltr', textAlign: 'right' as const } : {}),
      }}
    >
      {children}
    </td>
  )
}

/**
 * Why this screen is empty.
 *
 * **A screen that is empty for a reason must say the reason** — an empty admin
 * reads as broken, and whoever can fix it has to be told which thing is missing,
 * by name. `reason` is that sentence, and it is required rather than optional so
 * that the next empty list cannot be added without one.
 */
export function Empty({ reason }: { reason: string }) {
  return (
    <p
      style={{
        margin: 0,
        padding: '1.5rem',
        textAlign: 'center',
        color: 'var(--theme-elevation-600)',
        background: 'var(--theme-elevation-50)',
        borderRadius: '0.5rem',
      }}
    >
      {reason}
    </p>
  )
}

/**
 * The filter strip: a plain GET form of links, no JavaScript.
 *
 * Same decision as the student queue's filter — the browser builds the query
 * string and navigates, so it works with nothing loaded and on any connection.
 * The current choice is marked by weight and background rather than by colour
 * alone.
 */
export function FilterLinks({
  options,
  current,
  hrefFor,
}: {
  options: { value: string; label: string; count?: number }[]
  current: string
  hrefFor: (value: string) => string
}) {
  return (
    <nav style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {options.map((option) => {
        const active = option.value === current
        return (
          <Link
            key={option.value}
            href={hrefFor(option.value)}
            aria-current={active ? 'page' : undefined}
            style={{
              padding: '0.3rem 0.75rem',
              borderRadius: '999px',
              border: BORDER,
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: active ? 700 : 400,
              background: active ? 'var(--theme-elevation-150)' : 'transparent',
              color: 'var(--theme-elevation-800)',
            }}
          >
            {option.label}
            {typeof option.count === 'number' ? (
              <span dir="ltr" style={{ marginInlineStart: '0.35rem', opacity: 0.7 }}>
                {option.count}
              </span>
            ) : null}
          </Link>
        )
      })}
    </nav>
  )
}
