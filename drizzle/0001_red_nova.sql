ALTER TABLE "crf_project_visits" ADD COLUMN "sort_key" text;--> statement-breakpoint
UPDATE "crf_project_visits"
SET "sort_key" = 'U' || lpad("sort_order"::text, 6, '0')
WHERE "sort_key" IS NULL;--> statement-breakpoint
ALTER TABLE "crf_project_visits" ALTER COLUMN "sort_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "crf_project_visits_project_sort_key_idx"
  ON "crf_project_visits" ("project_id", "sort_key");--> statement-breakpoint
ALTER TABLE "crf_visit_forms" ADD COLUMN "sort_key" text;--> statement-breakpoint
UPDATE "crf_visit_forms"
SET "sort_key" = 'U' || lpad("sort_order"::text, 6, '0')
WHERE "sort_key" IS NULL;--> statement-breakpoint
ALTER TABLE "crf_visit_forms" ALTER COLUMN "sort_key" SET NOT NULL;--> statement-breakpoint
CREATE INDEX "crf_visit_forms_visit_sort_key_idx"
  ON "crf_visit_forms" ("project_id", "visit_code", "sort_key");
