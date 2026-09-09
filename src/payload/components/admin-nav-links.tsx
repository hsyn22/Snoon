import Link from 'next/link'

/**
 * Links to the custom views in the admin's own sidebar.
 *
 * Payload lists its collections automatically, but a view registered under
 * `admin.components.views` has no entry anywhere — an admin would have to know
 * to type the URL. These are the two places where the CMS reads across into the
 * Drizzle schema, so they belong in the nav next to everything else.
 */
export default function AdminNavLinks() {
  return (
    <nav
      style={{
        display: 'grid',
        gap: '0.35rem',
        margin: '0 0 1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid rgba(128,128,128,0.25)',
      }}
    >
      <Link href="/admin/cases" style={{ textDecoration: 'none' }}>
        الحالات
      </Link>
      <Link href="/admin/students" style={{ textDecoration: 'none' }}>
        توثيق الطلبة
      </Link>
    </nav>
  )
}
