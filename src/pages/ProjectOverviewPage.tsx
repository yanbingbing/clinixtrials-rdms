import { Link, useParams } from "@tanstack/react-router"
import type React from "react"
import {
  FileText,
  Settings2,
} from "lucide-react"
import {
  Bar as RechartsBar,
  BarChart as RechartsBarChart,
  CartesianGrid as RechartsCartesianGrid,
  ResponsiveContainer as RechartsResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis as RechartsXAxis,
  YAxis as RechartsYAxis,
} from "recharts"

import { FilterSelect, palette, StatusBadge } from "@/components/business"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { projectProgress } from "@/data/mock"
import { useProjectsQuery, useSubjectsQuery } from "@/hooks/useApiData"
import type { ProjectProgressRow } from "@/lib/api"

export function ProjectOverviewPage() {
  const { projectId } = useParams({ from: "/app/projects/$projectId" })
  const projectsQuery = useProjectsQuery()
  const subjectsQuery = useSubjectsQuery()
  const projects = (projectsQuery.data ?? projectProgress) as Array<Partial<ProjectProgressRow> & { id: string; start: string; end: string; status: string; progress: number }>
  const project = projects.find((item) => item.id === projectId) ?? projects[0]
  const subjects = subjectsQuery.data ?? []
  const projectSubjects = subjects.filter((subject) => subject.topicNo.startsWith(project.id))
  const screened = projectSubjects.length || 12
  const grouped =
    projectSubjects.filter((subject) => ["治疗期", "完成研究", "退出研究"].includes(subject.status)).length || 12
  const principalInvestigator = project.principalInvestigator ?? "张慈"
  const targetEnrollment = project.targetEnrollment ?? grouped
  const department = project.department ?? "血管外科"

  const visitData = [
    { name: "V1", completed: Math.max(4, Math.round(grouped * 0.9)), pending: 2 },
    { name: "V2", completed: Math.max(3, Math.round(grouped * 0.72)), pending: 3 },
    { name: "V3", completed: Math.max(2, Math.round(grouped * 0.55)), pending: 4 },
    { name: "V4", completed: Math.max(1, Math.round(grouped * 0.34)), pending: 5 },
    { name: "V5", completed: Math.max(1, Math.round(grouped * 0.18)), pending: 6 },
  ]

  return (
    <div className="space-y-4">
      <div className="px-1 py-1 text-base font-medium">
        <Link to="/projects" className="text-slate-500">
          项目管理
        </Link>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-800">项目概况</span>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-primary/12 text-primary">
                <FileText className="h-7 w-7" />
              </div>
              <div className="min-w-0">
                <h1 className="truncate text-xl font-semibold text-slate-800">{project.name ?? `${project.id} 临床研究项目`}</h1>
                <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                  <span>项目编号：{project.id}</span>
                  <span>研究中心：{project.center ?? "瑞金医院"}</span>
                  <span>研究科室：{department}</span>
                  <span>周期：{project.start} 至 {project.end}</span>
                </div>
              </div>
            </div>
            <Button className="rounded-full px-6">编辑 / 更新</Button>
          </div>

          <div className="mt-5 grid gap-4 rounded-md bg-slate-50 p-5 md:grid-cols-5">
            <Metric label="状态" value={<StatusBadge status={project.status} />} />
            <Metric label="主要研究者" value={principalInvestigator} />
            <Metric label="研究科室" value={department} />
            <Metric label="筛选例数" value={String(screened)} />
            <Metric label="目标入组例数" value={String(targetEnrollment)} />
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-7 gap-y-3 text-sm text-slate-500">
            <div className="flex items-center gap-2 font-semibold text-primary">
              <FileText className="h-4 w-4" />
              <span>项目概况</span>
            </div>
            <Link
              to="/projects/$projectId/crf"
              params={{ projectId }}
              className="flex items-center gap-2 hover:text-primary"
            >
              <Settings2 className="h-4 w-4" />
              <span>CRF配置</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>访视完成情况</CardTitle>
            <FilterSelect value="全部中心" options={["全部中心", project.center ?? "瑞金医院"]} />
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <RechartsResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={visitData} margin={{ top: 12, right: 20, left: 0, bottom: 6 }}>
                  <RechartsCartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                  <RechartsXAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <RechartsYAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <RechartsTooltip />
                  <RechartsBar dataKey="completed" name="已完成" fill={palette.teal} barSize={22} radius={[2, 2, 0, 0]} />
                  <RechartsBar dataKey="pending" name="待完成" fill={palette.orange} barSize={22} radius={[2, 2, 0, 0]} />
                </RechartsBarChart>
              </RechartsResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>项目进度</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-slate-500">
                <span>总体完成度</span>
                <span>{project.progress}%</span>
              </div>
              <Progress value={project.progress} className="h-3" />
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <SummaryTile label="预算总额" value={`${((project.budget ?? 320000) / 10000).toFixed(1)} 万`} />
              <SummaryTile label="研究中心" value={project.center ?? "瑞金医院"} />
              <SummaryTile label="研究科室" value={department} />
              <SummaryTile label="筛选例数" value={String(screened)} />
              <SummaryTile label="实际入组例数" value={String(grouped)} />
              <SummaryTile label="目标入组例数" value={String(targetEnrollment)} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-sm font-medium text-slate-500">{label}</div>
      <div className="text-base font-semibold text-slate-800">{value}</div>
    </div>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-white p-4">
      <div className="mb-2 text-slate-500">{label}</div>
      <div className="font-semibold text-slate-800">{value}</div>
    </div>
  )
}
