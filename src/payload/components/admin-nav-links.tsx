import Link from 'next/link'

/**
 * Links to the custom views in the admin's own sidebar.
 *
 * Payload lists its collections automatically, but a view registered under
 * `admin.components.views` has no entry anywhere — an admin would have to know
 * to type the URL. These are the places where the CMS reads across into the
 * Drizzle schema, so they belong in the nav next to everything else.
 *
 * Grouped by who each page is about rather than listed flat: سنون has two
 * audiences everywhere else in the product, and an admin looking for a student
 * should not have to read past the case pages to find them.
 */
const GROUPS = [
  {
    heading: 'المراجعين',
    links: [
      { href: '/admin/patients', label: 'كل الحالات' },
      { href: '/admin/cases', label: 'دوّر على حالة برمزها' },
    ],
  },
  {
    heading: 'الطلبة',
    links: [{ href: '/admin/students', label: 'الطلبة والتوثيق' }],
  },
  {
    heading: 'سنون',
    links: [{ href: '/admin/reviews', label: 'آراء عن سنون' }],
  },
]

export default function AdminNavLinks() {
  return (
    <nav
      style={{
        display: 'grid',
        gap: '1rem',
        margin: '0 0 1.25rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--theme-elevation-150)',
      }}
    >
      {GROUPS.map((group) => (
        <div key={group.heading} style={{ display: 'grid', gap: '0.3rem' }}>
          <h3
            style={{
              margin: 0,
              fontSize: '0.72rem',
              fontWeight: 700,
              letterSpacing: '0.04em',
              color: 'var(--theme-elevation-500)',
            }}
          >
            {group.heading}
          </h3>
          {group.links.map((link) => (
            <Link key={link.href} href={link.href} style={{ textDecoration: 'none' }}>
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  )
}
