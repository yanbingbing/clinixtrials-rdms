import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { CheckCircle2, FilePlus2, Layers3, Plus, Save, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useCrfSchemasQuery,
  useCrfVisitPlanQuery,
  useSaveCrfVisitPlanMutation,
} from "@/hooks/useApiData"
import type { CrfSchema } from "@/lib/crf"
import { cn } from "@/lib/utils"

type VisitDraft = {
  visitCode: string
  title: string
  sortOrder: number
  formSchemaIds: string[]
}

export function CrfPlanPage() {
  const queryClient = useQueryClient()
  const schemasQuery = useCrfSchemasQuery("ON101")
  const visitPlanQuery = useCrfVisitPlanQuery("ON101")
  const savePlanMutation = useSaveCrfVisitPlanMutation()
  const schemas = schemasQuery.data ?? []
  const [visits, setVisits] = useState<VisitDraft[]>([])
  const [selectedVisitCode, setSelectedVisitCode] = useState("")

  useEffect(() => {
    if (!visitPlanQuery.data) return
    const loaded = visitPlanQuery.data.map((visit) => ({
      visitCode: visit.visitCode,
      title: visit.title,
      sortOrder: visit.sortOrder,
      formSchemaIds: visit.forms.map((form) => form.schemaId),
    }))
    setVisits(loaded)
    setSelectedVisitCode((current) => current || loaded[0]?.visitCode || "")
  }, [visitPlanQuery.data])

  const schemaById = useMemo(() => new Map(schemas.map((schema) => [schema.id, schema])), [schemas])
  const selectedVisit = visits.find((visit) => visit.visitCode === selectedVisitCode) ?? visits[0]

  const addVisit = () => {
    const nextIndex = visits.length
    const nextVisit = {
      visitCode: `V${nextIndex}`,
      title: `第 ${nextIndex} 次访视`,
      sortOrder: nextIndex,
      formSchemaIds: [],
    }
    setVisits((current) => [...current, nextVisit])
    setSelectedVisitCode(nextVisit.visitCode)
  }

  const updateVisit = (index: number, patch: Partial<VisitDraft>) => {
    setVisits((current) =>
      current.map((visit, visitIndex) => (visitIndex === index ? { ...visit, ...patch } : visit)),
    )
  }

  const removeVisit = (visitCode: string) => {
    setVisits((current) => current.filter((visit) => visit.visitCode !== visitCode))
    if (selectedVisitCode === visitCode) {
      setSelectedVisitCode("")
    }
  }

  const addFormToVisit = (visitCode: string, schemaId: string) => {
    if (schemaId === "__none") return
    setVisits((current) =>
      current.map((visit) => {
        if (visit.visitCode !== visitCode) return visit
        return { ...visit, formSchemaIds: [...new Set([...visit.formSchemaIds, schemaId])] }
      }),
    )
  }

  const removeFormFromVisit = (visitCode: string, schemaId: string) => {
    setVisits((current) =>
      current.map((visit) => {
        if (visit.visitCode !== visitCode) return visit
        return { ...visit, formSchemaIds: visit.formSchemaIds.filter((id) => id !== schemaId) }
      }),
    )
  }

  const saveVisitPlan = async () => {
    await savePlanMutation.mutateAsync({ projectId: "ON101", visits })
    await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks"] })
  }

  return (
    <div className="grid min-h-[calc(100vh-124px)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="space-y-4">
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-white/80">
            <div>
              <CardTitle>范式计划配置</CardTitle>
              <div className="mt-2 text-sm text-slate-500">
                先定义受试者的访视路径，再给每次访视挑选需要填写的表格
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={addVisit}>
                <Plus className="mr-2 h-4 w-4" />
                添加访视
              </Button>
              <Button className="rounded-full" onClick={saveVisitPlan} disabled={savePlanMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                保存计划
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-4">
              {visits.map((visit, visitIndex) => {
                const selectedForms = visit.formSchemaIds
                  .map((schemaId) => schemaById.get(schemaId))
                  .filter(Boolean) as CrfSchema[]
                const availableForms = schemas.filter((schema) => !visit.formSchemaIds.includes(schema.id))

                return (
                  <section
                    key={`${visit.visitCode}-${visitIndex}`}
                    className={cn(
                      "rounded-lg border bg-white p-4 shadow-sm",
                      selectedVisit?.visitCode === visit.visitCode && "border-primary ring-1 ring-primary/20",
                    )}
                    onClick={() => setSelectedVisitCode(visit.visitCode)}
                  >
                    <div className="grid gap-3 lg:grid-cols-[86px_1fr_auto]">
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-600">访视</span>
                        <Input
                          value={visit.visitCode}
                          onChange={(event) => updateVisit(visitIndex, { visitCode: event.target.value })}
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-600">名称</span>
                        <Input
                          value={visit.title}
                          onChange={(event) => updateVisit(visitIndex, { title: event.target.value })}
                        />
                      </label>
                      <div className="flex items-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={(event) => {
                            event.stopPropagation()
                            removeVisit(visit.visitCode)
                          }}
                          title="删除访视"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_220px]">
                      <div className="min-h-16 rounded-md border bg-slate-50 p-3">
                        {selectedForms.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {selectedForms.map((schema) => (
                              <span
                                key={schema.id}
                                className="inline-flex items-center gap-2 rounded-full border bg-white px-3 py-1.5 text-sm text-slate-700"
                              >
                                <Layers3 className="h-3.5 w-3.5 text-primary" />
                                {schema.name}
                                <button
                                  type="button"
                                  className="text-slate-400 hover:text-rose-500"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    removeFormFromVisit(visit.visitCode, schema.id)
                                  }}
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex h-full items-center text-sm text-slate-400">
                            这个访视还没有选择表格
                          </div>
                        )}
                      </div>
                      <Select value="__none" onValueChange={(schemaId) => addFormToVisit(visit.visitCode, schemaId)}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="引入表格" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none">选择表格</SelectItem>
                          {availableForms.map((schema) => (
                            <SelectItem key={schema.id} value={schema.id}>
                              {schema.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </section>
                )
              })}
            </div>

            {savePlanMutation.isSuccess ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                范式计划已保存，填报任务会按新配置生成
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <aside className="space-y-4 xl:sticky xl:top-[108px] xl:h-[calc(100vh-124px)] xl:overflow-y-auto">
        <Card>
          <CardHeader className="border-b bg-white/80">
            <CardTitle>表格库</CardTitle>
            <div className="text-sm text-slate-500">计划只引用表格，不在这里设计字段</div>
          </CardHeader>
          <CardContent className="space-y-2 pt-5">
            {schemas.map((schema) => (
              <div key={schema.id} className="rounded-md border bg-white p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-700">{schema.name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      {schema.code} · v{schema.version}
                    </div>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600">
                    {schema.category === "base" ? "基础" : "原子"}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>缺少表格？</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm leading-6 text-slate-500">
              如果计划配置时发现表格库里没有需要的表格，进入表格设计页面新增或修改。
            </div>
            <Button asChild className="w-full rounded-full">
              <Link to="/crf/forms">
                <FilePlus2 className="mr-2 h-4 w-4" />
                去表格设计
              </Link>
            </Button>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}
