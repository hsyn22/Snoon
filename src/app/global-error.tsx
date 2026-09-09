'use client'

/**
 * The last resort: the root layout itself failed.
 *
 * This replaces the layout, so it has to render its own `<html>` and `<body>` —
 * and it must not depend on anything that might be what broke. No Tailwind, no
 * shared components, no imported copy: everything here is inline, so the page
 * still renders in Arabic and right-to-left when the CSS pipeline is the
 * failure.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="ar" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '1rem',
          fontFamily: 'system-ui, sans-serif',
          background: '#ffffff',
          color: '#111111',
        }}
      >
        <div style={{ maxWidth: '32rem', margin: '0 auto', width: '100%' }}>
          <h1 style={{ fontSize: '1.5rem', margin: 0 }}>صار خطأ</h1>
          <p style={{ marginTop: '0.5rem', color: '#555555' }}>
            ما كدرنا نحمّل الصفحة. جرّب مرة لخ.
          </p>

          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                minHeight: '2.75rem',
                padding: '0 1rem',
                borderRadius: '0.375rem',
                border: 'none',
                background: '#111111',
                color: '#ffffff',
                fontSize: '1rem',
                cursor: 'pointer',
              }}
            >
              جرّب مرة لخ
            </button>
            {/* A plain anchor on purpose: a full page load is the point when the
                root layout failed, and next/link would route through the client
                router that may be the thing that broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ alignSelf: 'center', color: '#111111', fontSize: '0.875rem' }}>
              رجوع للرئيسية
            </a>
          </div>

          {error.digest ? (
            <p style={{ marginTop: '2rem', fontSize: '0.75rem', color: '#555555' }}>
              رمز الخطأ:{' '}
              <span style={{ direction: 'ltr', unicodeBidi: 'isolate' }}>{error.digest}</span>
            </p>
          ) : null}
        </div>
      </body>
    </html>
  )
}
