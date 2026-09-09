import type { CollectionConfig } from 'payload'

/**
 * Proof-of-enrolment documents uploaded by students.
 *
 * Payload owns the file because the admin reviewing it needs a viewer, and
 * because Payload's upload handling already does the storage and mime checks.
 * The student *record* still lives in Drizzle — this collection holds only the
 * evidence, and the record points at it by id.
 *
 * Nothing here is publicly readable. These are photographs of identity documents
 * belonging to real people: `read` is restricted to logged-in admins, and files
 * are written outside the public directory so there is no URL that serves one
 * without passing through Payload's access check.
 */
export const StudentDocuments: CollectionConfig = {
  slug: 'student-documents',
  labels: { singular: 'وثيقة طالب', plural: 'وثائق الطلبة' },
  admin: {
    useAsTitle: 'filename',
    group: 'الإدارة',
    description: 'وثائق تسجيل الطلبة. للمراجعة فقط.',
  },

  access: {
    // Admins only. Students upload through a server action that uses the Local
    // API, which bypasses access control deliberately and on the server.
    read: ({ req }) => Boolean(req.user),
    create: () => false,
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },

  upload: {
    // Outside /public on purpose — see the access note above.
    staticDir: 'uploads/student-documents',
    mimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
    // A student ID photographed on a phone; anything larger is a mistake.
    filesRequiredOnCreate: true,
  },

  fields: [
    {
      name: 'note',
      type: 'textarea',
      label: 'ملاحظة الإدارة',
      admin: { description: 'ملاحظات داخلية. ما تظهر للطالب.' },
    },
  ],
}
