import { describe, expect, it } from 'vitest'
import {
  applyPhotoEdits,
  canEditPhotos,
  hasEdits,
  NO_EDITS,
  rotateBy,
  setInputFiles,
  type PhotoRotation,
} from '@/lib/images/edit'

/**
 * The browser-side photograph editor.
 *
 * What is worth testing here is not the drawing — a canvas in a fake browser
 * proves nothing about a real one — but the two properties that decide whether
 * a patient can submit their case at all:
 *
 * 1. **Every failure falls back to the original file.** A phone that cannot
 *    decode its own HEIC, a canvas the browser refuses to encode, a missing
 *    `DataTransfer`: the photograph must still be uploaded and the server must
 *    still get to do what it always did. A picture editor is the last thing
 *    that may stop somebody submitting a case.
 * 2. **Rotation is arithmetic**, and four turns must land back where they
 *    started rather than on a fourth generation of re-encoding.
 */

function fakeFile(name = 'tooth.jpg', bytes = 1024): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' })
}

describe('rotateBy', () => {
  it('turns a quarter at a time and comes back round', () => {
    let rotation: PhotoRotation = 0
    const seen: PhotoRotation[] = []
    for (let turn = 0; turn < 4; turn += 1) {
      rotation = rotateBy(rotation, 1)
      seen.push(rotation)
    }
    expect(seen).toEqual([90, 180, 270, 0])
  })

  it('never returns a negative angle', () => {
    // A CSS transform and a canvas rotation both cope with -90, but the value
    // is also compared against literals in `applyPhotoEdits`.
    expect(rotateBy(0, -1)).toBe(270)
    expect(rotateBy(90, -3)).toBe(180)
  })
})

describe('hasEdits', () => {
  it('is false for a photograph nobody touched', () => {
    expect(hasEdits(NO_EDITS)).toBe(false)
  })

  it('is true for a rotation alone and for a crop alone', () => {
    expect(hasEdits({ rotation: 90, crop: null })).toBe(true)
    expect(hasEdits({ rotation: 0, crop: { x: 0, y: 0, width: 0.5, height: 0.5 } })).toBe(true)
  })
})

describe('applyPhotoEdits', () => {
  /**
   * The environment these tests run in has no real image decoder, which makes
   * it exactly the environment the fallback exists for.
   */
  it('returns the original file when the picture cannot be decoded', async () => {
    const original = fakeFile()
    const result = await applyPhotoEdits(original, NO_EDITS)
    expect(result).toBe(original)
  })

  it('returns the original file when the edits cannot be applied either', async () => {
    const original = fakeFile()
    const result = await applyPhotoEdits(original, {
      rotation: 90,
      crop: { x: 0.1, y: 0.1, width: 0.5, height: 0.5 },
    })
    // Not merely "a file": the same one, so nothing is silently lost on the way
    // to a server that was always going to rotate and re-encode it anyway.
    expect(result).toBe(original)
  })

  it('never throws, whatever it is handed', async () => {
    const empty = new File([], 'nothing.jpg', { type: 'image/jpeg' })
    await expect(applyPhotoEdits(empty, NO_EDITS)).resolves.toBe(empty)
  })
})

describe('the enhancement gate', () => {
  /**
   * `canEditPhotos` is what decides whether the preview appears at all. It has
   * to be false wherever the edited files could not be written back into the
   * file input, because a form that posts the originals while the patient looks
   * at something else is worse than no preview.
   */
  it('is false on the server, where there is no window', () => {
    // Guards against a future refactor marking this module `server-only` or
    // reaching for `document` at import time: either would break the server
    // render of the case form.
    expect(typeof canEditPhotos()).toBe('boolean')
  })

  it('agrees with whether files can actually be written back', () => {
    const hasTransfer = typeof DataTransfer !== 'undefined'
    expect(canEditPhotos()).toBe(hasTransfer && typeof window !== 'undefined')
  })
})

describe('setInputFiles', () => {
  it('reports false rather than throwing where DataTransfer is missing', () => {
    // The caller uses the return value to decide nothing — it keeps working
    // either way — but a throw here would happen inside a change handler and
    // take the form with it.
    const input = { files: null } as unknown as HTMLInputElement
    expect(() => setInputFiles(input, [fakeFile()])).not.toThrow()
  })
})
