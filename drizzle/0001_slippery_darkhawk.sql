CREATE TYPE "snoon"."claim_status" AS ENUM('ACTIVE', 'COMPLETED', 'RELEASED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "snoon"."verification_status" AS ENUM('PENDING', 'VERIFIED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TABLE "snoon"."claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"status" "snoon"."claim_status" DEFAULT 'ACTIVE' NOT NULL,
	"contact_deadline_at" timestamp with time zone NOT NULL,
	"released_at" timestamp with time zone,
	"release_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snoon"."students" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"auth_user_id" text NOT NULL,
	"full_name" text NOT NULL,
	"university_id" text NOT NULL,
	"college_id" text NOT NULL,
	"stage_id" text NOT NULL,
	"verification_status" "snoon"."verification_status" DEFAULT 'PENDING' NOT NULL,
	"verification_document_path" text,
	"verification_reviewed_by" text,
	"verification_reviewed_at" timestamp with time zone,
	"verification_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."claims" ADD CONSTRAINT "claims_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snoon"."claims" ADD CONSTRAINT "claims_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "snoon"."students"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_claim_per_case" ON "snoon"."claims" USING btree ("case_id") WHERE status = 'ACTIVE';--> statement-breakpoint
CREATE INDEX "claims_student_created_idx" ON "snoon"."claims" USING btree ("student_id","created_at");--> statement-breakpoint
CREATE INDEX "claims_status_deadline_idx" ON "snoon"."claims" USING btree ("status","contact_deadline_at");--> statement-breakpoint
CREATE UNIQUE INDEX "students_auth_user_id_key" ON "snoon"."students" USING btree ("auth_user_id");--> statement-breakpoint
CREATE INDEX "students_verification_college_idx" ON "snoon"."students" USING btree ("verification_status","college_id");