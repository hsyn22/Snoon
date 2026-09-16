import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'
import { getStorageConfig, r2Endpoint, UPLOAD_PREFIX } from '@/lib/storage/config'

/**
 * Object storage for the two upload collections.
 *
 * R2 speaks S3, so Payload's own S3 adapter drives it — there is no R2-specific
 * package to add and no second vocabulary to learn. Two settings make it R2
 * rather than AWS: `region: 'auto'`, because R2 has no regions to choose, and
 * `forcePathStyle`, because R2 addresses a bucket as a path segment rather than
 * as a subdomain.
 *
 * **`disablePayloadAccessControl` is deliberately left off.** Turning it on
 * makes the adapter hand out direct bucket URLs, and a direct URL is a URL that
 * nobody checks — it would take `read: isAdmin` on both of these collections and
 * quietly make it decorative. Files keep going through Payload, which keeps
 * going through the access rules.
 *
 * ## The plugin is always installed, and `enabled` is what varies
 *
 * This used to return `[]` when R2 was unconfigured, which seemed tidier and
 * **broke the production admin at the first deploy that had credentials**. The
 * blank page is worth understanding, because the shape of the mistake will
 * recur:
 *
 * `s3Storage` registers an admin component — `S3ClientUploadHandler` — whenever
 * it is installed, and by design it does so *whether or not* it is enabled,
 * "to avoid import map discrepancies between dev and prod". Payload resolves
 * admin components through `src/app/(payload)/admin/importMap.js`, a **file
 * generated at development time and committed**. Locally R2 was unconfigured,
 * so the plugin never loaded, so `payload:importmap` wrote a map without it.
 * Production had the four variables, loaded the plugin, asked the map for a
 * component that was not in it, and rendered nothing at all — no error visible
 * to whoever opened `/admin`.
 *
 * So the real fault was not the missing map entry. It was that **the shape of
 * the admin depended on environment variables**, which makes a committed,
 * generated file correct in one environment and wrong in another. Passing
 * `enabled` fixes that at the root: the plugin registers the same components
 * either way, `payload:importmap` produces the same file on any machine, and
 * what the flag actually switches is only whether an adapter is attached.
 *
 * Disabled behaves exactly as no plugin did: no adapter, `disableLocalStorage`
 * untouched, uploads to `uploads/` on the local disk. Local development still
 * needs no cloud account.
 */
export function storagePlugins(): Plugin[] {
  const config = getStorageConfig()

  return [
    s3Storage({
      // Never conditional on this being non-null: see the note above.
      enabled: config !== null,

      /**
       * The prefixes are not decoration. Without one the adapter stores a file
       * under its bare filename, so both collections share the bucket root and
       * a student's enrolment document and an intraoral photograph that happen
       * to be named the same thing overwrite each other. Naming each prefix
       * after the collection also keeps the bucket's layout the same as the
       * local `uploads/` directory, which is what `readUpload` relies on.
       */
      collections: {
        'case-photos': { prefix: UPLOAD_PREFIX['case-photos'] },
        'student-documents': { prefix: UPLOAD_PREFIX['student-documents'] },
      },

      // Read but never used while disabled — the adapter is not built at all.
      bucket: config?.bucket ?? '',
      config: {
        endpoint: config ? r2Endpoint(config) : '',
        region: 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: config?.accessKeyId ?? '',
          secretAccessKey: config?.secretAccessKey ?? '',
        },
      },
    }),
  ]
}
