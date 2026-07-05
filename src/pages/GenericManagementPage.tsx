import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Link } from "@tanstack/react-router"
import type React from "react"
import {
  FileText,
  Plus,
  Search,
  Settings2,
  type LucideIcon,
} from "lucide-react"

import { FilterSelect, StatusBadge } from "@/components/business"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { accountRows, projectProgress } from "@/data/mock"
import { useAccountsQuery, useProjectsQuery, useSubjectsQuery } from "@/hooks/useApiData"

type Account = (typeof accountRows)[number]
const accountColumnHelper = createColumnHelper<Account>()
const accountColumns = [
  accountColumnHelper.accessor("name", { header: "姓名" }),
  accountColumnHelper.accessor("role", { header: "角色" }),
  accountColumnHelper.accessor("hospital", { header: "所属机构" }),
  accountColumnHelper.accessor("phone", { header: "手机号" }),
  accountColumnHelper.accessor("status", {
    header: "状态",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
]

export function ProjectsPage() {
  const projectsQuery = useProjectsQuery()
  const subjectsQuery = useSubjectsQuery()
  const projects = projectsQuery.data ?? projectProgress
  const subjects = subjectsQuery.data ?? []

  return (
    <Card className="min-h-[760px]">
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>项目管理</CardTitle>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input className="h-11 pl-9" placeholder="搜索" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectListCard
              key={project.id}
              project={project}
              screened={subjects.filter((subject) => subject.topicNo.startsWith(project.id)).length || 12}
              grouped={
                subjects.filter(
                  (subject) =>
                    subject.topicNo.startsWith(project.id) &&
                    ["治疗期", "完成研究", "退出研究"].includes(subject.status),
                ).length || 12
              }
            />
          ))}
        </div>
        <div className="flex items-center justify-center gap-5 pt-2 text-sm text-slate-600">
          <span>共{projects.length}条</span>
          <button className="text-slate-400">‹</button>
          <button className="rounded-md bg-primary/10 px-3 py-2 font-semibold text-primary">1</button>
          <button>2</button>
          <button>3</button>
          <button>4</button>
          <span>...</span>
          <button>20</button>
          <button>›</button>
          <button className="rounded-md bg-slate-100 px-3 py-2">10条/页</button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProjectListCard({
  project,
  screened,
  grouped,
}: {
  project: (typeof projectProgress)[number] & {
    name?: string
    center?: string
    budget?: number
    principalInvestigator?: string
    targetEnrollment?: number
    department?: string
  }
  screened: number
  grouped: number
}) {
  const title = project.name ?? "软坚清脉法治疗下肢动脉硬化闭塞症的多中心临床研究"
  const principalInvestigator = project.principalInvestigator ?? "张慈"
  const targetEnrollment = project.targetEnrollment ?? grouped
  const department = project.department ?? "血管外科"

  return (
    <div className="rounded-lg border bg-white p-5 transition-colors hover:border-primary">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="truncate text-lg font-semibold text-slate-800">{title}</div>
      </div>

      <div className="mt-5 grid gap-4 rounded-md bg-slate-50 px-5 py-4 md:grid-cols-5">
        <ProjectMetric label="状态" value={<span className="font-semibold text-orange-500">{project.status}</span>} />
        <ProjectMetric label="主要研究者" value={principalInvestigator} />
        <ProjectMetric label="研究科室" value={department} />
        <ProjectMetric label="筛选例数" value={String(screened)} />
        <ProjectMetric label="目标入组例数" value={String(targetEnrollment)} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-slate-500">
        <ProjectAction icon={FileText} label="项目概况" to="/projects/$projectId" params={{ projectId: project.id }} active />
        <ProjectAction icon={Settings2} label="CRF配置" to="/projects/$projectId/crf" params={{ projectId: project.id }} />
      </div>
    </div>
  )
}

function ProjectMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function ProjectAction({
  icon: Icon,
  label,
  to,
  params,
  active,
}: {
  icon: LucideIcon
  label: string
  to: string
  params?: { projectId: string }
  active?: boolean
}) {
  return (
    <Link
      to={to}
      params={params}
      className={
        active
          ? "flex items-center gap-2 font-semibold text-primary hover:text-primary/80"
          : "flex items-center gap-2 hover:text-primary"
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  )
}

export function ProgressPage() {
  const projectsQuery = useProjectsQuery()
  const projects = projectsQuery.data ?? projectProgress

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>进度管理</CardTitle>
        <div className="flex gap-3">
          <FilterSelect value="全部研究" options={["全部研究", "ON101", "ON102"]} />
          <FilterSelect value="2026" options={["2026", "2025"]} />
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead>项目编号</TableHead>
              <TableHead>立项日期</TableHead>
              <TableHead>结束日期</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>完成度</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {projects.map((row) => (
              <TableRow key={row.id} className="h-20">
                <TableCell>{row.id}</TableCell>
                <TableCell>{row.start}</TableCell>
                <TableCell>{row.end}</TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell>
                  <Progress value={row.progress} className="min-w-60" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function AccountsPage() {
  const accountsQuery = useAccountsQuery()
  const table = useReactTable({
    data: accountsQuery.data ?? accountRows,
    columns: accountColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>账户管理</CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="搜索账户" />
          </div>
          <Button className="rounded-full">
            <Plus className="mr-2 h-4 w-4" />
            新增账户
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader className="bg-slate-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id} className="h-20">
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function RegistrationPage() {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>受试者登记</CardTitle>
        <Button className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          新增登记
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {["基础信息", "知情同意", "筛选资料"].map((item, index) => (
            <div key={item} className="rounded-lg border bg-white p-5">
              <div className="mb-3 text-base font-semibold">{item}</div>
              <div className="text-sm text-slate-500">待录入 {index + 2} 项，已完成 {index + 5} 项</div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
