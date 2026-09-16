import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * A photograph that will not store must not lose the case.
 *
 * The submission action used to wrap the case write, the photographs and the
 * student alert in one `try`. So when object storage refused a photograph — a
 * wrong credential, a bucket that is not there — the patient was shown
 * "submission failed" for a case that had **already been written**. Reading the
 * screen correctly, they submitted again. Haider ended up with a queue of
 * duplicates carrying no photographs, which is precisely what that shape
 * produces: every attempt leaves a case behind and reports a failure.
 *
 * A case with no photographs is a smaller case. A case submitted three times is
 * three calls to the same patient and three entries in a student's queue.
 *
 * The photograph upload is deliberately driven here by making Payload's
 * `create` throw, because that is the real failure: everything before it
 * succeeds, and the damage is entirely in what happens afterwards.
 */

const hasDatabase = Boolean(process.env.DATABASE_URL)

/** Stands in for Next's redirect, which signals by throwing. */
class RedirectSignal extends Error {
  constructor(readonly to: string) {
    super('NEXT_REDIRECT')
  }
}

const redirected: string[] = []

vi.mock('next/navigation', () => ({
  redirect: (to: string) => {
    redirected.push(to)
    throw new RedirectSignal(to)
  },
}))

vi.mock('next/headers', () => ({
  headers: async () => new Headers({ 'x-forwarded-for': '203.0.113.9' }),
}))

/**
 * Storage is down — and **only** storage.
 *
 * Narrowed to `create` on `case-photos` rather than stubbing Payload wholesale,
 * because validation reads the city and treatment lists through the same client.
 * A blanket stub would fail the submission for the wrong reason and the test
 * would pass against code that is still broken.
 */
vi.mock('payload', async (importOriginal) => {
  const actual = await importOriginal<typeof import('payload')>()
  return {
    ...actual,
    getPayload: async (args: Parameters<typeof actual.getPayload>[0]) => {
      const real = await actual.getPayload(args)
      return new Proxy(real, {
        get(target, prop, receiver) {
          if (prop === 'create') {
            return async (options: { collection: string }) => {
              if (options.collection === 'case-photos') {
                throw new Error('The specified bucket does not exist')
              }
              return (target.create as (o: unknown) => unknown)(options)
            }
          }
          const value = Reflect.get(target, prop, receiver)
          return typeof value === 'function' ? value.bind(target) : value
        },
      })
    },
  }
})

describe.skipIf(!hasDatabase)('submitting a case when photographs cannot be stored', async () => {
  if (!hasDatabase) return

  const { eq } = await import('drizzle-orm')
  const { db } = await import('@/db')
  const { cases } = await import('@/db/schema')
  const { submitCaseAction } = await import('@/app/(frontend)/case/new/actions')
  const { normalisePhone } = await import('@/lib/phone')

  // A number of its own, so the per-number open-case cap cannot interfere and
  // the count below means what it says.
  const phone = '0770' + String(Math.floor(Math.random() * 1e7)).padStart(7, '0')
  const stored = normalisePhone(phone)

  function form(): FormData {
    const data = new FormData()
    data.set('cityId', 'basra')
    data.append('treatmentTypeIds', 'filling')
    data.append('availabilityDays', 'sun')
    data.set('patientName', 'اختبار الصور')
    data.set('patientPhone', phone)
    data.append(
      'photos',
      // A real 1x1 PNG: it has to survive sharp before it can reach storage.
      new File(
        [
          Buffer.from(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
            'base64',
          ),
        ],
        'tooth.png',
        { type: 'image/png' },
      ),
    )
    return data
  }

  beforeEach(() => {
    redirected.length = 0
  })

  afterAll(async () => {
    if (stored) await db.delete(cases).where(eq(cases.patientPhone, stored))
  })

  it('still sends the patient to their tracking link', async () => {
    const result = await submitCaseAction({}, form()).catch((error) => error)

    // A returned state means the patient was told it failed. The only correct
    // outcome here is the redirect.
    expect(result).toBeInstanceOf(RedirectSignal)
    expect(redirected[0]).toMatch(/^\/case\/track\/.+\?new=1$/)
  })

  it('writes exactly one case, not one per attempt', async () => {
    expect(stored).not.toBeNull()
    if (!stored) return

    const rows = await db
      .select({ id: cases.id })
      .from(cases)
      .where(eq(cases.patientPhone, stored))

    // One from the submission above. Under the old code that submission
    // reported failure, so a patient would have produced a second row here.
    expect(rows).toHaveLength(1)
  })
})
