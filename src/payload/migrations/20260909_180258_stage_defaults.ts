import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "payload"."stages_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"treatment_types_id" integer
  );
  
  ALTER TABLE "payload"."stages_rels" ADD CONSTRAINT "stages_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stages_rels" ADD CONSTRAINT "stages_rels_treatment_types_fk" FOREIGN KEY ("treatment_types_id") REFERENCES "payload"."treatment_types"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "stages_rels_order_idx" ON "payload"."stages_rels" USING btree ("order");
  CREATE INDEX "stages_rels_parent_idx" ON "payload"."stages_rels" USING btree ("parent_id");
  CREATE INDEX "stages_rels_path_idx" ON "payload"."stages_rels" USING btree ("path");
  CREATE INDEX "stages_rels_treatment_types_id_idx" ON "payload"."stages_rels" USING btree ("treatment_types_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."stages_rels" CASCADE;`)
}
