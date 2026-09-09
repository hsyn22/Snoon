CREATE TYPE "snoon"."telegram_subject_type" AS ENUM('PATIENT_CASE', 'STUDENT');--> statement-breakpoint
CREATE TABLE "snoon"."telegram_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_type" "snoon"."telegram_subject_type" NOT NULL,
	"subject_id" uuid NOT NULL,
	"invite_token_hash" text NOT NULL,
	"chat_id" text,
	"linked_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "telegram_links_invite_token_hash_key" ON "snoon"."telegram_links" USING btree ("invite_token_hash");--> statement-breakpoint
CREATE UNIQUE INDEX "one_active_telegram_link_per_subject" ON "snoon"."telegram_links" USING btree ("subject_type","subject_id") WHERE revoked_at is null;--> statement-breakpoint
CREATE INDEX "telegram_links_chat_idx" ON "snoon"."telegram_links" USING btree ("chat_id");