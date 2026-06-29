import { Link } from "@tanstack/react-router"

import { StatusBadge } from "@/components/business"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { subjects, type Subject } from "@/data/mock"
import { useSubjectsQuery } from "@/hooks/useApiData"

const columns = [
  "筛选序号",
  "研究中心名称",
  "筛选编号",
  "随机编号",
  "患者姓名缩写",
  "性别",
  "知情日期",
  "登记日期",
  "状态",
  "当前访视",
  "下次访视",
]

export function DataEntryPage() {
  const subjectsQuery = useSubjectsQuery()
  const rows = (subjectsQuery.data ?? subjects).slice(0, 5)

  return (
    <Card className="min-h-[720px]">
      <CardHeader>
        <CardTitle>数据录入</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto pb-1">
          <div className="min-w-[1220px] space-y-5">
            <div className="grid h-16 grid-cols-[90px_150px_105px_105px_135px_80px_130px_130px_120px_105px_105px] items-center rounded-sm bg-slate-50 px-4 text-sm font-semibold text-slate-500">
              {columns.map((column) => (
                <div key={column}>{column}</div>
              ))}
            </div>
            <div className="space-y-5">
              {rows.map((row, index) => (
                <EntryRow key={row.screeningNo} index={index} row={row} />
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function EntryRow({ index, row }: { index: number; row: Subject }) {
  return (
    <div className="grid h-[86px] grid-cols-[90px_150px_105px_105px_135px_80px_130px_130px_120px_105px_105px] items-center rounded-lg border bg-white px-4 text-sm text-slate-700">
      <div>{String(index + 1).padStart(2, "0")}</div>
      <div>{row.center}</div>
      <Link to="/entry/detail" className="font-medium text-primary underline underline-offset-4">
        {row.screeningNo}
      </Link>
      <div>{row.randomNo}</div>
      <div>{row.initials}</div>
      <div className={row.gender === "男" ? "inline-flex items-center gap-1 text-blue-500" : "inline-flex items-center gap-1 text-pink-500"}>
        <span className="text-base leading-none">{row.gender === "男" ? "♂" : "♀"}</span>
        {row.gender}
      </div>
      <div>{row.informedAt}</div>
      <div>{row.enrolledAt}</div>
      <div>
        <StatusBadge status={row.status} />
      </div>
      <div>{row.currentVisit}</div>
      <div>{row.nextVisit}</div>
    </div>
  )
}
