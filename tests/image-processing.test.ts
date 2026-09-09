import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import {
  MAX_PHOTO_BYTES,
  processCasePhoto,
} from '@/lib/images/process'

/**
 * Intraoral photograph handling.
 *
 * The important test here is the metadata one. A phone photograph carries EXIF,
 * and EXIF routinely carries GPS — publishing a patient's home coordinates
 * alongside a picture of their mouth would be a serious harm, and it is the kind
 * that is invisible unless something checks.
 */

/** A JPEG carrying EXIF, including GPS tags, exactly as a phone would produce. */
async function photoWithExif(width = 40, height = 30): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 200, g: 150, b: 150 } },
  })
    .jpeg()
    // sharp writes a GPS block at runtime but does not declare the key in its
    // Exif type. Casting keeps the GPS tags in the fixture, which is the whole
    // point of this image: without them the stripping test proves nothing.
    .withExif({
      IFD0: { Software: 'snoon-test-marker', Make: 'TestPhone', Model: 'TestModel' },
      GPS: { GPSLatitudeRef: 'N', GPSLongitudeRef: 'E' },
    } as unknown as Parameters<ReturnType<typeof sharp>['withExif']>[0])
    .toBuffer()
}

describe('processCasePhoto', () => {
  describe('metadata', () => {
    it('starts from an image that really does carry EXIF', async () => {
      // Guards the test itself: if this stopped being true, the assertion below
      // would pass for the wrong reason.
      const input = await photoWithExif()
      const before = await sharp(input).metadata()
      expect(before.exif).toBeDefined()
      expect(before.exif!.length).toBeGreaterThan(0)
    })

    it('strips it, so no GPS or device details survive', async () => {
      const result = await processCasePhoto(await photoWithExif())
      expect(result.ok).toBe(true)
      if (!result.ok) return

      const after = await sharp(result.photo.data).metadata()
      expect(after.exif).toBeUndefined()
    })

    it('leaves no trace of the original tags in the bytes', async () => {
      // Checked as raw bytes rather than through a parser: a marker surviving in
      // a container the parser skips would still be a leak.
      const result = await processCasePhoto(await photoWithExif())
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.photo.data.includes(Buffer.from('snoon-test-marker'))).toBe(false)
      expect(result.photo.data.includes(Buffer.from('TestPhone'))).toBe(false)
      expect(result.photo.data.includes(Buffer.from('TestModel'))).toBe(false)
    })
  })

  describe('re-encoding', () => {
    it('produces WebP whatever went in', async () => {
      for (const format of ['jpeg', 'png'] as const) {
        const input = await sharp({
          create: { width: 50, height: 50, channels: 3, background: { r: 1, g: 2, b: 3 } },
        })
          [format]()
          .toBuffer()

        const result = await processCasePhoto(input)
        expect(result.ok).toBe(true)
        if (!result.ok) continue
        expect((await sharp(result.photo.data).metadata()).format).toBe('webp')
      }
    })

    it('caps the long edge without distorting the picture', async () => {
      const input = await sharp({
        create: { width: 4000, height: 3000, channels: 3, background: { r: 9, g: 9, b: 9 } },
      })
        .jpeg()
        .toBuffer()

      const result = await processCasePhoto(input)
      expect(result.ok).toBe(true)
      if (!result.ok) return

      expect(result.photo.width).toBe(1600)
      expect(result.photo.height).toBe(1200)
    })

    it('does not enlarge a photograph that is already small', async () => {
      const input = await sharp({
        create: { width: 120, height: 90, channels: 3, background: { r: 9, g: 9, b: 9 } },
      })
        .jpeg()
        .toBuffer()

      const result = await processCasePhoto(input)
      expect(result.ok && result.photo.width).toBe(120)
    })

    it('makes a phone-sized photograph substantially smaller', async () => {
      // The median user is paying for these bytes on a slow connection.
      const input = await sharp({
        create: { width: 3000, height: 2000, channels: 3, background: { r: 120, g: 90, b: 90 } },
      })
        .jpeg({ quality: 100 })
        .toBuffer()

      const result = await processCasePhoto(input)
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.photo.bytes).toBeLessThan(input.byteLength)
    })
  })

  describe('refusals', () => {
    it('rejects a file that only claims to be an image', async () => {
      const result = await processCasePhoto(Buffer.from('<html>not a photograph</html>'))
      expect(result).toEqual({ ok: false, reason: 'NOT_AN_IMAGE' })
    })

    it('rejects an empty buffer', async () => {
      expect(await processCasePhoto(Buffer.alloc(0))).toEqual({ ok: false, reason: 'NOT_AN_IMAGE' })
    })

    it('rejects anything over the size cap before decoding it', async () => {
      const result = await processCasePhoto(Buffer.alloc(MAX_PHOTO_BYTES + 1))
      expect(result).toEqual({ ok: false, reason: 'TOO_LARGE' })
    })
  })
})
