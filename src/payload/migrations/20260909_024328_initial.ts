import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  // Payload does not create its own schema, and every statement below is
  // qualified with "payload". Without this a fresh database fails the whole
  // migration on the first CREATE TABLE. Added by hand; keep it at the top if
  // this migration is ever regenerated.
  await db.execute(sql`CREATE SCHEMA IF NOT EXISTS "payload";`)

  await db.execute(sql`
   CREATE TABLE "payload"."admins_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "payload"."admins" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"full_name" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "payload"."cities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."universities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"city_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."colleges" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"university_id" integer NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."stages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 1 NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."treatment_types" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name_ar" varchar NOT NULL,
  	"slug" varchar NOT NULL,
  	"order" numeric DEFAULT 1 NOT NULL,
  	"active" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."stage_capabilities" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"college_id" integer NOT NULL,
  	"stage_id" integer NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."stage_capabilities_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"treatment_types_id" integer
  );
  
  CREATE TABLE "payload"."payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer,
  	"cities_id" integer,
  	"universities_id" integer,
  	"colleges_id" integer,
  	"stages_id" integer,
  	"treatment_types_id" integer,
  	"stage_capabilities_id" integer
  );
  
  CREATE TABLE "payload"."payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload"."payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"admins_id" integer
  );
  
  CREATE TABLE "payload"."payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "payload"."admins_sessions" ADD CONSTRAINT "admins_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "payload"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."universities" ADD CONSTRAINT "universities_city_id_cities_id_fk" FOREIGN KEY ("city_id") REFERENCES "payload"."cities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."colleges" ADD CONSTRAINT "colleges_university_id_universities_id_fk" FOREIGN KEY ("university_id") REFERENCES "payload"."universities"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stage_capabilities" ADD CONSTRAINT "stage_capabilities_college_id_colleges_id_fk" FOREIGN KEY ("college_id") REFERENCES "payload"."colleges"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stage_capabilities" ADD CONSTRAINT "stage_capabilities_stage_id_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "payload"."stages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload"."stage_capabilities_rels" ADD CONSTRAINT "stage_capabilities_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."stage_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."stage_capabilities_rels" ADD CONSTRAINT "stage_capabilities_rels_treatment_types_fk" FOREIGN KEY ("treatment_types_id") REFERENCES "payload"."treatment_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "payload"."admins"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_cities_fk" FOREIGN KEY ("cities_id") REFERENCES "payload"."cities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_universities_fk" FOREIGN KEY ("universities_id") REFERENCES "payload"."universities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_colleges_fk" FOREIGN KEY ("colleges_id") REFERENCES "payload"."colleges"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stages_fk" FOREIGN KEY ("stages_id") REFERENCES "payload"."stages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_treatment_types_fk" FOREIGN KEY ("treatment_types_id") REFERENCES "payload"."treatment_types"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stage_capabilities_fk" FOREIGN KEY ("stage_capabilities_id") REFERENCES "payload"."stage_capabilities"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "payload"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload"."payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_admins_fk" FOREIGN KEY ("admins_id") REFERENCES "payload"."admins"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "admins_sessions_order_idx" ON "payload"."admins_sessions" USING btree ("_order");
  CREATE INDEX "admins_sessions_parent_id_idx" ON "payload"."admins_sessions" USING btree ("_parent_id");
  CREATE INDEX "admins_updated_at_idx" ON "payload"."admins" USING btree ("updated_at");
  CREATE INDEX "admins_created_at_idx" ON "payload"."admins" USING btree ("created_at");
  CREATE UNIQUE INDEX "admins_email_idx" ON "payload"."admins" USING btree ("email");
  CREATE UNIQUE INDEX "cities_slug_idx" ON "payload"."cities" USING btree ("slug");
  CREATE INDEX "cities_updated_at_idx" ON "payload"."cities" USING btree ("updated_at");
  CREATE INDEX "cities_created_at_idx" ON "payload"."cities" USING btree ("created_at");
  CREATE UNIQUE INDEX "universities_slug_idx" ON "payload"."universities" USING btree ("slug");
  CREATE INDEX "universities_city_idx" ON "payload"."universities" USING btree ("city_id");
  CREATE INDEX "universities_updated_at_idx" ON "payload"."universities" USING btree ("updated_at");
  CREATE INDEX "universities_created_at_idx" ON "payload"."universities" USING btree ("created_at");
  CREATE UNIQUE INDEX "colleges_slug_idx" ON "payload"."colleges" USING btree ("slug");
  CREATE INDEX "colleges_university_idx" ON "payload"."colleges" USING btree ("university_id");
  CREATE INDEX "colleges_updated_at_idx" ON "payload"."colleges" USING btree ("updated_at");
  CREATE INDEX "colleges_created_at_idx" ON "payload"."colleges" USING btree ("created_at");
  CREATE UNIQUE INDEX "stages_slug_idx" ON "payload"."stages" USING btree ("slug");
  CREATE INDEX "stages_updated_at_idx" ON "payload"."stages" USING btree ("updated_at");
  CREATE INDEX "stages_created_at_idx" ON "payload"."stages" USING btree ("created_at");
  CREATE UNIQUE INDEX "treatment_types_slug_idx" ON "payload"."treatment_types" USING btree ("slug");
  CREATE INDEX "treatment_types_updated_at_idx" ON "payload"."treatment_types" USING btree ("updated_at");
  CREATE INDEX "treatment_types_created_at_idx" ON "payload"."treatment_types" USING btree ("created_at");
  CREATE INDEX "stage_capabilities_college_idx" ON "payload"."stage_capabilities" USING btree ("college_id");
  CREATE INDEX "stage_capabilities_stage_idx" ON "payload"."stage_capabilities" USING btree ("stage_id");
  CREATE INDEX "stage_capabilities_updated_at_idx" ON "payload"."stage_capabilities" USING btree ("updated_at");
  CREATE INDEX "stage_capabilities_created_at_idx" ON "payload"."stage_capabilities" USING btree ("created_at");
  CREATE INDEX "stage_capabilities_rels_order_idx" ON "payload"."stage_capabilities_rels" USING btree ("order");
  CREATE INDEX "stage_capabilities_rels_parent_idx" ON "payload"."stage_capabilities_rels" USING btree ("parent_id");
  CREATE INDEX "stage_capabilities_rels_path_idx" ON "payload"."stage_capabilities_rels" USING btree ("path");
  CREATE INDEX "stage_capabilities_rels_treatment_types_id_idx" ON "payload"."stage_capabilities_rels" USING btree ("treatment_types_id");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload"."payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload"."payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload"."payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload"."payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload"."payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload"."payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload"."payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_admins_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("admins_id");
  CREATE INDEX "payload_locked_documents_rels_cities_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("cities_id");
  CREATE INDEX "payload_locked_documents_rels_universities_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("universities_id");
  CREATE INDEX "payload_locked_documents_rels_colleges_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("colleges_id");
  CREATE INDEX "payload_locked_documents_rels_stages_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stages_id");
  CREATE INDEX "payload_locked_documents_rels_treatment_types_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("treatment_types_id");
  CREATE INDEX "payload_locked_documents_rels_stage_capabilities_id_idx" ON "payload"."payload_locked_documents_rels" USING btree ("stage_capabilities_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload"."payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload"."payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload"."payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload"."payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload"."payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload"."payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_admins_id_idx" ON "payload"."payload_preferences_rels" USING btree ("admins_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload"."payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload"."payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "payload"."admins_sessions" CASCADE;
  DROP TABLE "payload"."admins" CASCADE;
  DROP TABLE "payload"."cities" CASCADE;
  DROP TABLE "payload"."universities" CASCADE;
  DROP TABLE "payload"."colleges" CASCADE;
  DROP TABLE "payload"."stages" CASCADE;
  DROP TABLE "payload"."treatment_types" CASCADE;
  DROP TABLE "payload"."stage_capabilities" CASCADE;
  DROP TABLE "payload"."stage_capabilities_rels" CASCADE;
  DROP TABLE "payload"."payload_kv" CASCADE;
  DROP TABLE "payload"."payload_locked_documents" CASCADE;
  DROP TABLE "payload"."payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload"."payload_preferences" CASCADE;
  DROP TABLE "payload"."payload_preferences_rels" CASCADE;
  DROP TABLE "payload"."payload_migrations" CASCADE;`)
}
