/**
 * Where uploaded files actually live.
 *
 * Payload writes uploads to `staticDir` — a local disk — which is correct in
 * development and silently wrong on Vercel, where the filesystem is destroyed
 * minutes after a deploy. A patient watches a photograph of their mouth upload
 * successfully and it is gone before a student ever looks at the case. Nothing
 * errors; the row keeps a filename pointing at a file that no longer exists.
 *
 * So object storage is the real answer, and Cloudflare R2 is the one chosen:
 * ten gigabytes free, no charge for serving, and a bucket that is private by
 * default — which matters more than the price, because the whole access-control
 * table in CLAUDE.md rests on there being no URL that serves an intraoral
 * photograph without passing a check.
 *
 * Deliberately NOT `server-only`. This is read from `payload.config.ts`, which
 * the Payload CLI loads in plain Node for `migrate` and `seed`; that guard makes
 * a module unloadable outside a bundler, which is the same trap `settings.ts`
 * documents.
 */

/**
 * Where each collection's files sit, in the bucket and on disk alike.
 *
 * One map so the two can never drift: the R2 key prefix and the local directory
 * are the same string, and `readUpload` reads whichever is in use without
 * needing to know which. These must match the collections' `staticDir`.
 */
export const UPLOAD_PREFIX = {
  'case-photos': 'case-photos',
  'student-documents': 'student-documents',
} as const

export type UploadCollection = keyof typeof UPLOAD_PREFIX

export type StorageConfig = {
  accountId: string
  bucket: string
  accessKeyId: string
  secretAccessKey: string
}

/**
 * Null when R2 has not been set up, which is a normal state and not an error:
 * local development keeps writing to disk, exactly as it does today.
 *
 * All four are required together. Three of four is a deployment that believes
 * it has object storage and does not, which is worse than none at all — the
 * failure would otherwise land on the first patient to upload a photograph.
 */
export function getStorageConfig(): StorageConfig | null {
  const accountId = process.env.R2_ACCOUNT_ID
  const bucket = process.env.R2_BUCKET
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY

  if (!accountId || !bucket || !accessKeyId || !secretAccessKey) return null

  return { accountId, bucket, accessKeyId, secretAccessKey }
}

export function isStorageConfigured(): boolean {
  return getStorageConfig() !== null
}

/** R2's S3-compatible endpoint. Per account, not per bucket. */
export function r2Endpoint(config: StorageConfig): string {
  return `https://${config.accountId}.r2.cloudflarestorage.com`
}
