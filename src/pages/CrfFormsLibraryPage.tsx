import { Fragment, useState } from "react"
import { Link } from "@tanstack/react-router"
import { ChevronDown, ChevronRight, FilePlus2, Pencil } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCrfSchemasQuery } from "@/hooks/useApiData"
import { crfFieldTypeLabels as fieldTypeLabels, flattenCrfFields } from "@/lib/crf"

export function CrfFormsLibraryPage() {
  const schemasQuery = useCrfSchemasQuery("ON101")
  const schemas = schemasQuery.data ?? []
  const [expandedSchemaIds, setExpandedSchemaIds] = useState<Set<string>>(new Set())

  const toggleSchema = (schemaId: string) => {
    setExpandedSchemaIds((current) => {
      const next = new Set(current)
      if (next.has(schemaId)) {
        next.delete(schemaId)
      } else {
        next.add(schemaId)
      }
      return next
    })
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-white/80">
          <div>
            <CardTitle>模块库</CardTitle>
            <div className="mt-2 text-sm text-slate-500">
              统一维护可复用模块，CRF 访视计划从这里选择需要填写的模块
            </div>
          </div>
          <Button asChild className="rounded-full">
            <Link to="/crf/forms/$schemaId" params={{ schemaId: "new" }}>
              <FilePlus2 className="mr-2 h-4 w-4" />
              新增模块
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {schemasQuery.isLoading ? (
            <div className="m-5 rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              正在加载模块库...
            </div>
          ) : schemas.length === 0 ? (
            <div className="m-5 rounded-md border border-dashed p-8 text-center text-sm text-slate-500">
              还没有模块，可以先新增一个。
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="hover:bg-slate-50/80">
                  <TableHead className="min-w-[260px]">模块名称</TableHead>
                  <TableHead className="min-w-[160px]">模块编码</TableHead>
                  <TableHead className="w-[100px]">版本</TableHead>
                  <TableHead className="w-[110px]">字段数量</TableHead>
                  <TableHead className="w-[110px]">状态</TableHead>
                  <TableHead className="w-[120px] text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schemas.map((schema) => {
                  const fields = flattenCrfFields(schema.nodes)
                  const expanded = expandedSchemaIds.has(schema.id)

                  return (
                    <Fragment key={schema.id}>
                      <TableRow className={expanded ? "bg-primary/[0.03] hover:bg-primary/[0.03]" : undefined}>
                        <TableCell className="py-3">
                          <button
                            type="button"
                            className="flex w-full min-w-0 items-center gap-3 text-left"
                            aria-expanded={expanded}
                            aria-controls={`schema-fields-${schema.id}`}
                            onClick={() => toggleSchema(schema.id)}
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100">
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </span>
                            <span className="truncate font-semibold text-slate-800">{schema.name}</span>
                          </button>
                        </TableCell>
                        <TableCell className="py-3 font-mono text-xs text-slate-500">{schema.code}</TableCell>
                        <TableCell className="py-3 text-slate-600">v{schema.version}</TableCell>
                        <TableCell className="py-3 text-slate-600">{fields.length}</TableCell>
                        <TableCell className="py-3">
                          <SchemaStatusBadge status={schema.status} />
                        </TableCell>
                        <TableCell className="py-3 text-right">
                          <Button asChild variant="outline" size="sm" className="h-8 rounded-full">
                            <Link to="/crf/forms/$schemaId" params={{ schemaId: schema.id }}>
                              <Pencil className="mr-1.5 h-3.5 w-3.5" />
                              编辑
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>

                      {expanded ? (
                        <TableRow id={`schema-fields-${schema.id}`} className="bg-slate-50/70 hover:bg-slate-50/70">
                          <TableCell colSpan={6} className="px-5 py-4">
                            <div className="overflow-hidden rounded-md border bg-white">
                              <div className="border-b bg-slate-50 px-4 py-2.5 text-xs font-medium text-slate-600">
                                字段明细
                              </div>
                              {fields.length === 0 ? (
                                <div className="px-4 py-6 text-center text-sm text-slate-400">该模块还没有字段</div>
                              ) : (
                                <div className="max-h-72 overflow-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="hover:bg-white">
                                        <TableHead className="h-10 min-w-[180px] px-4 text-xs">字段名称</TableHead>
                                        <TableHead className="h-10 min-w-[180px] px-4 text-xs">字段标识</TableHead>
                                        <TableHead className="h-10 w-[140px] px-4 text-xs">字段类型</TableHead>
                                        <TableHead className="h-10 w-[100px] px-4 text-xs">必填</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {fields.map((field) => (
                                        <TableRow key={field.id}>
                                          <TableCell className="px-4 py-2.5 text-sm font-medium text-slate-700">
                                            {field.label}
                                          </TableCell>
                                          <TableCell className="px-4 py-2.5 font-mono text-xs text-slate-500">
                                            {field.key}
                                          </TableCell>
                                          <TableCell className="px-4 py-2.5 text-sm text-slate-600">
                                            {fieldTypeLabels[field.type]}
                                          </TableCell>
                                          <TableCell className="px-4 py-2.5 text-sm text-slate-600">
                                            {field.required ? "是" : "否"}
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function SchemaStatusBadge({ status }: { status: "draft" | "published" | "archived" }) {
  if (status === "published") {
    return <Badge className="bg-emerald-100 text-emerald-700">已发布</Badge>
  }

  if (status === "archived") {
    return <Badge variant="gray">已归档</Badge>
  }

  return <Badge className="bg-amber-100 text-amber-700">草稿</Badge>
}
