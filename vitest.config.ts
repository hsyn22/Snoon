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
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
