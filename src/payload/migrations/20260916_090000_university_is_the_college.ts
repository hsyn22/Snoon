import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The college collection goes, and stage capabilities re-key to the university.
 *
 * Haider's correction: every Iraqi university has exactly one dental college, so
 * a college carried no information the university did not — and the "clinics"
 * inside it (operative, surgery, prosthetics) are departments every student
 * rotates through rather than somewhere anybody belongs. Asking a student to
 * pick one was asking a question with no answer, and the empty list is what
 * blocked the first real sign-up.
 *
 * **Written by hand rather than generated.** `payload migrate:create` prompts
 * before a destructive change and needs a TTY, which a non-interactive shell
 * does not have. The generated file would say exactly this.
 *
 * The existing capability rows are dropped rather than mapped across. There are
 * none in production — the mechanism has always been "leave it empty unless a
 * place genuinely differs" — and inventing a university for a row whose college
 * is about to stop existing would be guessing at data nobody entered.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    DELETE FROM "payload"."stage_capabilities_rels";
    DELETE FROM "payload"."stage_capabilities";

    ALTER TABLE "payload"."stage_capabilities"
      DROP CONSTRAINT IF EXISTS "stage_capabilities_college_id_colleges_id_fk";
    DROP INDEX IF EXISTS "payload"."stage_capabilities_college_idx";
    ALTER TABLE "payload"."stage_capabilities" RENAME COLUMN "college_id" TO "university_id";
    ALTER TABLE "payload"."stage_capabilities"
      ADD CONSTRAINT "stage_capabilities_university_id_universities_id_fk"
      FOREIGN KEY ("university_id") REFERENCES "payload"."universities"("id") ON DELETE SET NULL;
    CREATE INDEX "stage_capabilities_university_idx"
      ON "payload"."stage_capabilities" USING btree ("university_id");

    ALTER TABLE "payload"."payload_locked_documents_rels" DROP COLUMN IF EXISTS "colleges_id";
    DROP TABLE IF EXISTS "payload"."colleges" CASCADE;
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "payload"."colleges" (
      "id" serial PRIMARY KEY NOT NULL,
      "name_ar" varchar NOT NULL,
      "slug" varchar NOT NULL,
      "university_id" integer NOT NULL,
      "active" boolean DEFAULT true,
      "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
      "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
    );

    DELETE FROM "payload"."stage_capabilities_rels";
    DELETE FROM "payload"."stage_capabilities";

    ALTER TABLE "payload"."stage_capabilities"
      DROP CONSTRAINT IF EXISTS "stage_capabilities_university_id_universities_id_fk";
    DROP INDEX IF EXISTS "payload"."stage_capabilities_university_idx";
    ALTER TABLE "payload"."stage_capabilities" RENAME COLUMN "university_id" TO "college_id";
    ALTER TABLE "payload"."stage_capabilities"
      ADD CONSTRAINT "stage_capabilities_college_id_colleges_id_fk"
      FOREIGN KEY ("college_id") REFERENCES "payload"."colleges"("id") ON DELETE SET NULL;
    CREATE INDEX "stage_capabilities_college_idx"
      ON "payload"."stage_capabilities" USING btree ("college_id");

    ALTER TABLE "payload"."payload_locked_documents_rels" ADD COLUMN IF NOT EXISTS "colleges_id" integer;
  `)
}
