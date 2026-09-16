import { MAX_PHOTO_DIMENSION } from './limits'

/**
 * Rotating, cropping and shrinking a photograph **in the browser**, before it is
 * uploaded.
 *
 * No sharp, no library, nothing imported that a Client Component cannot carry —
 * the whole thing is a `<canvas>` and about a hundred lines of arithmetic, which
 * is why it is affordable on the phone this project exists to serve.
 *
 * Three reasons it exists, in the order they matter:
 *
 * 1. **The face warning only works if the patient can see the photograph.**
 *    سنون tells people not to photograph their face and then used to take
 *    whatever they picked without showing it back. Cropping is how somebody
 *    removes a lip or a chin that crept into the frame — a privacy control in
 *    the patient's own hands, which is the only kind that works before upload.
 * 2. **Upload is the patient's cost.** At 400kbps a 12MB photograph is roughly
 *    four minutes. Capped at the same long edge the server keeps, it is seconds.
 *    Nothing is lost: `processCasePhoto` was going to resize to
 *    `MAX_PHOTO_DIMENSION` anyway, so the pixels thrown away here are pixels
 *    that were never going to be stored.
 * 3. **A sideways photograph.** Orientation comes from an EXIF tag, and the
 *    patient is the one who can see whether the browser read it right.
 *
 * **This never replaces the server's processing and must not be made to.**
 * `processCasePhoto` still decodes, re-encodes and strips metadata, because
 * everything here runs on a machine we do not control — a hand-built request
 * skips it entirely. What this is, is a saving and a choice, never a check.
 *
 * Every failure falls back to the original file. A phone that cannot decode its
 * own HEIC, a canvas the browser refuses to encode, an image too large to
 * decode at all: the patient's photograph is uploaded as it was and the server
 * does what it always did. A picture editor is the last thing that may stop
 * somebody submitting a case.
 */

export type PhotoRotation = 0 | 90 | 180 | 270

/**
 * A crop, as fractions of the **rotated** picture rather than pixels.
 *
 * Fractions because the editor works on a version scaled to fit a phone screen,
 * and pixels from that would be pixels of the preview. Rotated space because
 * that is what the patient is looking at when they drag the handles.
 */
export type CropRect = { x: number; y: number; width: number; height: number }

export type PhotoEdits = {
  rotation: PhotoRotation
  crop: CropRect | null
}

export const NO_EDITS: PhotoEdits = { rotation: 0, crop: null }

export function hasEdits(edits: PhotoEdits): boolean {
  return edits.rotation !== 0 || edits.crop !== null
}

export function rotateBy(rotation: PhotoRotation, quarters: number): PhotoRotation {
  return (((rotation + quarters * 90) % 360) + 360) % 360 as PhotoRotation
}

/** Is there enough of a browser here to edit at all? */
export function canEditPhotos(): boolean {
  if (typeof window === 'undefined') return false
  // Without DataTransfer the edited files cannot be put back into the file
  // input, so the form would post the originals while the patient looked at
  // something else. Showing an editor that silently does nothing is worse than
  // showing none.
  return typeof DataTransfer !== 'undefined' && typeof document.createElement === 'function'
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('decode failed'))
    }
    image.src = url
  })
}

function clampCrop(crop: CropRect): CropRect {
  const x = Math.min(Math.max(crop.x, 0), 1)
  const y = Math.min(Math.max(crop.y, 0), 1)
  return {
    x,
    y,
    width: Math.min(Math.max(crop.width, 0.05), 1 - x),
    height: Math.min(Math.max(crop.height, 0.05), 1 - y),
  }
}

/**
 * Apply the edits and return a new file, or the original if anything at all
 * goes wrong.
 *
 * Edits are always applied to the **original**, never to the last result, so
 * rotating four times returns to where it started rather than to four
 * generations of re-encoding.
 */
export async function applyPhotoEdits(original: File, edits: PhotoEdits): Promise<File> {
  try {
    const image = await loadImage(original)
    const width = image.naturalWidth
    const height = image.naturalHeight
    if (!width || !height) return original

    // A quarter turn swaps the picture's sides.
    const turned = edits.rotation === 90 || edits.rotation === 270
    const rotatedWidth = turned ? height : width
    const rotatedHeight = turned ? width : height

    const crop = clampCrop(edits.crop ?? { x: 0, y: 0, width: 1, height: 1 })
    const cropX = crop.x * rotatedWidth
    const cropY = crop.y * rotatedHeight
    const cropWidth = crop.width * rotatedWidth
    const cropHeight = crop.height * rotatedHeight

    // Never upscale: a small photograph must not become a bigger file.
    const scale = Math.min(1, MAX_PHOTO_DIMENSION / Math.max(cropWidth, cropHeight))
    const outWidth = Math.max(1, Math.round(cropWidth * scale))
    const outHeight = Math.max(1, Math.round(cropHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = outWidth
    canvas.height = outHeight
    const context = canvas.getContext('2d')
    if (!context) return original

    /*
     * One pass, deliberately. Drawing the whole rotated picture to an offscreen
     * canvas and cropping from that is easier to read and allocates a full-size
     * canvas — roughly 48MB for a 12-megapixel photograph, on a phone chosen for
     * being cheap. The transform below gets to the same place allocating only
     * the output.
     *
     * Read it outwards: scale, then shift the crop's corner to the origin, then
     * turn the picture. Each rotation's translate is the corner the turn moves
     * the image off.
     */
    context.scale(scale, scale)
    context.translate(-cropX, -cropY)
    if (edits.rotation === 90) {
      context.translate(height, 0)
      context.rotate(Math.PI / 2)
    } else if (edits.rotation === 180) {
      context.translate(width, height)
      context.rotate(Math.PI)
    } else if (edits.rotation === 270) {
      context.translate(0, width)
      context.rotate(-Math.PI / 2)
    }
    context.drawImage(image, 0, 0)

    const blob = await new Promise<Blob | null>((resolve) => {
      // WebP is what the server stores anyway, and it is accepted on upload.
      canvas.toBlob(resolve, 'image/webp', 0.85)
    })
    if (!blob || blob.size === 0) return original

    // Uncropped and unrotated, a re-encode that came out bigger is pure loss —
    // the patient would pay to upload more bytes for the same picture.
    if (!hasEdits(edits) && blob.size >= original.size) return original

    return new File([blob], renameToWebp(original.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } catch {
    // Every failure path ends here: upload what the patient chose and let the
    // server do what it has always done.
    return original
  }
}

function renameToWebp(name: string): string {
  const base = name.replace(/\.[^./\\]+$/, '')
  return `${base || 'photo'}.webp`
}

/**
 * Put files back into a `<input type="file">`.
 *
 * The form still posts the way it always did, so the server action is unchanged
 * and a browser that never ran this JavaScript submits the originals.
 */
export function setInputFiles(input: HTMLInputElement, files: readonly File[]): boolean {
  try {
    const transfer = new DataTransfer()
    for (const file of files) transfer.items.add(file)
    input.files = transfer.files
    return true
  } catch {
    return false
  }
}
