import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as authSchema from './auth-schema'
import * as caseSchema from './schema'

const schema = { ...caseSchema, ...authSchema }

/**
 * Next.js hot-reloads modules in development, which would open a new connection
 * pool on every edit until Postgres refuses them. Cache the client on
 * globalThis so reloads reuse one pool.
 */
const globalForDb = globalThis as unknown as { snoonSql?: postgres.Sql }

function connectionString(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    // The message must never echo the value — a malformed URL usually contains
    // the password.
    throw new Error('DATABASE_URL is not set. Copy .env.example to .env.local.')
  }
  return url
}

const client = globalForDb.snoonSql ?? postgres(connectionString(), { max: 10 })

if (process.env.NODE_ENV !== 'production') globalForDb.snoonSql = client

export const db = drizzle(client, { schema })
export { schema }
