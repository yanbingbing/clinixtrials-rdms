CREATE TABLE IF NOT EXISTS crf_project_visits (
  project_id text NOT NULL REFERENCES projects(code) ON DELETE CASCADE,
  visit_code text NOT NULL REFERENCES visits(code),
  title text NOT NULL,
  sort_order integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, visit_code),
  UNIQUE (project_id, sort_order)
);

CREATE TABLE IF NOT EXISTS crf_visit_forms (
  project_id text NOT NULL,
  visit_code text NOT NULL,
  schema_id uuid NOT NULL REFERENCES crf_schemas(id) ON DELETE RESTRICT,
  sort_order integer NOT NULL,
  required boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, visit_code, schema_id),
  FOREIGN KEY (project_id, visit_code)
    REFERENCES crf_project_visits(project_id, visit_code)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS crf_visit_forms_schema_idx
  ON crf_visit_forms (schema_id);

WITH visit_schema AS (
  INSERT INTO crf_schemas (project_id, code, name, version, status, schema, published_at)
  VALUES (
    'ON101',
    'visit',
    'Visit 访视信息表',
    1,
    'published',
    $json$
    {
      "schemaVersion": "1.0",
      "id": "visit-v1",
      "projectId": "ON101",
      "code": "visit",
      "name": "Visit 访视信息表",
      "version": 1,
      "status": "published",
      "nodes": [
        {
          "kind": "section",
          "id": "section-visit",
          "title": "访视信息",
          "children": [
            {
              "kind": "field",
              "id": "field-visit-date",
              "key": "visitDate",
              "label": "访视日期",
              "type": "date",
              "required": true,
              "table": { "width": 150, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-visit-window",
              "key": "visitWindow",
              "label": "访视窗",
              "type": "single_select",
              "required": true,
              "options": [
                { "label": "窗内", "value": "in_window", "color": "green" },
                { "label": "超窗", "value": "out_window", "color": "orange" },
                { "label": "缺失", "value": "missing", "color": "red" }
              ],
              "table": { "width": 130, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-investigator",
              "key": "investigator",
              "label": "研究者",
              "type": "text",
              "required": true,
              "table": { "width": 150, "sortable": true, "filterable": true, "editable": true }
            },
            {
              "kind": "field",
              "id": "field-visit-note",
              "key": "visitNote",
              "label": "访视备注",
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
),
baseline_schema AS (
  SELECT id, version
  FROM crf_schemas
  WHERE project_id = 'ON101' AND code = 'baseline' AND version = 1
),
upsert_visits AS (
  INSERT INTO crf_project_visits (project_id, visit_code, title, sort_order)
  VALUES
    ('ON101', 'V0', '筛选访视', 0),
    ('ON101', 'V1', '基线访视', 1),
    ('ON101', 'V2', '第 2 次访视', 2)
  ON CONFLICT (project_id, visit_code) DO UPDATE SET
    title = EXCLUDED.title,
    sort_order = EXCLUDED.sort_order,
    updated_at = now()
  RETURNING project_id, visit_code
),
mapped AS (
  INSERT INTO crf_visit_forms (project_id, visit_code, schema_id, sort_order, required)
  SELECT 'ON101', visit_code, schema_id, sort_order, true
  FROM (
    SELECT 'V0' AS visit_code, visit_schema.id AS schema_id, 1 AS sort_order FROM visit_schema
    UNION ALL
    SELECT 'V0', baseline_schema.id, 2 FROM baseline_schema
    UNION ALL
    SELECT 'V1', visit_schema.id, 1 FROM visit_schema
    UNION ALL
    SELECT 'V1', baseline_schema.id, 2 FROM baseline_schema
    UNION ALL
    SELECT 'V2', visit_schema.id, 1 FROM visit_schema
  ) seed
  ON CONFLICT (project_id, visit_code, schema_id) DO UPDATE SET
    sort_order = EXCLUDED.sort_order,
    required = EXCLUDED.required,
    updated_at = now()
  RETURNING project_id, visit_code, schema_id
)
INSERT INTO crf_records (project_id, subject_id, visit_code, schema_id, schema_version, values, status)
SELECT
  'ON101',
  s.id,
  seed.visit_code,
  visit_schema.id,
  visit_schema.version,
  seed.values::jsonb,
  'draft'
FROM visit_schema
CROSS JOIN (VALUES
  ('P001', 'V0', '{"visitDate":"2026-02-12","visitWindow":"in_window","investigator":"石磊","visitNote":"筛选完成"}'),
  ('P001', 'V1', '{"visitDate":"2026-03-12","visitWindow":"in_window","investigator":"石磊","visitNote":"进入基线"}'),
  ('P002', 'V0', '{"visitDate":"2026-02-12","visitWindow":"in_window","investigator":"张敏","visitNote":"资料待补充"}'),
  ('P002', 'V1', '{"visitDate":"2026-03-15","visitWindow":"out_window","investigator":"张敏","visitNote":"延迟访视"}'),
  ('P003', 'V0', '{"visitDate":"2026-02-14","visitWindow":"in_window","investigator":"陈露","visitNote":"筛选阶段"}')
) AS seed(screening_no, visit_code, values)
JOIN subjects s ON s.screening_no = seed.screening_no
ON CONFLICT (subject_id, visit_code, schema_id) DO UPDATE SET
  values = EXCLUDED.values,
  status = EXCLUDED.status,
  updated_at = now();
