CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  center text NOT NULL,
  status text NOT NULL CHECK (status IN ('完成', '进行中', '立项', '结束')),
  start_date date NOT NULL,
  end_date date,
  budget integer NOT NULL CHECK (budget >= 0),
  progress integer NOT NULL CHECK (progress BETWEEN 0 AND 100),
  principal_investigator text NOT NULL,
  target_enrollment integer NOT NULL CHECK (target_enrollment >= 0),
  department text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_no text NOT NULL,
  center text NOT NULL,
  screening_no text NOT NULL UNIQUE,
  random_no text NOT NULL,
  initials text NOT NULL,
  status text NOT NULL CHECK (status IN ('筛选期', '治疗期', '筛选失败', '退出研究', '完成研究', '失访')),
  gender text NOT NULL CHECK (gender IN ('男', '女')),
  informed_at date NOT NULL,
  enrolled_at date NOT NULL,
  current_visit text NOT NULL,
  next_visit text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  hospital text NOT NULL,
  status text NOT NULL CHECK (status IN ('启用', '停用')),
  phone text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  sort_order integer NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  sort_order integer NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS visit_forms (
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  sort_order integer NOT NULL,
  PRIMARY KEY (visit_id, form_id)
);

CREATE TABLE IF NOT EXISTS form_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES forms(id) ON DELETE CASCADE,
  done boolean NOT NULL DEFAULT false,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject_id, visit_id, form_id)
);

INSERT INTO projects (code, name, center, status, start_date, end_date, budget, progress, principal_investigator, target_enrollment, department) VALUES
  ('ON101', '慢性创面治疗研究', '瑞金医院', '完成', '2026-01-21', '2026-01-26', 320000, 100, '张慈', 12, '血管外科'),
  ('ON102', '糖尿病足队列研究', '中山医院', '进行中', '2026-01-22', '2026-01-26', 450000, 67, '张慈', 12, '内分泌科'),
  ('ON103', '溃疡愈合观察研究', '瑞金医院', '完成', '2026-01-21', '2026-01-26', 570000, 100, '张慈', 12, '创面修复科'),
  ('ON104', '创面影像评估研究', '中西结合医院', '完成', '2026-01-21', '2026-01-26', 410000, 100, '张慈', 12, '影像科'),
  ('ON105', '安全性观察研究', '瑞金医院', '进行中', '2026-02-03', '2026-04-18', 190000, 38, '张慈', 12, '药学部'),
  ('ON106', '多中心随访研究', '中山医院', '进行中', '2026-02-10', '2026-05-20', 490000, 52, '张慈', 12, '血管外科'),
  ('ON107', '康复质量研究', '中西结合医院', '立项', '2026-03-01', '2026-06-01', 280000, 16, '张慈', 12, '康复医学科'),
  ('ON108', '长期预后研究', '瑞金医院', '进行中', '2026-03-12', '2026-08-30', 640000, 44, '张慈', 12, '血管外科')
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  center = EXCLUDED.center,
  status = EXCLUDED.status,
  start_date = EXCLUDED.start_date,
  end_date = EXCLUDED.end_date,
  budget = EXCLUDED.budget,
  progress = EXCLUDED.progress,
  principal_investigator = EXCLUDED.principal_investigator,
  target_enrollment = EXCLUDED.target_enrollment,
  department = EXCLUDED.department,
  updated_at = now();

INSERT INTO subjects (topic_no, center, screening_no, random_no, initials, status, gender, informed_at, enrolled_at, current_visit, next_visit) VALUES
  ('ON101CLCT01', '瑞金医院', 'P001', 'CP101', 'SL', '治疗期', '男', '2026-02-12', '2026-12-12', 'V2', 'V3'),
  ('ON101CLCT02', '中山医院', 'P002', 'CP102', 'ZSL', '退出研究', '女', '2026-02-12', '2026-12-12', 'V2', 'V3'),
  ('ON101CLCT03', '中西结合医院', 'P003', 'CP103', 'ZSL', '失访', '男', '2026-02-12', '2026-12-12', 'V3', 'V4'),
  ('ON101CLCT04', '瑞金医院', 'P004', 'CP104', 'SL', '完成研究', '男', '2026-02-12', '2026-12-12', 'V1', 'NA'),
  ('ON101CLCT05', '中山医院', 'P005', 'CP105', 'ASA', '筛选期', '女', '2026-02-12', '2026-12-12', 'V2', 'V3'),
  ('ON101CLCT06', '瑞金医院', 'P006', 'CP106', 'WH', '治疗期', '男', '2026-03-01', '2026-12-19', 'V3', 'V4'),
  ('ON101CLCT07', '中山医院', 'P007', 'CP107', 'LM', '筛选失败', '女', '2026-03-02', '2026-12-20', 'V1', 'V2')
ON CONFLICT (screening_no) DO UPDATE SET
  topic_no = EXCLUDED.topic_no,
  center = EXCLUDED.center,
  random_no = EXCLUDED.random_no,
  initials = EXCLUDED.initials,
  status = EXCLUDED.status,
  gender = EXCLUDED.gender,
  informed_at = EXCLUDED.informed_at,
  enrolled_at = EXCLUDED.enrolled_at,
  current_visit = EXCLUDED.current_visit,
  next_visit = EXCLUDED.next_visit,
  updated_at = now();

INSERT INTO accounts (name, role, hospital, status, phone) VALUES
  ('石磊', '主任医师', '瑞金医院', '启用', '13800000001'),
  ('张敏', '数据管理员', '中山医院', '启用', '13800000002'),
  ('陈露', '录入人员', '瑞金医院', '停用', '13800000003')
ON CONFLICT (phone) DO UPDATE SET
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  hospital = EXCLUDED.hospital,
  status = EXCLUDED.status,
  updated_at = now();

INSERT INTO visits (code, title, sort_order) VALUES
  ('V0', '筛选访视', 0),
  ('V1', '基线访视', 1),
  ('V2', '第 2 次访视', 2),
  ('V3', '第 3 次访视', 3),
  ('V4', '第 4 次访视', 4),
  ('V5', '第 5 次访视', 5)
ON CONFLICT (code) DO UPDATE SET title = EXCLUDED.title, sort_order = EXCLUDED.sort_order;

INSERT INTO forms (name, sort_order) VALUES
  ('访视日期', 1),
  ('人口学特征', 2),
  ('生命体征', 3),
  ('实验室检查', 4),
  ('影像学检查', 5),
  ('目标溃疡评估', 6)
ON CONFLICT (name) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO visit_forms (visit_id, form_id, sort_order)
SELECT v.id, f.id, vf.sort_order
FROM (VALUES
  ('V0', '访视日期', 1),
  ('V0', '人口学特征', 2),
  ('V0', '生命体征', 3),
  ('V1', '访视日期', 1),
  ('V1', '人口学特征', 2),
  ('V1', '实验室检查', 3),
  ('V1', '影像学检查', 4),
  ('V1', '目标溃疡评估', 5),
  ('V2', '访视日期', 1),
  ('V2', '人口学特征', 2),
  ('V2', '目标溃疡评估', 3),
  ('V3', '访视日期', 1),
  ('V3', '人口学特征', 2),
  ('V3', '目标溃疡评估', 3),
  ('V3', '影像学检查', 4),
  ('V4', '访视日期', 1),
  ('V4', '人口学特征', 2),
  ('V5', '访视日期', 1),
  ('V5', '人口学特征', 2),
  ('V5', '目标溃疡评估', 3)
) AS vf(visit_code, form_name, sort_order)
JOIN visits v ON v.code = vf.visit_code
JOIN forms f ON f.name = vf.form_name
ON CONFLICT (visit_id, form_id) DO UPDATE SET sort_order = EXCLUDED.sort_order;

INSERT INTO form_entries (subject_id, visit_id, form_id, done, value)
SELECT s.id, v.id, f.id, seed.done, seed.value::jsonb
FROM (VALUES
  ('P001', 'V0', '访视日期', true, '{"date":"2026-09-12"}'),
  ('P001', 'V0', '人口学特征', true, '{"nation":"汉族"}'),
  ('P001', 'V0', '生命体征', false, '{}'),
  ('P001', 'V1', '访视日期', true, '{"date":"2026-10-12"}'),
  ('P001', 'V1', '人口学特征', false, '{}'),
  ('P002', 'V0', '访视日期', true, '{"date":"2026-09-14"}'),
  ('P002', 'V0', '人口学特征', true, '{"nation":"汉族"}'),
  ('P003', 'V1', '实验室检查', false, '{}'),
  ('P004', 'V2', '目标溃疡评估', true, '{"score":82}'),
  ('P005', 'V3', '影像学检查', false, '{}')
) AS seed(screening_no, visit_code, form_name, done, value)
JOIN subjects s ON s.screening_no = seed.screening_no
JOIN visits v ON v.code = seed.visit_code
JOIN forms f ON f.name = seed.form_name
ON CONFLICT (subject_id, visit_id, form_id) DO UPDATE SET
  done = EXCLUDED.done,
  value = EXCLUDED.value,
  updated_at = now();
