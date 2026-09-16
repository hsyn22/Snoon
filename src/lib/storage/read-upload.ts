import 'server-only'
import {
  getStorageConfig,
  r2Endpoint,
  UPLOAD_PREFIX,
  type UploadCollection,
} from '@/lib/storage/config'

/**
 * Read one uploaded file's bytes, from wherever uploads currently live.
 *
 * `/api/case-photos/[photoId]` is the only route in سنون that serves an upload
 * to somebody who is not an admin, and it used to read the file straight off
 * `process.cwd()/uploads/case-photos`. That is the assumption object storage
 * breaks: the bytes are no longer on this machine. One function knows the
 * difference, so the route keeps doing the part that matters — re-answering
 * "who is asking?" on every request — and nothing else in the codebase learns
 * where files are kept.
 *
 * Returns null rather than throwing on a missing file, because the caller turns
 * that into the same 404 it returns for a photograph the viewer may not see.
 * Whether a given file exists is itself something only an allowed viewer should
 * learn.
 */
export async function readUpload(
  collection: UploadCollection,
  filename: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const prefix = UPLOAD_PREFIX[collection]
  const config = getStorageConfig()

  if (!config) {
    // Local disk: development, and any deployment with no object storage yet.
    // `uploads/` is outside /public, which is what keeps it unserved.
    try {
      const { readFile } = await import('node:fs/promises')
      const { join } = await import('node:path')
      return new Uint8Array(await readFile(join(process.cwd(), 'uploads', prefix, filename)))
    } catch {
      return null
    }
  }

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const client = new S3Client({
      endpoint: r2Endpoint(config),
      region: 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    })

    const result = await client.send(
      new GetObjectCommand({ Bucket: config.bucket, Key: `${prefix}/${filename}` }),
    )

    const bytes = await result.Body?.transformToByteArray()
    // Copied onto a plain ArrayBuffer so the result is a `BodyInit` the route
    // can hand straight to a Response.
    return bytes ? new Uint8Array(bytes) : null
  } catch {
    return null
  }
}
