export type SubjectStatus = "筛选期" | "治疗期" | "筛选失败" | "退出研究" | "完成研究" | "失访"

export interface Subject {
  topicNo: string
  center: string
  screeningNo: string
  randomNo: string
  initials: string
  status: SubjectStatus
  gender: "男" | "女"
  informedAt: string
  enrolledAt: string
  currentVisit: string
  nextVisit: string
}

export const subjects: Subject[] = [
  {
    topicNo: "ON101CLCT01",
    center: "瑞金医院",
    screeningNo: "P001",
    randomNo: "CP101",
    initials: "SL",
    status: "治疗期",
    gender: "男",
    informedAt: "2026-02-12",
    enrolledAt: "2026-12-12",
    currentVisit: "V2",
    nextVisit: "V3",
  },
  {
    topicNo: "ON101CLCT02",
    center: "中山医院",
    screeningNo: "P002",
    randomNo: "CP102",
    initials: "ZSL",
    status: "退出研究",
    gender: "女",
    informedAt: "2026-02-12",
    enrolledAt: "2026-12-12",
    currentVisit: "V2",
    nextVisit: "V3",
  },
  {
    topicNo: "ON101CLCT03",
    center: "中西结合医院",
    screeningNo: "P003",
    randomNo: "CP103",
    initials: "ZSL",
    status: "失访",
    gender: "男",
    informedAt: "2026-02-12",
    enrolledAt: "2026-12-12",
    currentVisit: "V3",
    nextVisit: "V4",
  },
  {
    topicNo: "ON101CLCT04",
    center: "瑞金医院",
    screeningNo: "P004",
    randomNo: "CP104",
    initials: "SL",
    status: "完成研究",
    gender: "男",
    informedAt: "2026-02-12",
    enrolledAt: "2026-12-12",
    currentVisit: "V1",
    nextVisit: "NA",
  },
  {
    topicNo: "ON101CLCT05",
    center: "中山医院",
    screeningNo: "P005",
    randomNo: "CP105",
    initials: "ASA",
    status: "筛选期",
    gender: "女",
    informedAt: "2026-02-12",
    enrolledAt: "2026-12-12",
    currentVisit: "V2",
    nextVisit: "V3",
  },
]

export const projectProgress = [
  { id: "ON101", start: "2026-01-21", end: "2026-01-26", status: "完成", progress: 100 },
  { id: "ON102", start: "2026-01-22", end: "2026-01-26", status: "进行中", progress: 67 },
  { id: "ON103", start: "2026-01-21", end: "2026-01-26", status: "完成", progress: 100 },
  { id: "ON104", start: "2026-01-21", end: "2026-01-26", status: "完成", progress: 100 },
]

export const budgetData = [
  { name: "ON101", budget: 320000 },
  { name: "ON102", budget: 450000 },
  { name: "ON103", budget: 570000 },
  { name: "ON104", budget: 410000 },
  { name: "ON105", budget: 190000 },
  { name: "ON106", budget: 490000 },
  { name: "ON107", budget: 280000 },
  { name: "ON108", budget: 640000 },
]

export const enrollBars = [
  { month: "2015-01", screened: 15, randomized: 6, treated: 11, completed: 9, exited: 6 },
  { month: "2015-02", screened: 35, randomized: 14, treated: 29, completed: 22, exited: 14 },
  { month: "2015-03", screened: 15, randomized: 6, treated: 13, completed: 8, exited: 6 },
  { month: "2015-04", screened: 25, randomized: 6, treated: 21, completed: 15, exited: 6 },
  { month: "2015-05", screened: 40, randomized: 15, treated: 28, completed: 8, exited: 15 },
  { month: "2015-06", screened: 30, randomized: 15, treated: 21, completed: 27, exited: 15 },
  { month: "2015-07", screened: 40, randomized: 6, treated: 7, completed: 15, exited: 6 },
]

export const monthlyLine = [
  { month: "2026-01", screened: 36, randomized: 12, completed: 0, exited: -10, lost: 0 },
  { month: "2026-02", screened: 48, randomized: 30, completed: 42, exited: 36, lost: 52 },
  { month: "2026-03", screened: 78, randomized: 55, completed: 48, exited: 39, lost: 2 },
  { month: "2026-04", screened: 120, randomized: 95, completed: 108, exited: 101, lost: 80 },
  { month: "2026-05", screened: 112, randomized: 86, completed: 72, exited: 64, lost: -2 },
  { month: "2026-06", screened: 96, randomized: 73, completed: 82, exited: 76, lost: -8 },
  { month: "2026-07", screened: 104, randomized: 80, completed: 94, exited: 88, lost: 10 },
  { month: "2026-08", screened: 132, randomized: 106, completed: 122, exited: 115, lost: 10 },
]

export const filterGroupData = [
  { name: "ON101", screened: 15, grouped: 9 },
  { name: "ON102", screened: 21, grouped: 13 },
  { name: "ON103", screened: 26, grouped: 20 },
  { name: "ON104", screened: 19, grouped: 12 },
  { name: "ON105", screened: 9, grouped: 3 },
  { name: "ON106", screened: 29, grouped: 18 },
]

export const accountRows = [
  { name: "石磊", role: "主任医师", hospital: "瑞金医院", status: "启用", phone: "13800000001" },
  { name: "张敏", role: "数据管理员", hospital: "中山医院", status: "启用", phone: "13800000002" },
  { name: "陈露", role: "录入人员", hospital: "瑞金医院", status: "停用", phone: "13800000003" },
]

export const visitMatrix = [
  { visit: "V1", forms: ["访视日期", "人口学特征", "实验室检查", "影像学检查", "目标溃疡评估"] },
  { visit: "V2", forms: ["访视日期", "人口学特征", "目标溃疡评估"] },
  { visit: "V3", forms: ["访视日期", "人口学特征", "目标溃疡评估", "影像学检查"] },
  { visit: "V4", forms: ["访视日期", "人口学特征"] },
  { visit: "V5", forms: ["访视日期", "人口学特征", "目标溃疡评估"] },
]

export const formTree = [
  { label: "V0-筛选访视", done: false, children: [
    { label: "访视日期", done: true },
    { label: "人口学特征", done: true },
    { label: "生命体征", done: false },
  ] },
  { label: "V1-基线访视", done: false, children: [] },
]
