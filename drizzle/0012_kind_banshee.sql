DROP INDEX "snoon"."students_verification_college_idx";--> statement-breakpoint
CREATE INDEX "students_verification_university_idx" ON "snoon"."students" USING btree ("verification_status","university_id");--> statement-breakpoint
ALTER TABLE "snoon"."students" DROP COLUMN "college_id";