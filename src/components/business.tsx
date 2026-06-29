import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"
import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { SubjectStatus } from "@/data/mock"

export const palette = {
  teal: "#34cdb4",
  blue: "#147cff",
  orange: "#ff8a3d",
  amber: "#f6a20a",
  gray: "#cbd5e1",
  violet: "#9a3cff",
  red: "#ff4d57",
}

const statusVariant: Record<SubjectStatus | string, React.ComponentProps<typeof Badge>["variant"]> = {
  筛选期: "default",
  治疗期: "orange",
  筛选失败: "red",
  退出研究: "red",
  完成研究: "blue",
  失访: "orange",
  完成: "default",
  进行中: "orange",
  启用: "default",
  停用: "gray",
}

export function StatusBadge({ status }: { status: SubjectStatus | string }) {
  return <Badge variant={statusVariant[status] ?? "gray"}>{status}</Badge>
}

export function FilterSelect({
  value,
  options,
  className,
}: {
  value: string
  options: string[]
  className?: string
}) {
  return (
    <Select defaultValue={value}>
      <SelectTrigger className={className ?? "h-9 min-w-32 bg-white"}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item} value={item}>
            {item}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

export function DonutChart({
  data,
  colors,
  height = 210,
}: {
  data: Array<{ name: string; value: number }>
  colors: string[]
  height?: number
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Tooltip />
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            dataKey="value"
            innerRadius="48%"
            outerRadius="72%"
            paddingAngle={1}
            stroke="none"
          >
            {data.map((entry, index) => (
              <Cell key={entry.name} fill={colors[index % colors.length]} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}

export function ChartLegend({ items }: { items: Array<{ name: string; color: string }> }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-slate-500">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
          <span>{item.name}</span>
        </div>
      ))}
    </div>
  )
}
