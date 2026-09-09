import type { CollectionConfig } from 'payload'
import { isAdmin } from '@/payload/access'

/**
 * Intraoral photographs, stored.
 *
 * Nothing here is publicly readable and nothing is served from `/public`. These
 * are pictures inside a patient's mouth: `read` is limited to logged-in admins,
 * so Payload's own file route is admin-only, and students and patients are
 * served through `/api/case-photos/[id]`, which re-checks who is asking on every
 * request.
 *
 * Only WebP is accepted because everything is re-encoded before it gets here —
 * which is also what removes the EXIF, and with it the GPS coordinates a phone
 * writes into a photograph.
 */
export const CasePhotos: CollectionConfig = {
  slug: 'case-photos',
  labels: { singular: 'صورة حالة', plural: 'صور الحالات' },
  admin: {
    useAsTitle: 'filename',
    group: 'الإدارة',
    description: 'صور داخل الفم. للمراجعة والحذف فقط.',
  },

  access: {
    read: isAdmin,
    // Created only through the Local API, from the submission path that has
    // already processed and stripped the image.
    create: () => false,
    update: isAdmin,
    // Admins can remove any image.
    delete: isAdmin,
  },

  upload: {
    staticDir: 'uploads/case-photos',
    mimeTypes: ['image/webp'],
    filesRequiredOnCreate: true,
  },

  fields: [
    {
      name: 'note',
      type: 'textarea',
      label: 'ملاحظة الإدارة',
      admin: { description: 'ملاحظات داخلية. ما تظهر للمريض ولا للطالب.' },
    },
  ],
}
