CREATE TABLE "snoon"."case_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"media_id" text NOT NULL,
	"deleted_at" timestamp with time zone,
	"deleted_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "snoon"."case_photos" ADD CONSTRAINT "case_photos_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "snoon"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "case_photos_case_idx" ON "snoon"."case_photos" USING btree ("case_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "case_photos_media_key" ON "snoon"."case_photos" USING btree ("media_id");