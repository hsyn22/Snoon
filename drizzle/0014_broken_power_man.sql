CREATE TYPE "snoon"."review_author_type" AS ENUM('PATIENT', 'STUDENT');--> statement-breakpoint
CREATE TABLE "snoon"."reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"author_type" "snoon"."review_author_type" NOT NULL,
	"student_id" uuid,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."reviews" ADD CONSTRAINT "reviews_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snoon"."reviews" ADD CONSTRAINT "reviews_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "snoon"."students"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "reviews_one_per_side_per_case" ON "snoon"."reviews" USING btree ("case_id","author_type");--> statement-breakpoint
CREATE INDEX "reviews_created_idx" ON "snoon"."reviews" USING btree ("created_at");