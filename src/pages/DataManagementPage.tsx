import { Download, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { useDataMatrixQuery } from "@/hooks/useApiData"
import { cn } from "@/lib/utils"
import { visitMatrix as fallbackVisitMatrix } from "@/data/mock"

const fallbackPatients = ["R10001", "R10002", "R10003", "R10004", "R10005", "R10006", "R10007", "R10008", "R10009"]

export function DataManagementPage() {
  const matrixQuery = useDataMatrixQuery()
  const patients = matrixQuery.data?.patients ?? fallbackPatients
  const visitMatrix = matrixQuery.data?.visits ?? fallbackVisitMatrix

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-4">
        <CardTitle>数据管理</CardTitle>
        <div className="flex items-center gap-3">
          <div className="relative w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input className="pl-9" placeholder="搜索" />
          </div>
          <Button className="rounded-full px-8">
            <Download className="mr-2 h-4 w-4" />
            下载
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 xl:grid-cols-[230px_1fr]">
          <div className="overflow-hidden rounded-lg border">
            <div className="bg-white px-4 py-5 text-sm font-semibold">患者编号</div>
            <div className="divide-y">
              {patients.map((patient, index) => (
                <div
                  key={`${patient}-${index}`}
                  className={cn(
                    "flex h-14 items-center gap-3 px-4 text-sm",
                    index === 0 && "bg-primary/12 font-semibold text-primary",
                  )}
                >
                  <Checkbox checked={index === 0} />
                  <span>{patient}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto pb-2">
            <div className="grid min-w-[980px] grid-cols-5 gap-4">
              {visitMatrix.map((visit, visitIndex) => (
                <div key={visit.visit} className="space-y-4">
                  <div className="rounded-md bg-slate-50 py-5 text-center text-sm font-semibold text-slate-500">
                    {visit.visit}
                  </div>
                  {visit.forms.map((form, formIndex) => (
                    <div key={form} className="grid h-[86px] grid-cols-[96px_1fr] overflow-hidden rounded-lg border bg-white">
                      <div className="flex items-center justify-center border-r">
                        <Checkbox checked={visitIndex === 0 && formIndex === 0} />
                      </div>
                      <div className="flex items-center whitespace-nowrap px-4 text-sm font-medium text-slate-600">{form}</div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
