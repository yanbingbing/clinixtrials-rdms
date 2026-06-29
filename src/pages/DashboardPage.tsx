import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"

import { ChartLegend, DonutChart, FilterSelect, palette, StatusBadge } from "@/components/business"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { budgetData, filterGroupData, monthlyLine, projectProgress } from "@/data/mock"
import { useProjectsQuery, useStatsOverviewQuery } from "@/hooks/useApiData"

export function DashboardPage() {
  const projectsQuery = useProjectsQuery()
  const statsQuery = useStatsOverviewQuery()
  const projects = projectsQuery.data ?? projectProgress
  const budget = statsQuery.data?.budget ?? budgetData
  const projectStatus = statsQuery.data?.projectStatus ?? [
    { name: "立项", value: 44 },
    { name: "进行中", value: 38 },
    { name: "结束", value: 18 },
  ]
  const subjectStatus = statsQuery.data?.subjectStatus ?? [
    { name: "筛选例数", value: 22 },
    { name: "入组例数", value: 18 },
    { name: "完成研究", value: 14 },
    { name: "退出研究", value: 28 },
    { name: "失访", value: 12 },
  ]
  const filterGroup = statsQuery.data?.filterGroup ?? filterGroupData

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>课题状态一览</CardTitle>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={projectStatus}
              colors={[palette.teal, palette.amber, palette.gray]}
            />
            <ChartLegend
              items={[
                { name: "立项", color: palette.teal },
                { name: "进行中", color: palette.amber },
                { name: "结束", color: palette.gray },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>预算汇总</CardTitle>
            <button className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-white">编辑 / 更新</button>
          </CardHeader>
          <CardContent>
            <div className="h-[245px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budget} margin={{ top: 8, right: 10, left: 12, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="budget" fill={palette.teal} barSize={22} radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>进度统计</CardTitle>
            <div className="flex gap-3">
              <FilterSelect value="完成" options={["完成", "进行中", "全部"]} />
              <FilterSelect value="2025" options={["2025", "2026"]} />
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
                  <TableHead>进度</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>{row.id}</TableCell>
                    <TableCell>{row.start}</TableCell>
                    <TableCell>{row.end}</TableCell>
                    <TableCell>
                      <StatusBadge status={row.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex min-w-40 items-center gap-3">
                        <Progress value={row.progress} />
                        {row.progress < 100 ? <span className="text-xs text-orange-500">{row.progress}%</span> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>筛选 / 入组进度</CardTitle>
            <div className="flex gap-3">
              <FilterSelect value="全部研究" options={["全部研究", "ON101", "ON102"]} />
              <FilterSelect value="瑞金医院" options={["瑞金医院", "中山医院"]} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[252px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filterGroup} margin={{ top: 4, right: 12, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="screened" fill={palette.teal} barSize={18} radius={[2, 2, 0, 0]} name="筛选例数" />
                  <Bar dataKey="grouped" fill={palette.orange} barSize={18} radius={[2, 2, 0, 0]} name="入组例数" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              items={[
                { name: "筛选例数", color: palette.teal },
                { name: "入组例数", color: palette.orange },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[520px_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>受试者状态</CardTitle>
            <FilterSelect value="ON101" options={["ON101", "ON102", "ON103"]} />
          </CardHeader>
          <CardContent>
            <DonutChart
              data={subjectStatus}
              colors={[palette.violet, palette.blue, palette.teal, palette.amber, palette.gray]}
              height={250}
            />
            <ChartLegend
              items={[
                { name: "筛选例数", color: palette.violet },
                { name: "入组例数", color: palette.blue },
                { name: "完成研究", color: palette.teal },
                { name: "退出研究", color: palette.amber },
                { name: "失访", color: palette.gray },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>患者注册进度</CardTitle>
            <div className="flex gap-3">
              <FilterSelect value="全部研究" options={["全部研究", "ON101"]} />
              <FilterSelect value="瑞金医院" options={["瑞金医院", "中山医院"]} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyLine} margin={{ top: 8, right: 20, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#a3abb5", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#a3abb5", fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="screened" stroke={palette.violet} strokeWidth={2} dot={{ r: 3 }} name="筛选例数" />
                  <Line type="monotone" dataKey="randomized" stroke={palette.blue} strokeWidth={2} dot={{ r: 3 }} name="入组例数" />
                  <Line type="monotone" dataKey="completed" stroke={palette.teal} strokeWidth={2} dot={{ r: 3 }} name="完成研究" />
                  <Line type="monotone" dataKey="exited" stroke={palette.amber} strokeWidth={2} dot={{ r: 3 }} name="退出研究" />
                  <Line type="monotone" dataKey="lost" stroke={palette.gray} strokeWidth={2} dot={{ r: 3 }} name="失访" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
