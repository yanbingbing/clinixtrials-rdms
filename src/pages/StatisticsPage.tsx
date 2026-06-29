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

import { ChartLegend, FilterSelect, palette } from "@/components/business"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { enrollBars, monthlyLine } from "@/data/mock"

export function StatisticsPage() {
  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>每月注册</CardTitle>
          <div className="flex gap-3">
            <FilterSelect value="全部研究" options={["全部研究", "ON101", "ON102"]} />
            <FilterSelect value="瑞金医院" options={["瑞金医院", "中山医院"]} />
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[360px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyLine} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
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

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <CardTitle>受试者访视状态</CardTitle>
          <FilterSelect value="V2" options={["V1", "V2", "V3", "V4", "V5"]} />
        </CardHeader>
        <CardContent>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={enrollBars} margin={{ top: 10, right: 24, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="screened" fill={palette.violet} barSize={22} radius={[2, 2, 0, 0]} name="筛选" />
                <Bar dataKey="randomized" fill={palette.blue} barSize={22} radius={[2, 2, 0, 0]} name="入组" />
                <Bar dataKey="treated" fill={palette.teal} barSize={22} radius={[2, 2, 0, 0]} name="治疗" />
                <Bar dataKey="completed" fill={palette.gray} barSize={22} radius={[2, 2, 0, 0]} name="完成" />
                <Bar dataKey="exited" fill={palette.orange} barSize={22} radius={[2, 2, 0, 0]} name="退出" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <ChartLegend
            items={[
              { name: "筛选", color: palette.violet },
              { name: "入组", color: palette.blue },
              { name: "治疗", color: palette.teal },
              { name: "完成", color: palette.gray },
              { name: "退出", color: palette.orange },
            ]}
          />
        </CardContent>
      </Card>
    </div>
  )
}
