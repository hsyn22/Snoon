import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

/**
 * The `prefix` column the storage plugin adds, and every upload it killed.
 *
 * `s3Storage` stores each file under a prefix — `case-photos/…`,
 * `student-documents/…` — and keeps that prefix on the row, so it needs a
 * column for it. By default it adds that column **only while the plugin is
 * enabled**, and the plugin is enabled only where the four `R2_*` variables
 * are set. So the shape of the database depended on the environment.
 *
 * The consequence was total and silent. Migrations are generated on a
 * development machine, which has no R2, so none of them ever wrote `prefix`.
 * Production had the variables, loaded the adapter, and asked for a column that
 * was not there — `column "prefix" does not exist` — on every read and every
 * write of both collections. A student could not upload an enrolment document
 * and a patient's photographs could not be stored, while `pnpm payload:migrate`
 * reported nothing to do and the build went green.
 *
 * This is the same fault as the blank admin, in a second place: **a committed,
 * generated artefact whose contents depend on environment variables is correct
 * on one machine and wrong on another.** The root fix is in
 * `src/payload/storage.ts` — `alwaysInsertFields: true`, which Payload provides
 * for exactly this and makes the default in v4 — and this migration is the
 * column that fix now expects on every machine.
 *
 * **Written by hand rather than generated.** `payload migrate:create` needs a
 * TTY, which a non-interactive shell does not have. The statements below are
 * not guesswork: they were taken from what Payload's own `push` produced
 * against a database at this exact revision, with R2 configured and without —
 * the two are identical, which is the whole point of the fix.
 *
 * Existing rows take the default, which is the correct value for them — their
 * files were written under that same name on the local disk, so nothing ends up
 * pointing at a path that was never used.
 */
export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."case_photos"
      ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT 'case-photos';
    ALTER TABLE "payload"."student_documents"
      ADD COLUMN IF NOT EXISTS "prefix" varchar DEFAULT 'student-documents';
  `)
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
    ALTER TABLE "payload"."case_photos" DROP COLUMN IF EXISTS "prefix";
    ALTER TABLE "payload"."student_documents" DROP COLUMN IF EXISTS "prefix";
  `)
}
