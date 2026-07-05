import { type DragEvent, useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  GripVertical,
  Layers3,
  LibraryBig,
  Plus,
  Search,
  Trash2,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  useCrfSchemasQuery,
  useCrfVisitPlanQuery,
} from "@/hooks/useApiData"
import { api } from "@/lib/api"
import { flattenCrfFields, type CrfFieldType, type CrfSchema } from "@/lib/crf"
import { cn } from "@/lib/utils"
import { createInitialSortKey, sortKeyBetween } from "@shared/sort-key"

type VisitDraft = {
  visitCode: string
  title: string
  sortOrder: number
  sortKey: string
  forms: Array<{ schemaId: string; sortKey: string }>
}

type DropIndicator = {
  visitCode: string
  schemaId: string
  position: "before" | "after"
}

export function CrfPlanPage() {
  const queryClient = useQueryClient()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const projectId = pathname.match(/^\/projects\/([^/]+)\/crf$/)?.[1] ?? "ON101"
  const schemasQuery = useCrfSchemasQuery(projectId)
  const visitPlanQuery = useCrfVisitPlanQuery(projectId)
  const schemas = schemasQuery.data ?? []
  const [visits, setVisits] = useState<VisitDraft[]>([])
  const [selectedVisitCode, setSelectedVisitCode] = useState("")
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set())
  const [draggingForm, setDraggingForm] = useState<{ visitCode: string; schemaId: string } | null>(null)
  const [dropIndicator, setDropIndicator] = useState<DropIndicator | null>(null)
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")

  useEffect(() => {
    if (!visitPlanQuery.data) return
    const loaded = visitPlanQuery.data.map((visit) => ({
      visitCode: visit.visitCode,
      title: visit.title,
      sortOrder: visit.sortOrder,
      sortKey: visit.sortKey,
      forms: visit.forms.map((form, formIndex) => ({
        schemaId: form.schemaId,
        sortKey: form.sortKey || createInitialSortKey(formIndex),
      })),
    }))
    setVisits(loaded)
    setSelectedVisitCode((current) => current || loaded[0]?.visitCode || "")
  }, [visitPlanQuery.data])

  const schemaById = useMemo(() => new Map(schemas.map((schema) => [schema.id, schema])), [schemas])
  const selectedVisit = visits.find((visit) => visit.visitCode === selectedVisitCode) ?? visits[0]

  const addVisit = () => {
    const selectedIndex = visits.findIndex((visit) => visit.visitCode === selectedVisitCode)
    insertVisitAt(selectedIndex >= 0 ? selectedIndex + 1 : visits.length)
  }

  const insertVisitAt = (insertIndex: number) => {
    const nextVisit = createVisitDraft(visits, insertIndex)
    const next = [...visits]
    next.splice(Math.max(0, Math.min(insertIndex, next.length)), 0, nextVisit)
    setVisits(next)
    setSelectedVisitCode(nextVisit.visitCode)
    void persistPlanChange(() =>
      api.createCrfVisit(projectId, {
        visitCode: nextVisit.visitCode,
        title: nextVisit.title,
        sortKey: nextVisit.sortKey,
      }),
    )
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
    void persistPlanChange(() => api.deleteCrfVisit(projectId, visitCode))
  }

  const moveVisit = (visitIndex: number, direction: -1 | 1) => {
    const nextIndex = visitIndex + direction
    if (nextIndex < 0 || nextIndex >= visits.length) return
    const next = [...visits]
    const [moved] = next.splice(visitIndex, 1)
    const previous = next[nextIndex - 1]?.sortKey
    const following = next[nextIndex]?.sortKey
    const movedVisit = {
      ...moved,
      sortKey: sortKeyBetween(previous, following),
    }
    next.splice(nextIndex, 0, movedVisit)
    setVisits(next)
    void persistPlanChange(() => api.updateCrfVisit(projectId, movedVisit.visitCode, { sortKey: movedVisit.sortKey }))
  }

  const saveVisitTitle = (visit: VisitDraft) => {
    const title = visit.title.trim()
    if (!title) return
    void persistPlanChange(() => api.updateCrfVisit(projectId, visit.visitCode, { title }))
  }

  const persistPlanChange = async (operation: () => Promise<{ ok: boolean }>) => {
    setSaveState("saving")
    try {
      await operation()
      setSaveState("saved")
      await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan", projectId] })
      await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks", projectId] })
    } catch (error) {
      console.error(error)
      setSaveState("error")
    }
  }

  const syncVisits = async () => {
    await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan", projectId] })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks", projectId] })
  }

  const addFormToVisit = (visitCode: string, schemaId: string) => {
    if (schemaId === "__none" || schemaId === "__add") return
    const visit = visits.find((item) => item.visitCode === visitCode)
    if (!visit || visit.forms.some((form) => form.schemaId === schemaId)) return
    const previous = visit.forms[visit.forms.length - 1]?.sortKey
    const nextForm = { schemaId, sortKey: sortKeyBetween(previous, null) }
    setVisits((current) =>
      current.map((item) => {
        if (item.visitCode !== visitCode) return item
        return { ...item, forms: [...item.forms, nextForm] }
      }),
    )
    void persistPlanChange(() =>
      api.addCrfVisitForm(projectId, visitCode, {
        schemaId: nextForm.schemaId,
        sortKey: nextForm.sortKey,
      }),
    )
  }

  const removeFormFromVisit = (visitCode: string, schemaId: string) => {
    setVisits((current) =>
      current.map((visit) => {
        if (visit.visitCode !== visitCode) return visit
        return { ...visit, forms: visit.forms.filter((form) => form.schemaId !== schemaId) }
      }),
    )
    void persistPlanChange(() => api.deleteCrfVisitForm(projectId, visitCode, schemaId))
  }

  const moveFormWithinVisit = (
    visitCode: string,
    sourceSchemaId: string,
    targetSchemaId: string,
    position: "before" | "after",
  ) => {
    if (sourceSchemaId === targetSchemaId) return
    const visit = visits.find((item) => item.visitCode === visitCode)
    if (!visit) return
    const sourceIndex = visit.forms.findIndex((form) => form.schemaId === sourceSchemaId)
    const targetIndex = visit.forms.findIndex((form) => form.schemaId === targetSchemaId)
    if (sourceIndex < 0 || targetIndex < 0) return

    const nextForms = [...visit.forms]
    const [moved] = nextForms.splice(sourceIndex, 1)
    const adjustedTargetIndex = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex
    const insertIndex = position === "before" ? adjustedTargetIndex : adjustedTargetIndex + 1
    const previous = nextForms[insertIndex - 1]?.sortKey
    const following = nextForms[insertIndex]?.sortKey
    const movedForm = {
      ...moved,
      sortKey: sortKeyBetween(previous, following),
    }
    nextForms.splice(insertIndex, 0, movedForm)
    setVisits((current) =>
      current.map((item) => (item.visitCode === visitCode ? { ...item, forms: nextForms } : item)),
    )
    void persistPlanChange(() =>
      api.updateCrfVisitForm(projectId, visitCode, movedForm.schemaId, { sortKey: movedForm.sortKey }),
    )
  }

  const toggleFormExpanded = (visitCode: string, schemaId: string) => {
    const key = getFormKey(visitCode, schemaId)
    setExpandedForms((current) => {
      const next = new Set(current)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  return (
    <div className="grid min-h-[calc(100vh-124px)] gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      <main className="space-y-4">
        <div className="flex items-center gap-2 px-1 text-sm text-slate-500">
          <Link to="/projects/$projectId" params={{ projectId }} className="flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="h-4 w-4" />
            返回项目概况
          </Link>
          <span>/</span>
          <span className="font-medium text-slate-800">CRF配置</span>
        </div>
        <Card>
          <CardHeader className="flex-row items-start justify-between gap-4 border-b bg-white/80">
            <div>
              <CardTitle>访视计划配置</CardTitle>
              <div className="mt-2 text-sm text-slate-500">
                项目 {projectId} 的 CRF 配置：先定义受试者的访视路径，再给每次访视挑选需要填写的表格
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-full" onClick={addVisit}>
                <Plus className="mr-2 h-4 w-4" />
                添加访视
              </Button>
              <SaveStateIndicator state={saveState} onRetry={syncVisits} />
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            <div className="grid gap-4">
              {visits.map((visit, visitIndex) => {
                const selectedForms = visit.forms
                  .map((form) => schemaById.get(form.schemaId))
                  .filter(Boolean) as CrfSchema[]
                const selectedSchemaIds = new Set(visit.forms.map((form) => form.schemaId))
                const availableForms = schemas.filter((schema) => !selectedSchemaIds.has(schema.id))

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
                          readOnly
                          className="bg-slate-50 text-slate-500"
                        />
                      </label>
                      <label className="space-y-2 text-sm">
                        <span className="font-medium text-slate-600">名称</span>
                        <Input
                          value={visit.title}
                          onChange={(event) => updateVisit(visitIndex, { title: event.target.value })}
                          onBlur={() => saveVisitTitle(visit)}
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
                            moveVisit(visitIndex, -1)
                          }}
                          disabled={visitIndex === 0}
                          title="上移访视"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={(event) => {
                            event.stopPropagation()
                            moveVisit(visitIndex, 1)
                          }}
                          disabled={visitIndex === visits.length - 1}
                          title="下移访视"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="rounded-full"
                          onClick={(event) => {
                            event.stopPropagation()
                            insertVisitAt(visitIndex + 1)
                          }}
                          title="在下方插入访视"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
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

                    <div className="mt-4 rounded-md border bg-slate-50 p-3">
                      <div className="space-y-2">
                        {selectedForms.map((schema, formIndex) => {
                          const expanded = expandedForms.has(getFormKey(visit.visitCode, schema.id))
                          const dragging =
                            draggingForm?.visitCode === visit.visitCode && draggingForm.schemaId === schema.id
                          return (
                            <FormModuleCard
                              key={schema.id}
                              schema={schema}
                              index={formIndex}
                              expanded={expanded}
                              dragging={dragging}
                              dropPosition={
                                dropIndicator?.visitCode === visit.visitCode && dropIndicator.schemaId === schema.id
                                  ? dropIndicator.position
                                  : null
                              }
                              onToggle={() => toggleFormExpanded(visit.visitCode, schema.id)}
                              onRemove={() => removeFormFromVisit(visit.visitCode, schema.id)}
                              onDragStart={(event) => {
                                event.stopPropagation()
                                event.dataTransfer.effectAllowed = "move"
                                event.dataTransfer.setData("text/plain", `${visit.visitCode}:${schema.id}`)
                                setLightweightDragImage(event, schema.name)
                                setExpandedForms((current) => {
                                  const next = new Set(current)
                                  next.delete(getFormKey(visit.visitCode, schema.id))
                                  return next
                                })
                                setDraggingForm({ visitCode: visit.visitCode, schemaId: schema.id })
                              }}
                              onDragOver={(event) => {
                                if (draggingForm?.visitCode !== visit.visitCode) return
                                if (draggingForm.schemaId === schema.id) {
                                  setDropIndicator(null)
                                  return
                                }
                                event.preventDefault()
                                event.dataTransfer.dropEffect = "move"
                                const rect = event.currentTarget.getBoundingClientRect()
                                const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after"
                                setDropIndicator({ visitCode: visit.visitCode, schemaId: schema.id, position })
                              }}
                              onDragLeave={(event) => {
                                if (event.currentTarget.contains(event.relatedTarget as Node | null)) return
                                setDropIndicator((current) =>
                                  current?.visitCode === visit.visitCode && current.schemaId === schema.id ? null : current,
                                )
                              }}
                              onDrop={(event) => {
                                event.preventDefault()
                                event.stopPropagation()
                                if (draggingForm?.visitCode !== visit.visitCode) return
                                const position = dropIndicator?.schemaId === schema.id ? dropIndicator.position : "before"
                                moveFormWithinVisit(visit.visitCode, draggingForm.schemaId, schema.id, position)
                                setDraggingForm(null)
                                setDropIndicator(null)
                              }}
                              onDragEnd={() => {
                                setDraggingForm(null)
                                setDropIndicator(null)
                              }}
                            />
                          )
                        })}

                        <FormPicker
                          forms={availableForms}
                          onAdd={(schemaId) => addFormToVisit(visit.visitCode, schemaId)}
                        />

                        {selectedForms.length === 0 ? (
                          <span className="text-sm text-slate-400">还没有添加表格</span>
                        ) : null}
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>

            {saveState === "saved" ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                当前修改已保存，填报任务会按新配置生成
              </div>
            ) : null}
            {saveState === "error" ? (
              <div className="mt-4 text-sm text-rose-600">
                保存失败，请检查网络或接口状态后重试
              </div>
            ) : null}
          </CardContent>
        </Card>
      </main>

      <aside className="space-y-4 xl:sticky xl:top-[108px] xl:h-[calc(100vh-124px)] xl:overflow-y-auto">
        <Card>
          <CardHeader className="border-b bg-white/80">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <LibraryBig className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>范式库</CardTitle>
                <div className="mt-1 text-sm text-slate-500">范式模板 / 范式配置模板</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-md border border-dashed bg-slate-50 px-4 py-8 text-center">
              <div className="text-sm font-medium text-slate-700">暂未启用</div>
              <div className="mt-2 text-sm leading-6 text-slate-500">
                后续可以从这里选择已经配置好的访视计划模板，并整体应用到当前项目。
              </div>
            </div>
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function FormPicker({
  forms,
  onAdd,
}: {
  forms: CrfSchema[]
  onAdd: (schemaId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const [keyword, setKeyword] = useState("")
  const filteredForms = forms.filter((form) => {
    const value = `${form.name} ${form.code}`.toLowerCase()
    return value.includes(keyword.trim().toLowerCase())
  })

  const addForm = (schemaId: string) => {
    onAdd(schemaId)
    setOpen(false)
    setKeyword("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) setKeyword("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-9 rounded-full border-dashed bg-white px-3 text-primary hover:text-primary"
          onClick={(event) => event.stopPropagation()}
        >
          <Plus className="mr-2 h-4 w-4" />
          添加表格
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" onClick={(event) => event.stopPropagation()}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              autoFocus
              className="h-10 pl-9"
              placeholder="搜索原子表格"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </div>

          <div className="mt-3 max-h-60 overflow-y-auto">
            {filteredForms.map((form) => (
              <button
                key={form.id}
                type="button"
                className="flex w-full items-start gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-slate-50"
                onClick={() => addForm(form.id)}
              >
                <Layers3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-slate-800">{form.name}</span>
                  <span className="mt-0.5 block truncate text-xs text-slate-400">
                    {form.code} · v{form.version}
                  </span>
                </span>
              </button>
            ))}

            {filteredForms.length === 0 ? (
              <div className="rounded-md bg-slate-50 px-3 py-5 text-center text-sm text-slate-500">
                没有匹配的原子表格
              </div>
            ) : null}
          </div>

          <div className="mt-3 border-t pt-3">
            <Button asChild variant="outline" className="w-full rounded-full">
              <Link to="/crf/forms/$schemaId" params={{ schemaId: "new" }}>
                <Plus className="mr-2 h-4 w-4" />
                添加表格
              </Link>
            </Button>
          </div>
      </PopoverContent>
    </Popover>
  )
}

function SaveStateIndicator({
  state,
  onRetry,
}: {
  state: "idle" | "saving" | "saved" | "error"
  onRetry: () => void
}) {
  if (state === "saving") {
    return <div className="text-sm text-slate-500">保存中...</div>
  }

  if (state === "error") {
    return (
      <Button type="button" variant="outline" className="rounded-full text-rose-600" onClick={onRetry}>
        保存失败，重试
      </Button>
    )
  }

  if (state === "saved") {
    return <div className="text-sm text-emerald-600">已自动保存</div>
  }

  return <div className="text-sm text-slate-400">自动保存</div>
}

function FormModuleCard({
  schema,
  index,
  expanded,
  dragging,
  dropPosition,
  onToggle,
  onRemove,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
}: {
  schema: CrfSchema
  index: number
  expanded: boolean
  dragging: boolean
  dropPosition: "before" | "after" | null
  onToggle: () => void
  onRemove: () => void
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDragLeave: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
}) {
  const fields = flattenCrfFields(schema.nodes)
  const previewFields = fields.slice(0, 8)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className={cn(
        "relative rounded-md border bg-white transition-colors",
        dragging && "border-primary bg-primary/5 opacity-70",
      )}
    >
      {dropPosition === "before" ? <DropLine position="top" /> : null}
      {dropPosition === "after" ? <DropLine position="bottom" /> : null}
      <div className="flex items-center gap-3 px-3 py-2.5">
        <div
          className="flex cursor-grab items-center gap-2 text-slate-400 active:cursor-grabbing"
          title="拖拽排序"
        >
          <GripVertical className="h-4 w-4" />
          <span className="w-6 text-center text-xs font-semibold text-slate-500">{index + 1}</span>
        </div>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
          title={expanded ? "收起表单预览" : "展开表单预览"}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Layers3 className="h-4 w-4" />
        </div>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={(event) => {
            event.stopPropagation()
            onToggle()
          }}
        >
          <div className="truncate text-sm font-semibold text-slate-800">{schema.name}</div>
          <div className="mt-0.5 text-xs text-slate-500">
            {schema.code} · v{schema.version} · {fields.length} 个字段
          </div>
        </button>
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-rose-50 hover:text-rose-500"
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          title="移除表单"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {expanded ? (
        <div className="border-t bg-slate-50/70 px-4 py-3">
          <div className="overflow-hidden rounded-md border bg-white">
            <div className="grid grid-cols-[minmax(120px,1.1fr)_minmax(120px,1fr)_100px_72px] bg-slate-50 px-3 py-2 text-xs font-medium text-slate-500">
              <div>字段名称</div>
              <div>字段标识</div>
              <div>类型</div>
              <div>必填</div>
            </div>
            {previewFields.map((field) => (
              <div
                key={field.id}
                className="grid grid-cols-[minmax(120px,1.1fr)_minmax(120px,1fr)_100px_72px] border-t px-3 py-2 text-xs text-slate-600"
              >
                <div className="truncate font-medium text-slate-700">{field.label}</div>
                <div className="truncate text-slate-500">{field.key}</div>
                <div>{fieldTypeLabels[field.type]}</div>
                <div>{field.required ? "是" : "否"}</div>
              </div>
            ))}
          </div>
          {fields.length > previewFields.length ? (
            <div className="mt-2 text-xs text-slate-400">
              还有 {fields.length - previewFields.length} 个字段未展示
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

function DropLine({ position }: { position: "top" | "bottom" }) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute left-3 right-3 z-20 h-0.5 rounded-full bg-primary",
        position === "top" ? "-top-1" : "-bottom-1",
      )}
    >
      <span className="absolute -left-1 -top-1.5 h-3 w-3 rounded-full border-2 border-primary bg-white" />
    </div>
  )
}

const fieldTypeLabels: Record<CrfFieldType, string> = {
  text: "文本",
  long_text: "长文本",
  integer: "整数",
  decimal: "小数",
  date: "日期",
  datetime: "日期时间",
  boolean: "布尔",
  single_select: "单选",
  multi_select: "多选",
  file: "文件",
  computed: "计算",
  detail_table: "明细",
}

function createVisitDraft(visits: VisitDraft[], insertIndex: number): VisitDraft {
  const nextNumber = getNextVisitNumber(visits)
  const previous = visits[insertIndex - 1]?.sortKey
  const following = visits[insertIndex]?.sortKey
  return {
    visitCode: `V${nextNumber}`,
    title: `第 ${nextNumber} 次访视`,
    sortOrder: visits.length,
    sortKey: sortKeyBetween(previous, following),
    forms: [],
  }
}

function getFormKey(visitCode: string, schemaId: string) {
  return `${visitCode}:${schemaId}`
}

function setLightweightDragImage(event: DragEvent<HTMLElement>, title: string) {
  const preview = document.createElement("div")
  preview.textContent = title
  preview.style.position = "fixed"
  preview.style.top = "-1000px"
  preview.style.left = "-1000px"
  preview.style.maxWidth = "220px"
  preview.style.padding = "8px 12px"
  preview.style.border = "1px solid rgb(20 184 166)"
  preview.style.borderRadius = "8px"
  preview.style.background = "white"
  preview.style.boxShadow = "0 10px 24px rgba(15, 23, 42, 0.16)"
  preview.style.color = "rgb(15 23 42)"
  preview.style.font = "600 13px system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
  preview.style.whiteSpace = "nowrap"
  preview.style.overflow = "hidden"
  preview.style.textOverflow = "ellipsis"
  document.body.appendChild(preview)
  event.dataTransfer.setDragImage(preview, 16, 16)
  window.setTimeout(() => preview.remove(), 0)
}

function getNextVisitNumber(visits: VisitDraft[]) {
  const usedNumbers = visits
    .map((visit) => /^V(\d+)$/i.exec(visit.visitCode.trim())?.[1])
    .filter(Boolean)
    .map(Number)

  if (usedNumbers.length === 0) return visits.length
  return Math.max(...usedNumbers) + 1
}
