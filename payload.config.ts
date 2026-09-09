import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { ar } from '@payloadcms/translations/languages/ar'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { buildConfig } from 'payload'
import sharp from 'sharp'
import { Admins } from '@/payload/collections/admins'
import {
  Cities,
  Colleges,
  Stages,
  StageCapabilities,
  TreatmentTypes,
  Universities,
} from '@/payload/collections/config'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Payload owns configuration; Drizzle owns cases, claims and students; Better
 * Auth owns credentials. Three tools, three Postgres schemas, joined by stable
 * slugs rather than foreign keys — so a Payload migration can never rewrite a
 * patient's case, and retiring a city cannot cascade into one.
 */
export default buildConfig({
  admin: {
    user: Admins.slug,
    meta: { titleSuffix: ' — سنون' },
  },

  // The admin is used by سنون staff in Iraq, so it runs in Arabic. Payload sets
  // the admin's direction to RTL from this, which also stops its own field
  // descriptions rendering with the punctuation on the wrong end.
  i18n: {
    supportedLanguages: { ar },
    fallbackLanguage: 'ar',
  },

  collections: [Admins, Cities, Universities, Colleges, Stages, TreatmentTypes, StageCapabilities],

  editor: lexicalEditor(),

  db: postgresAdapter({
    pool: { connectionString: process.env.DATABASE_URL ?? '' },
    schemaName: 'payload',
    migrationDir: path.resolve(dirname, 'src/payload/migrations'),
  }),

  // Used for intraoral photographs later: rotate to bake orientation, re-encode
  // without metadata, so EXIF (including GPS) never survives an upload.
  sharp,

  secret: process.env.PAYLOAD_SECRET ?? '',

  typescript: { outputFile: path.resolve(dirname, 'src/payload/payload-types.ts') },
})
