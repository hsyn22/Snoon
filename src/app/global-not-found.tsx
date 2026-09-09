import type { Metadata } from 'next'
import { common, site } from '@/lib/copy'
// This file bypasses the layout entirely, so nothing it needs is inherited —
// the stylesheet included.
import './(frontend)/globals.css'

/**
 * The 404 for a URL that matches nothing in the app.
 *
 * `not-found.tsx` inside a route group only answers `notFound()` calls within
 * that segment. سنون has two root layouts — the site and the Payload admin — so
 * there is no single layout an app-wide 404 could compose from, which is exactly
 * the case this file exists for. Without it an unmatched URL fell through to
 * Next's own screen: English, left-to-right, "This page could not be found".
 *
 * Needs `experimental.globalNotFound` in next.config.ts.
 */
export const metadata: Metadata = {
  title: `${common.notFoundTitle} — ${site.name}`,
  robots: { index: false, follow: false },
}

export default function GlobalNotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body className="min-h-dvh antialiased">
        <main className="mx-auto flex min-h-dvh max-w-3xl flex-col justify-center px-4">
          <h1 className="text-2xl font-bold">{common.notFoundTitle}</h1>
          <p className="mt-2 text-foreground-muted">{common.notFoundBody}</p>
          {/* A full load, not a client navigation: this page renders outside the
              app's layout and router. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="mt-6 text-sm font-medium text-accent underline">
            {common.backHome}
          </a>
        </main>
      </body>
    </html>
  )
}
