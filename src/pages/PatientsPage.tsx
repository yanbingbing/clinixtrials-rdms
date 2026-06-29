import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table"
import { Bar, BarChart, CartesianGrid, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { ChartLegend, DonutChart, FilterSelect, palette, StatusBadge } from "@/components/business"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { enrollBars, subjects, type Subject } from "@/data/mock"
import { useSubjectsQuery } from "@/hooks/useApiData"

const columnHelper = createColumnHelper<Subject>()

const columns = [
  columnHelper.accessor("topicNo", { header: "课题编号" }),
  columnHelper.accessor("center", { header: "研究中心" }),
  columnHelper.accessor("screeningNo", { header: "筛选编号" }),
  columnHelper.accessor("randomNo", { header: "入组编号" }),
  columnHelper.accessor("initials", { header: "姓名缩写" }),
  columnHelper.accessor("status", {
    header: "状态",
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor("gender", {
    header: "性别",
    cell: (info) => (
      <span className={info.getValue() === "男" ? "inline-flex items-center gap-1 text-blue-500" : "inline-flex items-center gap-1 text-pink-500"}>
        <span className="text-base leading-none">{info.getValue() === "男" ? "♂" : "♀"}</span>
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("informedAt", { header: "知情日期" }),
  columnHelper.accessor("enrolledAt", { header: "入组日期" }),
  columnHelper.accessor("currentVisit", { header: "当前访视" }),
  columnHelper.accessor("nextVisit", { header: "下次访视" }),
]

export function PatientsPage() {
  const subjectsQuery = useSubjectsQuery()
  const table = useReactTable({
    data: subjectsQuery.data ?? subjects,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[560px_1fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <CardTitle>受试者状态</CardTitle>
            <div className="flex gap-3">
              <FilterSelect value="全部研究" options={["全部研究", "ON101", "ON102"]} />
              <FilterSelect value="瑞金医院" options={["瑞金医院", "中山医院"]} />
            </div>
          </CardHeader>
          <CardContent>
            <DonutChart
              data={[
                { name: "筛选", value: 20 },
                { name: "入组", value: 21 },
                { name: "治疗", value: 23 },
                { name: "完成", value: 18 },
                { name: "退出", value: 14 },
              ]}
              colors={[palette.blue, palette.violet, palette.teal, palette.gray, palette.orange]}
              height={260}
            />
            <ChartLegend
              items={[
                { name: "筛选", color: palette.blue },
                { name: "入组", color: palette.violet },
                { name: "治疗", color: palette.teal },
                { name: "完成", color: palette.gray },
                { name: "退出", color: palette.orange },
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
            <div className="h-[282px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={enrollBars}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e8eef3" />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: "#9aa3ad", fontSize: 12 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="screened" stroke={palette.blue} strokeWidth={2} name="筛选" />
                  <Bar dataKey="treated" fill={palette.teal} barSize={18} radius={[2, 2, 0, 0]} name="治疗" />
                  <Bar dataKey="completed" fill={palette.gray} barSize={18} radius={[2, 2, 0, 0]} name="完成" />
                  <Bar dataKey="exited" fill={palette.orange} barSize={18} radius={[2, 2, 0, 0]} name="退出" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <ChartLegend
              items={[
                { name: "筛选", color: palette.blue },
                { name: "入组", color: palette.violet },
                { name: "治疗", color: palette.teal },
                { name: "完成", color: palette.gray },
                { name: "退出", color: palette.orange },
              ]}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>受试者详情</CardTitle>
          <FilterSelect value="全部" options={["全部", "筛选期", "治疗期", "完成研究"]} />
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
                <TableRow key={row.id} className="h-[84px]">
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
