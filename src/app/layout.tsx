import type { Metadata, Viewport } from 'next'
import { site, nav } from '@/lib/copy'
import './globals.css'

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
    <html lang="ar" dir="rtl">
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
