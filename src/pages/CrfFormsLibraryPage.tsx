import { Link } from "@tanstack/react-router"
import { FilePlus2, Layers3, Pencil, Table2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCrfSchemasQuery } from "@/hooks/useApiData"
import { flattenCrfFields } from "@/lib/crf"

export function CrfFormsLibraryPage() {
  const schemasQuery = useCrfSchemasQuery("ON101")
  const schemas = schemasQuery.data ?? []

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-white/80">
          <div>
            <CardTitle>原子表格库</CardTitle>
            <div className="mt-2 text-sm text-slate-500">
              统一维护可复用的原子表格，CRF 访视计划只引用这里的表格
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/crf/forms/$schemaId" params={{ schemaId: "new" }}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              新增原子表格
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="pt-5">
          {schemasQuery.isLoading ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">正在加载表格库...</div>
          ) : schemas.length === 0 ? (
            <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              还没有原子表格，可以先新增一张。
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
              {schemas.map((schema) => {
                const fieldCount = flattenCrfFields(schema.nodes).length
                return (
                  <Link
                    key={schema.id}
                    to="/crf/forms/$schemaId"
                    params={{ schemaId: schema.id }}
                    className="group rounded-lg border bg-white p-4 shadow-sm transition-colors hover:border-primary hover:bg-primary/5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-base font-semibold text-slate-800">{schema.name}</div>
                        <div className="mt-1 text-sm text-slate-400">{schema.code} · v{schema.version}</div>
                      </div>
                      <Badge className={schema.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                        {schema.status === "published" ? "已发布" : "草稿"}
                      </Badge>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-md bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Layers3 className="h-4 w-4" />
                          字段数量
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-800">{fieldCount}</div>
                      </div>
                      <div className="rounded-md bg-slate-50 p-3">
                        <div className="flex items-center gap-2 text-slate-500">
                          <Table2 className="h-4 w-4" />
                          类型
                        </div>
                        <div className="mt-2 text-xl font-semibold text-slate-800">原子</div>
                      </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                      <Pencil className="h-4 w-4" />
                      进入设计
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
