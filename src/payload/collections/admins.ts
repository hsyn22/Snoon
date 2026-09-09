import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/payload/access'

/**
 * سنون staff who log into the admin.
 *
 * Deliberately separate from student accounts: Better Auth owns students in the
 * `auth` schema, Payload owns admins in its own. An admin is not a student with
 * a flag, and a compromised student session can never become an admin one.
 */
export const Admins: CollectionConfig = {
  slug: 'admins',
  labels: { singular: 'مشرف', plural: 'المشرفون' },
  auth: true,
  admin: { useAsTitle: 'email', group: 'الإدارة' },
  access: {
    // Only a logged-in admin may read or manage other admins.
    read: isAdmin,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [{ name: 'fullName', type: 'text', required: true, label: 'الاسم' }],
}
