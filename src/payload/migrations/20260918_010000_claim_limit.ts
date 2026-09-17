import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * How many cases one student may hold at once, as a setting.
 *
 * It was a constant of one, and it was not even that: nothing enforced it. The
 * student page simply rendered the held case *instead of* the queue, so a
 * student who claimed one watched every other case disappear — which is what
 * Haider hit on the first day, and what a student would read as سنون being
 * broken or empty rather than as a rule.
 *
 * The rule now lives in `claimCaseForStudent`, which the site and the Telegram
 * bot both go through, and the number lives here so it can be changed without a
 * deployment. Which number is right depends on something nobody knows yet —
 * whether cases outnumber students — so it had no business being a constant.
 *
 * Existing rows take 1, which is exactly what the code did before.
 *
 * Written by hand: `payload migrate:create` needs a TTY.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."settings"
      ADD COLUMN IF NOT EXISTS "max_active_claims_per_student" numeric DEFAULT 1 NOT NULL;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."settings" DROP COLUMN IF EXISTS "max_active_claims_per_student";
  `)
}
