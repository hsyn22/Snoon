import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."student_documents" (
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
  
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN "student_documents_id" integer;
  CREATE INDEX "student_documents_updated_at_idx" ON "payload"."student_documents" USING btree ("updated_at");
  CREATE INDEX "student_documents_created_at_idx" ON "payload"."student_documents" USING btree ("created_at");
  CREATE UNIQUE INDEX "student_documents_filename_idx" ON "payload"."student_documents" USING btree ("filename");
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_student_documents_fk" FOREIGN KEY ("student_documents_id") REFERENCES "payload"."student_documents"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_student_documents_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("student_documents_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "payload"."student_documents" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "payload"."student_documents" CASCADE;
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_student_documents_fk";
  
  DROP INDEX "payload"."payload_locked_documents_rels_student_documents_id_idx";
  ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN "student_documents_id";`)
}
