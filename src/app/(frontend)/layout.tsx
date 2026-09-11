import type { Metadata, Viewport } from 'next'
import { IBM_Plex_Sans_Arabic } from 'next/font/google'
import { site, nav } from '@/lib/copy'
import './globals.css'

/**
 * The typeface, self-hosted.
 *
 * `next/font` downloads it at build time and serves it from our own origin, so
 * there is no request to Google at runtime — one fewer connection to set up on a
 * slow link, and nothing about a visitor leaves the site.
 *
 * Two weights only, and that is already about 94KB across the four files a
 * browser actually fetches — Arabic and Latin, regular and bold. Dropping the
 * Latin subset does not help: the faces are split by unicode-range and the
 * browser pulls Latin the moment a Western digit or a reference code appears,
 * which is on every page. A third weight would cost another 47KB for very
 * little.
 *
 * `display: 'swap'` is what makes this affordable. Text paints immediately in
 * the fallback and the real face swaps in when it lands, so on a slow connection
 * the page is readable at first paint rather than blank until the font arrives.
 * Measured: first paint moved 1.7s → 2.1s on Slow 3G, and a second visit is
 * unaffected because the font is cached.
 */
const arabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  weight: ['400', '700'],
  variable: '--font-arabic',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: `${site.name} — ${site.tagline}`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#ffffff',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // RTL is the default direction, not a mode. LTR is the exception and is opted
  // into per-element (see the .ltr-run utility), never here.
  return (
    <html lang="ar" dir="rtl" className={arabic.variable}>
      <body className="min-h-dvh antialiased">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-md"
        >
          {nav.skipToContent}
        </a>
        {children}
      </body>
    </html>
  )
}
