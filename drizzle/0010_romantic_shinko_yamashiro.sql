CREATE TYPE "snoon"."day_request_status" AS ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'SUPERSEDED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "snoon"."day_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"student_id" uuid NOT NULL,
	"requested_day" text NOT NULL,
	"status" "snoon"."day_request_status" DEFAULT 'PENDING' NOT NULL,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."students" ADD COLUMN "clinic_days" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "snoon"."day_requests" ADD CONSTRAINT "day_requests_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snoon"."day_requests" ADD CONSTRAINT "day_requests_student_id_students_id_fk" FOREIGN KEY ("student_id") REFERENCES "snoon"."students"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_pending_day_request" ON "snoon"."day_requests" USING btree ("case_id","student_id","requested_day") WHERE status = 'PENDING';--> statement-breakpoint
CREATE INDEX "day_requests_case_day_idx" ON "snoon"."day_requests" USING btree ("case_id","requested_day","created_at");--> statement-breakpoint
CREATE INDEX "day_requests_student_idx" ON "snoon"."day_requests" USING btree ("student_id","created_at");