CREATE TABLE "snoon"."phone_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"phone" text NOT NULL,
	"reason" text NOT NULL,
	"case_id" uuid,
	"blocked_until" timestamp with time zone NOT NULL,
	"lifted_at" timestamp with time zone,
	"lifted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."phone_blocks" ADD CONSTRAINT "phone_blocks_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "phone_blocks_phone_until_idx" ON "snoon"."phone_blocks" USING btree ("phone","blocked_until");