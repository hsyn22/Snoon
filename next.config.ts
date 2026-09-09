import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Intraoral photographs are never served from /public — they go through an
  // authenticated route that re-checks authorisation per request. See CLAUDE.md.
  images: {
    remotePatterns: [],
  },

  experimental: {
    // Serves src/app/global-not-found.tsx for URLs that match no route. Needed
    // because سنون has two root layouts — the site and the Payload admin — so
    // there is no single layout a 404 could be composed from.
    globalNotFound: true,

    serverActions: {
      /**
       * A case is submitted through a server action, and those are capped at 1MB
       * by default — well under a single photograph from a phone. The whole
       * request died with an English "a server error occurred" and took the
       * filled-in form with it, which is exactly where a patient gives up.
       *
       * Sized for the documented limits: four photographs at 12MB each, plus the
       * form. The browser refuses anything over them before uploading, so this
       * is the ceiling rather than the everyday case.
       */
      bodySizeLimit: '52mb',
    },
  },

  /**
   * Response headers.
   *
   * Next sets none of these by default. The one that matters most here is
   * `Referrer-Policy`: a patient's tracking token is part of the URL, and the
   * tracking page links out to Telegram. Browsers happen to default to
   * strict-origin-when-cross-origin, so the path is not sent — but a credential
   * in a URL should not depend on a browser default staying what it is today.
   *
   * `frame-ancestors 'none'` (with X-Frame-Options for older browsers) stops the
   * student dashboard and the admin being framed, which is what a clickjack on
   * the claim button would need. `form-action 'self'` keeps a submission from
   * being redirected off-site — every form here posts to a server action.
   *
   * There is no script-src yet: Next and the Payload admin both inline scripts,
   * so a real CSP needs nonces threaded through both and is its own piece of
   * work rather than a line in this file.
   */
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'X-Frame-Options', value: 'DENY' },
      {
        key: 'Content-Security-Policy',
        value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(), payment=()',
      },
    ]

    // Only over HTTPS, and only in production: sent in development it would pin
    // localhost to HTTPS in the developer's browser for two years.
    if (process.env.NODE_ENV === 'production') {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=63072000; includeSubDomains',
      })
    }

    /**
     * Pages that carry a patient's name and phone number, or run on a token in
     * the URL. Next's default for a dynamic page is `no-cache, must-revalidate`,
     * which a shared cache may still store a copy of; `private, no-store` says
     * this response belongs to one person and is not to be kept.
     */
    const privatePages = [
      { key: 'Cache-Control', value: 'private, no-store, must-revalidate' },
      // Belt and braces on top of each page's own robots metadata.
      { key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' },
    ]

    return [
      { source: '/:path*', headers },
      { source: '/case/track/:path*', headers: privatePages },
      { source: '/student', headers: privatePages },
      { source: '/student/:path*', headers: privatePages },
      { source: '/admin/:path*', headers: privatePages },
    ]
  },
}

// Payload wraps the config to register its admin bundle and server externals.
export default withPayload(nextConfig)
