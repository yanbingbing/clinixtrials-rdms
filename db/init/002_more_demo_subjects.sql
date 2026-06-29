INSERT INTO subjects (topic_no, center, screening_no, random_no, initials, status, gender, informed_at, enrolled_at, current_visit, next_visit) VALUES
  ('ON102CLCT01', '中山医院', 'P101', 'CP201', 'HZ', '治疗期', '男', '2026-03-03', '2026-12-21', 'V2', 'V3'),
  ('ON102CLCT02', '中山医院', 'P102', 'CP202', 'CY', '完成研究', '女', '2026-03-05', '2026-12-22', 'V4', 'V5'),
  ('ON103CLCT01', '瑞金医院', 'P201', 'CP301', 'QY', '治疗期', '男', '2026-03-08', '2026-12-23', 'V3', 'V4'),
  ('ON103CLCT02', '瑞金医院', 'P202', 'CP302', 'LX', '筛选期', '女', '2026-03-09', '2026-12-24', 'V1', 'V2'),
  ('ON104CLCT01', '中西结合医院', 'P301', 'CP401', 'SX', '退出研究', '男', '2026-03-10', '2026-12-25', 'V2', 'V3'),
  ('ON104CLCT02', '中西结合医院', 'P302', 'CP402', 'MY', '治疗期', '女', '2026-03-11', '2026-12-26', 'V2', 'V3'),
  ('ON105CLCT01', '瑞金医院', 'P401', 'CP501', 'WJ', '筛选期', '男', '2026-03-12', '2026-12-27', 'V1', 'V2'),
  ('ON106CLCT01', '中山医院', 'P501', 'CP601', 'ZT', '完成研究', '女', '2026-03-13', '2026-12-28', 'V5', 'NA'),
  ('ON106CLCT02', '中山医院', 'P502', 'CP602', 'GQ', '治疗期', '男', '2026-03-14', '2026-12-29', 'V3', 'V4')
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
