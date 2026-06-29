CREATE EXTENSION IF NOT EXISTS "pgcrypto";
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"hospital" text NOT NULL,
	"status" text NOT NULL,
	"phone" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE "crf_project_visits" (
	"project_id" text NOT NULL,
	"visit_code" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crf_project_visits_project_id_visit_code_pk" PRIMARY KEY("project_id","visit_code"),
	CONSTRAINT "crf_project_visits_project_id_sort_order_unique" UNIQUE("project_id","sort_order")
);
--> statement-breakpoint
CREATE TABLE "crf_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"subject_id" uuid NOT NULL,
	"visit_code" text NOT NULL,
	"schema_id" uuid NOT NULL,
	"schema_version" integer NOT NULL,
	"values" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crf_records_subject_id_visit_code_schema_id_unique" UNIQUE("subject_id","visit_code","schema_id")
);
--> statement-breakpoint
CREATE TABLE "crf_schemas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" text NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"version" integer NOT NULL,
	"status" text NOT NULL,
	"schema" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "crf_schemas_project_id_code_version_unique" UNIQUE("project_id","code","version")
);
--> statement-breakpoint
CREATE TABLE "crf_visit_forms" (
	"project_id" text NOT NULL,
	"visit_code" text NOT NULL,
	"schema_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	"required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "crf_visit_forms_project_id_visit_code_schema_id_pk" PRIMARY KEY("project_id","visit_code","schema_id")
);
--> statement-breakpoint
CREATE TABLE "form_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject_id" uuid NOT NULL,
	"visit_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"value" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_entries_subject_id_visit_id_form_id_unique" UNIQUE("subject_id","visit_id","form_id")
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "forms_name_unique" UNIQUE("name"),
	CONSTRAINT "forms_sort_order_unique" UNIQUE("sort_order")
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"center" text NOT NULL,
	"status" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	"budget" integer NOT NULL,
	"progress" integer NOT NULL,
	"principal_investigator" text NOT NULL,
	"target_enrollment" integer NOT NULL,
	"department" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "projects_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"topic_no" text NOT NULL,
	"center" text NOT NULL,
	"screening_no" text NOT NULL,
	"random_no" text NOT NULL,
	"initials" text NOT NULL,
	"status" text NOT NULL,
	"gender" text NOT NULL,
	"informed_at" date NOT NULL,
	"enrolled_at" date NOT NULL,
	"current_visit" text NOT NULL,
	"next_visit" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "subjects_screening_no_unique" UNIQUE("screening_no")
);
--> statement-breakpoint
CREATE TABLE "visit_forms" (
	"visit_id" uuid NOT NULL,
	"form_id" uuid NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "visit_forms_visit_id_form_id_pk" PRIMARY KEY("visit_id","form_id")
);
--> statement-breakpoint
CREATE TABLE "visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"title" text NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "visits_code_unique" UNIQUE("code"),
	CONSTRAINT "visits_sort_order_unique" UNIQUE("sort_order")
);
--> statement-breakpoint
ALTER TABLE "crf_project_visits" ADD CONSTRAINT "crf_project_visits_project_id_projects_code_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_project_visits" ADD CONSTRAINT "crf_project_visits_visit_code_visits_code_fk" FOREIGN KEY ("visit_code") REFERENCES "public"."visits"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_records" ADD CONSTRAINT "crf_records_project_id_projects_code_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_records" ADD CONSTRAINT "crf_records_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_records" ADD CONSTRAINT "crf_records_visit_code_visits_code_fk" FOREIGN KEY ("visit_code") REFERENCES "public"."visits"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_records" ADD CONSTRAINT "crf_records_schema_id_crf_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."crf_schemas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_schemas" ADD CONSTRAINT "crf_schemas_project_id_projects_code_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_visit_forms" ADD CONSTRAINT "crf_visit_forms_schema_id_crf_schemas_id_fk" FOREIGN KEY ("schema_id") REFERENCES "public"."crf_schemas"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crf_visit_forms" ADD CONSTRAINT "crf_visit_forms_project_id_visit_code_crf_project_visits_project_id_visit_code_fk" FOREIGN KEY ("project_id","visit_code") REFERENCES "public"."crf_project_visits"("project_id","visit_code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_subject_id_subjects_id_fk" FOREIGN KEY ("subject_id") REFERENCES "public"."subjects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_entries" ADD CONSTRAINT "form_entries_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_forms" ADD CONSTRAINT "visit_forms_visit_id_visits_id_fk" FOREIGN KEY ("visit_id") REFERENCES "public"."visits"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "visit_forms" ADD CONSTRAINT "visit_forms_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;
