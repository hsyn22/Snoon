import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Local development keeps credentials in .env.local; deployments set the real
// environment directly, so a missing file here is not an error.
loadEnv({ path: '.env.local', quiet: true })

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Drizzle owns the `snoon` schema only. Payload manages its own and must not
  // appear in these migrations.
  schemaFilter: ['snoon'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
