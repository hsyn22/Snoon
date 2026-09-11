/**
 * The icon set, inline.
 *
 * Both competitors lean on small icons everywhere — a pin before a city, a
 * calendar before a date, a tick inside a chip — and it is most of why their
 * pages read faster than ours. A label/value pair makes the reader parse two
 * Arabic words to find out which is which; a pin and a city do not.
 *
 * Drawn here rather than pulled from an icon package for the reason the wordmark
 * is: these are a few hundred bytes of markup that ship inside the HTML already
 * being downloaded, and an icon font or a package would be a second request and
 * several tens of kilobytes on a connection that cannot spare it.
 *
 * Every icon is a 24-viewBox stroked path taking `currentColor`, so it inherits
 * the colour of whatever it sits in and needs no variant per surface. They are
 * decorative: the text beside them carries the meaning, so they are all
 * `aria-hidden` and a screen reader never announces them.
 */

type IconProps = { className?: string }

function Svg({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={`inline-block shrink-0 ${className ?? ''}`}
    >
      {children}
    </svg>
  )
}

export function PinIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21s7-5.3 7-11a7 7 0 1 0-14 0c0 5.7 7 11 7 11Z" />
      <circle cx="12" cy="10" r="2.5" />
    </Svg>
  )
}

export function CalendarIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </Svg>
  )
}

export function ClockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  )
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="m5 13 4 4L19 7" />
    </Svg>
  )
}

/** A tick inside a circle. The verified mark, and every "done" step. */
export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12 2.5 2.5 4.5-5" />
    </Svg>
  )
}

/** Something the reader must notice but that is not an error. */
export function AlertIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.5 2.8 20h18.4L12 4.5Z" />
      <path d="M12 10v4M12 17.2v.1" />
    </Svg>
  )
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7 3.5h3l1.5 4-2 1.5a12 12 0 0 0 5.5 5.5l1.5-2 4 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 5 5.7 2 2 0 0 1 7 3.5Z" />
    </Svg>
  )
}

export function UserIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
    </Svg>
  )
}

/** The stage / college mark: a graduation cap. */
export function StageIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4 2.5 8.5 12 13l9.5-4.5L12 4Z" />
      <path d="M6.5 10.8V16c0 1.4 2.5 2.6 5.5 2.6s5.5-1.2 5.5-2.6v-5.2" />
    </Svg>
  )
}

export function NoteIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M5.5 3.5h13v17l-6.5-3-6.5 3v-17Z" />
      <path d="M9 8h6M9 11.5h4" />
    </Svg>
  )
}

/** Points along the reading direction. RTL flips it with a CSS transform. */
export function ArrowIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 12H5M11 6l-6 6 6 6" />
    </Svg>
  )
}
