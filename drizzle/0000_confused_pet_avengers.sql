CREATE SCHEMA "snoon";
--> statement-breakpoint
CREATE TYPE "snoon"."actor_type" AS ENUM('PATIENT', 'STUDENT', 'ADMIN', 'SYSTEM');--> statement-breakpoint
CREATE TYPE "snoon"."case_status" AS ENUM('REQUESTED', 'MATCHED', 'CONTACTED', 'APPOINTMENT_CONFIRMED', 'COMPLETED', 'NO_CONTACT', 'RETURNED_TO_QUEUE', 'NO_SHOW', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "snoon"."case_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"from_status" "snoon"."case_status",
	"to_status" "snoon"."case_status" NOT NULL,
	"actor_type" "snoon"."actor_type" NOT NULL,
	"actor_id" text,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "snoon"."cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference_code" text NOT NULL,
	"status" "snoon"."case_status" DEFAULT 'REQUESTED' NOT NULL,
	"city_id" text NOT NULL,
	"treatment_type_ids" text[] NOT NULL,
	"availability_days" text[] NOT NULL,
	"patient_name" text NOT NULL,
	"patient_phone" text NOT NULL,
	"notes" text,
	"tracking_token_hash" text NOT NULL,
	"tracking_token_revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."case_events" ADD CONSTRAINT "case_events_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_events_case_id_created_idx" ON "snoon"."case_events" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_reference_code_key" ON "snoon"."cases" USING btree ("reference_code");--> statement-breakpoint
CREATE UNIQUE INDEX "cases_tracking_token_hash_key" ON "snoon"."cases" USING btree ("tracking_token_hash");--> statement-breakpoint
CREATE INDEX "cases_status_city_created_idx" ON "snoon"."cases" USING btree ("status","city_id","created_at");--> statement-breakpoint
CREATE INDEX "cases_treatment_type_ids_idx" ON "snoon"."cases" USING gin ("treatment_type_ids");