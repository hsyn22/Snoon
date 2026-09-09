/**
 * Seed Payload's configuration before the suite runs.
 *
 * Validation now checks submitted values against the real city and treatment
 * lists, which live in Payload. Without this, a fresh database would fail those
 * tests for a reason that has nothing to do with the code — and the fix would be
 * an undocumented manual step. The seed is idempotent, so this is a no-op on a
 * database that already has it.
 */
export default async function setup() {
  if (!process.env.DATABASE_URL) return

  const { seed } = await import('../../src/payload/seed')
  await seed()
}
