import { afterEach, describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  getStorageConfig,
  isStorageConfigured,
  r2Endpoint,
  UPLOAD_PREFIX,
} from '@/lib/storage/config'

/**
 * Object storage, and the two ways it fails without saying so.
 *
 * Both are the same shape as the email guard: a deployment that *believes* it
 * has something it does not. Uploads that go to a disk Vercel destroys look
 * exactly like uploads that worked, right up until a student opens the case and
 * the photographs are gone.
 */

const VARS = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const

const original = Object.fromEntries(VARS.map((name) => [name, process.env[name]]))

function setAll(): void {
  process.env.R2_ACCOUNT_ID = 'acc'
  process.env.R2_BUCKET = 'snoon-uploads'
  process.env.R2_ACCESS_KEY_ID = 'key'
  process.env.R2_SECRET_ACCESS_KEY = 'secret'
}

afterEach(() => {
  for (const name of VARS) {
    const value = original[name]
    if (value === undefined) delete process.env[name]
    else process.env[name] = value
  }
})

describe('storage configuration', () => {
  it('is unconfigured when nothing is set, which is a normal state', () => {
    for (const name of VARS) delete process.env[name]

    expect(getStorageConfig()).toBeNull()
    expect(isStorageConfigured()).toBe(false)
  })

  it('reads all four together', () => {
    setAll()

    expect(getStorageConfig()).toEqual({
      accountId: 'acc',
      bucket: 'snoon-uploads',
      accessKeyId: 'key',
      secretAccessKey: 'secret',
    })
  })

  /**
   * The one that matters. Half a configuration must mean "no object storage",
   * never "object storage with a blank bucket name" — a partially-filled set of
   * variables is the likeliest way this gets deployed wrong, and the cost is a
   * patient's photographs.
   */
  it.each(VARS)('refuses the whole configuration when %s alone is missing', (missing) => {
    setAll()
    delete process.env[missing]

    expect(getStorageConfig()).toBeNull()
  })

  it.each(VARS)('treats an empty %s the same as a missing one', (blank) => {
    setAll()
    process.env[blank] = ''

    expect(getStorageConfig()).toBeNull()
  })

  it('builds the account-level R2 endpoint', () => {
    setAll()
    const config = getStorageConfig()
    expect(config).not.toBeNull()

    // Per account, not per bucket: the bucket is addressed as a path segment,
    // which is why the adapter is configured with forcePathStyle.
    expect(r2Endpoint(config!)).toBe('https://acc.r2.cloudflarestorage.com')
    expect(r2Endpoint(config!)).not.toContain('snoon-uploads')
  })
})

describe('upload prefixes', () => {
  /**
   * With no prefix the S3 adapter stores a file under its bare filename, so both
   * collections would share the bucket root and a student's identity document
   * could overwrite an intraoral photograph, or be served in its place.
   */
  it('gives every collection its own prefix', () => {
    const prefixes = Object.values(UPLOAD_PREFIX)
    expect(prefixes.length).toBeGreaterThan(1)
    expect(new Set(prefixes).size).toBe(prefixes.length)
    for (const prefix of prefixes) expect(prefix).not.toBe('')
  })

  /**
   * The prefix names the bucket key *and* the local directory, so it has to
   * match each collection's `staticDir` or a deployment without R2 reads from
   * somewhere Payload never wrote.
   */
  it.each(Object.entries(UPLOAD_PREFIX))(
    'matches the staticDir the %s collection writes to',
    (collection, prefix) => {
      const source = readFileSync(
        join(process.cwd(), 'src/payload/collections', `${collection}.ts`),
        'utf8',
      )
      expect(source).toContain(`staticDir: 'uploads/${prefix}'`)
    },
  )
})
