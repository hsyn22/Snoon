CREATE TABLE "snoon"."appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"claim_id" uuid NOT NULL,
	"scheduled_for" timestamp with time zone NOT NULL,
	"superseded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."appointments" ADD CONSTRAINT "appointments_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "snoon"."appointments" ADD CONSTRAINT "appointments_claim_id_claims_id_fk" FOREIGN KEY ("claim_id") REFERENCES "snoon"."claims"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_live_appointment_per_case" ON "snoon"."appointments" USING btree ("case_id") WHERE superseded_at is null;--> statement-breakpoint
CREATE INDEX "appointments_scheduled_idx" ON "snoon"."appointments" USING btree ("scheduled_for");