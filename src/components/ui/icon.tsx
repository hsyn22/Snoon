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

/** A phone with a shield — one student, and only after claiming. */
export function ShieldPhoneIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="5" y="2.5" width="10" height="19" rx="2.5" />
      <path d="M10 18.6h0" />
      <path d="M16.5 8.6c1.6 0 3-.6 3.6-1.2v3.2c0 2.3-1.6 3.9-3.6 4.6-2-.7-3.6-2.3-3.6-4.6V7.4c.6.6 2 1.2 3.6 1.2Z" />
    </Svg>
  )
}

/** An image with the location pin struck through — EXIF stripped. */
export function ImageNoGeoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="2.5" y="4" width="19" height="16" rx="2.5" />
      <path d="M2.5 16.5 8 11.5l4.5 4" />
      <circle cx="16" cy="9" r="1.4" />
      <path d="m3.5 20.5 17-17" />
    </Svg>
  )
}

/** A clock with an arrow back — the retention period. */
export function ExpiryIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.2 12a8.8 8.8 0 1 0 2.6-6.2" />
      <path d="M3 3.2v3.4h3.4" />
      <path d="M12 7.6V12l3 1.8" />
    </Svg>
  )
}

/** A form with most of it crossed out — we ask for less than we could. */
export function MinimalFormIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8.2h8" />
      <path d="M8 12.2h5" />
      <path d="m8 16.2 2 2 3.5-3.6" />
    </Svg>
  )
}

/** A speech bubble with a tick — the student rings you. */
export function CallAgreedIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20.5 12.4c0 4-3.8 7.2-8.5 7.2a9.8 9.8 0 0 1-2.6-.34L4.2 21l1.3-3.7a6.9 6.9 0 0 1-2-4.9C3.5 8.4 7.3 5.2 12 5.2s8.5 3.2 8.5 7.2Z" />
      <path d="m9 12.4 2 2 4-4.2" />
    </Svg>
  )
}

/** A form being filled — the patient submits. */
export function SubmitIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19 13.5V19a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h5.5" />
      <path d="M15.5 3.6 20.4 8.5 13.2 15.7 8.3 16.3l.6-4.9 6.6-7.8Z" />
    </Svg>
  )
}

/** A chair under a light — treatment at the clinic. */
export function ClinicIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 21v-5.5a3 3 0 0 1 3-3h3.5a3 3 0 0 1 3 3V21" />
      <path d="M4.5 21h15" />
      <path d="M9 12.5V8a2.5 2.5 0 0 1 5 0v4.5" />
      <path d="M17 3.2 20.2 6M20.2 6l-2.4 2.6" />
    </Svg>
  )
}

/* The photograph preview's three controls. Each sits beside its Arabic word
   rather than replacing it: a bare icon on a destructive action is a guess. */

export function CloseIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function RotateIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M20 12a8 8 0 1 1-2.6-5.9" />
      <path d="M20 3v4h-4" />
    </Svg>
  )
}

export function CropIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 2v14a2 2 0 0 0 2 2h14" />
      <path d="M2 6h14a2 2 0 0 1 2 2v14" />
    </Svg>
  )
}

/** The queue's filter control. Three bars narrowing — the funnel everybody knows,
    drawn as lines rather than a solid so it sits with the rest of the set. */
export function FilterIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 5h18M6 12h12M10 19h4" />
    </Svg>
  )
}
