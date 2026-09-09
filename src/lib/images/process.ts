import sharp from 'sharp'

/**
 * Preparing an intraoral photograph for storage.
 *
 * Three things happen here, and each has a reason:
 *
 * 1. **Orientation is baked in and metadata dropped.** A phone photograph
 *    carries EXIF, and EXIF routinely carries GPS — the patient's home. `rotate()`
 *    with no argument applies the orientation tag so the image still looks right
 *    once the tag is gone, and sharp writes no metadata unless asked, so the
 *    re-encode is what removes it. Stripping location from a photograph of
 *    someone's mouth is not optional.
 * 2. **Re-encoded to WebP.** Smaller for a student on a slow connection, and it
 *    means whatever arrived is decoded and rewritten rather than stored as-is —
 *    a file that merely claims to be an image does not survive that.
 * 3. **Dimensions capped.** A modern phone camera produces something far larger
 *    than any screen needs, and the median user is paying for the bytes.
 */

/** Long edge. Enough to see a tooth; far less than a phone's native size. */
const MAX_DIMENSION = 1600
const WEBP_QUALITY = 78

/** What a browser may hand us. Checked again by decoding, not just believed. */
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'] as const

/** Before processing. A phone photograph is a few megabytes. */
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024

/** Enough to show a problem from a couple of angles; not an album. */
export const MAX_PHOTOS_PER_CASE = 4

export type ProcessedPhoto = {
  data: Buffer
  width: number
  height: number
  bytes: number
}

export type ProcessResult =
  | { ok: true; photo: ProcessedPhoto }
  | { ok: false; reason: 'TOO_LARGE' | 'NOT_AN_IMAGE' }

export async function processCasePhoto(input: Buffer): Promise<ProcessResult> {
  if (input.byteLength > MAX_PHOTO_BYTES) return { ok: false, reason: 'TOO_LARGE' }

  try {
    const { data, info } = await sharp(input, { failOn: 'error' })
      // No argument: apply the EXIF orientation tag, so the picture is still the
      // right way up after the tag is discarded.
      .rotate()
      .resize({
        width: MAX_DIMENSION,
        height: MAX_DIMENSION,
        fit: 'inside',
        // Never upscale a small photograph into a bigger file.
        withoutEnlargement: true,
      })
      // No .withMetadata(): that is what would carry EXIF, and with it GPS,
      // through to the stored file.
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true })

    return {
      ok: true,
      photo: { data, width: info.width, height: info.height, bytes: data.byteLength },
    }
  } catch {
    // Anything sharp cannot decode is not an image, whatever it claimed to be.
    return { ok: false, reason: 'NOT_AN_IMAGE' }
  }
}
