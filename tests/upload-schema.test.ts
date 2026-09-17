import { describe, expect, it } from 'vitest'

/**
 * The upload collections' schema, and the second time the environment decided
 * a committed artefact.
 *
 * `tests/admin-import-map.test.ts` holds the same property for the admin's
 * component list. This one holds it for the database, because the storage
 * plugin drifted in both places at once and only the first was caught:
 *
 * `s3Storage` keeps the object's prefix on the row, so it adds a `prefix`
 * field to every collection it manages — and by default it adds that field
 * **only while it is enabled**, which is only where the four `R2_*` variables
 * are set. Migrations are generated on a development machine, which has none.
 * So no migration ever wrote the column, production loaded the adapter, and
 * every read and every write of both collections died on
 * `column "prefix" does not exist`: no enrolment document could be uploaded and
 * no patient's photographs could be stored, while the build went green and
 * `payload:migrate` reported nothing to do.
 *
 * `alwaysInsertFields: true` is the fix and this is the line that holds it. If
 * it fails, the schema depends on the environment again and the next
 * deployment with credentials will refuse every upload.
 */

const R2_VARS = ['R2_ACCOUNT_ID', 'R2_BUCKET', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'] as const

/** The collections the storage plugin manages, and what it stores files under. */
const MANAGED = {
  'case-photos': 'case-photos',
  'student-documents': 'student-documents',
} as const

/**
 * Every field name on each managed collection, read out of a freshly built
 * config rather than from a list here — a new upload collection is covered
 * without anybody remembering this file exists.
 */
async function uploadFields(): Promise<Record<string, { names: string[]; prefix: unknown }>> {
  // The config is built at module scope, so reading it twice with different
  // environments needs the module cache reset.
  const { default: configPromise } = await import(
    /* @vite-ignore */ `${process.cwd()}/payload.config.ts?t=${Math.random()}`
  )
  const config = await configPromise

  const found: Record<string, { names: string[]; prefix: unknown }> = {}
  for (const collection of config.collections ?? []) {
    if (!(collection.slug in MANAGED)) continue
    const fields = (collection.fields ?? []) as { name?: string; defaultValue?: unknown }[]
    found[collection.slug] = {
      names: fields
        .map((field) => field.name)
        .filter((name): name is string => typeof name === 'string')
        .sort(),
      prefix: fields.find((field) => field.name === 'prefix')?.defaultValue,
    }
  }
  return found
}

function withR2<T>(present: boolean, run: () => Promise<T>): Promise<T> {
  const saved = R2_VARS.map((name) => [name, process.env[name]] as const)
  for (const name of R2_VARS) {
    if (present) process.env[name] = 'test-value'
    else delete process.env[name]
  }
  return run().finally(() => {
    for (const [name, value] of saved) {
      if (value === undefined) delete process.env[name]
      else process.env[name] = value
    }
  })
}

describe('the upload collections', () => {
  it('carry a prefix field with R2 configured', async () => {
    const fields = await withR2(true, uploadFields)
    for (const [slug, prefix] of Object.entries(MANAGED)) {
      expect(fields[slug]?.names, `${slug} is not managed by the storage plugin`).toContain('prefix')
      // Not merely present: pointing at the right place in the bucket, or a
      // student's document and an intraoral photograph share the root and can
      // overwrite one another.
      expect(fields[slug]?.prefix).toBe(prefix)
    }
  })

  /**
   * The root cause, stated as a property — the same one the import-map test
   * makes about admin components. If this fails, a migration generated on a
   * developer's machine no longer describes production's database.
   */
  it('have the same fields whether or not R2 is configured', async () => {
    const configured = await withR2(true, uploadFields)
    const unconfigured = await withR2(false, uploadFields)

    for (const slug of Object.keys(MANAGED)) {
      expect(unconfigured[slug]?.names, `${slug} changes shape with the environment`).toEqual(
        configured[slug]?.names,
      )
      expect(unconfigured[slug]?.prefix).toEqual(configured[slug]?.prefix)
    }
  })
})
