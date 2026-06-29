CREATE TABLE IF NOT EXISTS crf_schemas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  code text NOT NULL,
  name text NOT NULL,
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  schema jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  UNIQUE (project_id, code, version)
);

CREATE INDEX IF NOT EXISTS crf_schemas_schema_gin_idx
  ON crf_schemas USING gin (schema jsonb_path_ops);

CREATE TABLE IF NOT EXISTS crf_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id text NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  visit_code text NOT NULL REFERENCES visits(code),
  schema_id uuid NOT NULL REFERENCES crf_schemas(id) ON DELETE RESTRICT,
  schema_version integer NOT NULL CHECK (schema_version > 0),
  values jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL CHECK (status IN ('draft', 'submitted', 'locked')) DEFAULT 'draft',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, visit_code, schema_id)
);

CREATE INDEX IF NOT EXISTS crf_records_values_gin_idx
  ON crf_records USING gin (values jsonb_path_ops);

CREATE INDEX IF NOT EXISTS crf_records_project_schema_idx
  ON crf_records (project_id, schema_id, visit_code);

CREATE INDEX IF NOT EXISTS crf_records_subject_idx
  ON crf_records (subject_id);

WITH inserted_schema AS (
  INSERT INTO crf_schemas (project_id, code, name, version, status, schema, published_at)
  VALUES (
    'ON101',
    'baseline',
    '基线信息表',
    1,
    'published',
    $json$
    {
      "schemaVersion": "1.0",
      "id": "baseline-v1",
      "projectId": "ON101",
      "code": "baseline",
      "name": "基线信息表",
      "version": 1,
      "status": "published",
      "nodes": [
        {
          "kind": "section",
          "id": "section-basic",
          "title": "基本信息",
          "children": [
            {
              "kind": "field",
              "id": "field-initials",
              "key": "initials",
              "label": "姓名缩写",
              "type": "text",
              "required": true,
              "validation": { "maxLength": 12 },
              "table": { "width": 140, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-gender",
              "key": "gender",
              "label": "性别",
              "type": "single_select",
              "required": true,
              "options": [
                { "label": "男", "value": "male", "color": "blue" },
                { "label": "女", "value": "female", "color": "pink" }
              ],
              "table": { "width": 120, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-birth-date",
              "key": "birthDate",
              "label": "出生日期",
              "type": "date",
              "required": false,
              "table": { "width": 150, "sortable": true, "filterable": true, "editable": true }
            }
          ]
        },
        {
          "kind": "section",
          "id": "section-vitals",
          "title": "生命体征",
          "children": [
            {
              "kind": "field",
              "id": "field-height",
              "key": "height",
              "label": "身高",
              "type": "decimal",
              "unit": "cm",
              "validation": { "min": 80, "max": 240, "precision": 1 },
              "table": { "width": 120, "sortable": true, "filterable": true, "editable": true, "align": "right" }
            },
            {
              "kind": "field",
              "id": "field-weight",
              "key": "weight",
              "label": "体重",
              "type": "decimal",
              "unit": "kg",
              "validation": { "min": 20, "max": 250, "precision": 1 },
              "table": { "width": 120, "sortable": true, "filterable": true, "editable": true, "align": "right" }
            },
            {
              "kind": "field",
              "id": "field-enrolled",
              "key": "enrolled",
              "label": "是否入组",
              "type": "boolean",
              "required": true,
              "defaultValue": true,
              "table": { "width": 130, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-note",
              "key": "note",
              "label": "备注",
              "type": "long_text",
              "table": { "width": 240, "sortable": false, "filterable": true, "editable": true }
            }
          ]
        }
      ]
    }
    $json$::jsonb,
    now()
  )
  ON CONFLICT (project_id, code, version) DO UPDATE SET
    name = EXCLUDED.name,
    status = EXCLUDED.status,
    schema = EXCLUDED.schema,
    published_at = EXCLUDED.published_at
  RETURNING id, version
)
INSERT INTO crf_records (project_id, subject_id, visit_code, schema_id, schema_version, values, status)
SELECT
  'ON101',
  s.id,
  'V1',
  inserted_schema.id,
  inserted_schema.version,
  seed.values::jsonb,
  'draft'
FROM inserted_schema
CROSS JOIN (VALUES
  ('P001', '{"initials":"SL","gender":"male","birthDate":"1978-03-21","height":172.5,"weight":68.4,"enrolled":true,"note":"基线资料完整"}'),
  ('P002', '{"initials":"ZSL","gender":"female","birthDate":"1982-07-09","height":164.0,"weight":55.2,"enrolled":true,"note":"需复核既往史"}'),
  ('P003', '{"initials":"ZSL","gender":"male","birthDate":"1969-11-16","height":176.0,"weight":73.8,"enrolled":false,"note":"筛选阶段"}')
) AS seed(screening_no, values)
JOIN subjects s ON s.screening_no = seed.screening_no
ON CONFLICT (subject_id, visit_code, schema_id) DO UPDATE SET
  values = EXCLUDED.values,
  status = EXCLUDED.status,
  updated_at = now();
