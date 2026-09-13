import { describe, expect, it } from 'vitest'
import { DEFAULT_MOTION_TIER, MOTION_TIER_SCRIPT, type MotionTier } from '@/lib/motion-tier'

/**
 * Which motion a device gets.
 *
 * The detection ships as a string of JavaScript, because it has to run inline
 * while the browser parses the HTML — before the first paint, and long before
 * React exists. A string is not type-checked and not linted, so it is the kind
 * of code that rots quietly. This runs it.
 *
 * The failure that matters is not "a fast phone got the plain version". It is a
 * cheap Android being handed a gradient mesh and three drifting layers, on the
 * hardware non-negotiable 7 is written about.
 */

type Device = {
  deviceMemory?: number
  hardwareConcurrency?: number
  saveData?: boolean
  reducedMotion?: boolean
  finePointer?: boolean
  search?: string
}

/**
 * Runs the real script against a fake browser.
 *
 * The script reads `document`, `location`, `matchMedia` and `navigator` as free
 * variables, so passing them as parameters shadows the globals and the function
 * body needs no modification — the string under test is byte-for-byte the string
 * that ships.
 */
function tierFor(device: Device): MotionTier {
  const root = { dataset: { motion: DEFAULT_MOTION_TIER } }

  const matchMedia = (query: string) => ({
    matches:
      query.includes('prefers-reduced-motion: reduce')
        ? device.reducedMotion === true
        : query.includes('pointer: fine')
          ? device.finePointer === true
          : false,
  })

  const navigator = {
    deviceMemory: device.deviceMemory,
    hardwareConcurrency: device.hardwareConcurrency,
    connection: { saveData: device.saveData === true, effectiveType: '4g' },
  }

  new Function(
    'document',
    'location',
    'matchMedia',
    'navigator',
    MOTION_TIER_SCRIPT,
  )({ documentElement: root }, { search: device.search ?? '' }, matchMedia, navigator)

  return root.dataset.motion as MotionTier
}

describe('the motion tier a device is given', () => {
  it('gives a cheap Android nothing at all', () => {
    // The phone this whole project is designed around. Two gigabytes and four
    // cores must not be handed three drifting blurred layers.
    expect(tierFor({ deviceMemory: 2, hardwareConcurrency: 4 })).toBe('none')
    expect(tierFor({ deviceMemory: 1, hardwareConcurrency: 8 })).toBe('none')
    expect(tierFor({ deviceMemory: 8, hardwareConcurrency: 2 })).toBe('none')
  })

  it('gives a mid-range phone the standard pass', () => {
    expect(tierFor({ deviceMemory: 4, hardwareConcurrency: 8 })).toBe('standard')
    expect(tierFor({ deviceMemory: 4, hardwareConcurrency: 6 })).toBe('standard')
  })

  it('gives a flagship everything', () => {
    expect(tierFor({ deviceMemory: 8, hardwareConcurrency: 8 })).toBe('full')
  })

  it('lets a desktop through on cores when it reports no memory', () => {
    // Safari and Firefox do not implement deviceMemory. Without this clause a
    // capable laptop would sit at standard forever.
    expect(tierFor({ hardwareConcurrency: 10, finePointer: true })).toBe('full')
    // …but not a phone, which has no fine pointer.
    expect(tierFor({ hardwareConcurrency: 10, finePointer: false })).toBe('standard')
  })

  it('obeys a reduced-motion preference over any hardware', () => {
    // A stated preference is about a person, not a device. It is the only signal
    // here that may not be overruled by a fast chip.
    expect(
      tierFor({ deviceMemory: 8, hardwareConcurrency: 16, reducedMotion: true }),
    ).toBe('none')
  })

  it('obeys a data saver', () => {
    // Motion costs no bytes, but turning on a data saver is the clearest "give
    // me the light version" a browser sends, and honouring it is free.
    expect(tierFor({ deviceMemory: 8, hardwareConcurrency: 8, saveData: true })).toBe('none')
  })

  it('falls back to standard when the browser tells us nothing', () => {
    // Every unknown lands on the tier that was measured as free, never on the
    // expensive one and never on nothing.
    expect(tierFor({})).toBe('standard')
    expect(DEFAULT_MOTION_TIER).toBe('standard')
  })

  it('accepts an explicit override so a tier can be seen on a real phone', () => {
    expect(tierFor({ deviceMemory: 2, hardwareConcurrency: 4, search: '?motion=full' })).toBe('full')
    expect(tierFor({ deviceMemory: 8, hardwareConcurrency: 8, search: '?motion=none' })).toBe('none')
    expect(tierFor({ search: '?a=1&motion=standard' })).toBe('standard')
  })

  it('ignores an override that is not one of the three tiers', () => {
    // The value goes straight into an attribute that selects CSS. It may only
    // ever be one of three literals.
    expect(tierFor({ deviceMemory: 4, hardwareConcurrency: 8, search: '?motion=evil' })).toBe(
      'standard',
    )
    expect(
      tierFor({ deviceMemory: 2, hardwareConcurrency: 4, search: '?motion=none2' }),
    ).toBe('none')
  })

  it('survives a browser that implements none of the APIs it asks about', () => {
    // Every access is inside one try/catch, so an exception leaves the
    // server-rendered default in place rather than an unstyled page.
    const root = { dataset: { motion: DEFAULT_MOTION_TIER } }
    expect(() =>
      new Function('document', 'location', 'matchMedia', 'navigator', MOTION_TIER_SCRIPT)(
        { documentElement: root },
        { search: '' },
        () => {
          throw new Error('matchMedia is not a function')
        },
        {},
      ),
    ).not.toThrow()
    expect(root.dataset.motion).toBe('standard')
  })
})
