ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS principal_investigator text NOT NULL DEFAULT '张慈',
  ADD COLUMN IF NOT EXISTS target_enrollment integer NOT NULL DEFAULT 12;

ALTER TABLE projects ALTER COLUMN principal_investigator DROP DEFAULT;
ALTER TABLE projects ALTER COLUMN target_enrollment DROP DEFAULT;
