import { s3Storage } from '@payloadcms/storage-s3'
import type { Plugin } from 'payload'
import { getStorageConfig, r2Endpoint, UPLOAD_PREFIX } from '@/lib/storage/config'

/**
 * The storage plugin, or nothing.
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
 * Returns an empty list when R2 is unconfigured, so local development keeps
 * writing to `uploads/` and a developer needs no cloud account to run سنون.
 */
export function storagePlugins(): Plugin[] {
  const config = getStorageConfig()
  if (!config) return []

  return [
    s3Storage({
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
      bucket: config.bucket,
      config: {
        endpoint: r2Endpoint(config),
        region: 'auto',
        forcePathStyle: true,
        credentials: {
          accessKeyId: config.accessKeyId,
          secretAccessKey: config.secretAccessKey,
        },
      },
    }),
  ]
}
