import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."case_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"note" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "case_photos_id" integer;
  CREATE INDEX "case_photos_updated_at_idx" ON "payload"."case_photos" USING btree ("updated_at");
  CREATE INDEX "case_photos_created_at_idx" ON "payload"."case_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "case_photos_filename_idx" ON "payload"."case_photos" USING btree ("filename");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_case_photos_fk" FOREIGN KEY ("case_photos_id") REFERENCES "payload"."case_photos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_case_photos_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("case_photos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."case_photos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."case_photos" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_case_photos_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_case_photos_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "case_photos_id";`)
}
