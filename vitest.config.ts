import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Database-backed tests read DATABASE_URL from the same file local development
// uses. Tests that need it skip themselves when it is absent, so `pnpm test`
// still works on a machine with no Postgres.
loadEnv({ path: '.env.local', quiet: true })

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    environment: 'node',
    // The database tests share one Postgres schema, so they must not race.
    fileParallelism: false,
    // Payload's configuration must exist before validation tests check against it.
    globalSetup: ['./tests/setup/global.ts'],
    // Seeding Payload on a cold database takes a while the first time.
    hookTimeout: 120_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      // Configuration now comes from Payload, so anything importing @/lib/config
      // pulls the Payload config in too.
      '@payload-config': fileURLToPath(new URL('./payload.config.ts', import.meta.url)),
      // See the stub for why: the real package throws outside a server condition.
      'server-only': fileURLToPath(new URL('./tests/setup/server-only-stub.ts', import.meta.url)),
    },
  },
})
