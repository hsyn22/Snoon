import { config as loadEnv } from 'dotenv'
import { defineConfig } from 'drizzle-kit'

// Local development keeps credentials in .env.local; deployments set the real
// environment directly, so a missing file here is not an error.
loadEnv({ path: '.env.local', quiet: true })

export default defineConfig({
  schema: ['./src/db/schema.ts', './src/db/auth-schema.ts'],
  out: './drizzle',
  dialect: 'postgresql',
  // Drizzle owns `snoon` (cases, claims) and `auth` (Better Auth's tables).
  // Payload manages its own schema and must not appear in these migrations.
  schemaFilter: ['snoon', 'auth'],
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
  verbose: true,
})
