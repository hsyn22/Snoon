import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_url" varchar;
  ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_width" numeric;
  ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_height" numeric;
  ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_mime_type" varchar;
  ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_filesize" numeric;
  ALTER TABLE "payload"."case_photos" ADD COLUMN "sizes_thumb_filename" varchar;
  CREATE INDEX "case_photos_sizes_thumb_sizes_thumb_filename_idx" ON "payload"."case_photos" USING btree ("sizes_thumb_filename");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "payload"."case_photos_sizes_thumb_sizes_thumb_filename_idx";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_url";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_width";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_height";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_mime_type";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_filesize";
  ALTER TABLE "payload"."case_photos" DROP COLUMN "sizes_thumb_filename";`)
}
