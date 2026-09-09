import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."settings" ADD COLUMN "wrong_number_block_days" numeric DEFAULT 30 NOT NULL;
  ALTER TABLE "payload"."settings" ADD COLUMN "max_open_cases_per_phone" numeric DEFAULT 3 NOT NULL;
  ALTER TABLE "payload"."settings" ADD COLUMN "max_cases_per_phone_per_day" numeric DEFAULT 5 NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."settings" DROP COLUMN "wrong_number_block_days";
  ALTER TABLE "payload"."settings" DROP COLUMN "max_open_cases_per_phone";
  ALTER TABLE "payload"."settings" DROP COLUMN "max_cases_per_phone_per_day";`)
}
