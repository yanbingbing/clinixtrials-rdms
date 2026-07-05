import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import { ArrowDown, ArrowLeft, ArrowUp, GripVertical, Plus, Save, Send, Table2, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  useCrfSchemasQuery,
  usePublishCrfSchemaMutation,
  useSaveCrfSchemaMutation,
} from "@/hooks/useApiData"
import {
  createFieldNode,
  crfFieldTypes,
  flattenCrfFields,
  type CrfFieldNode,
  type CrfFieldType,
  type CrfNode,
  type CrfOption,
  type CrfSchema,
  type CrfSectionNode,
} from "@/lib/crf"
import { cn } from "@/lib/utils"

const fieldTypeLabels: Record<CrfFieldType, string> = {
  text: "短文本",
  long_text: "长文本",
  integer: "整数",
  decimal: "小数",
  date: "日期",
  datetime: "日期时间",
  boolean: "布尔",
  single_select: "单选",
  multi_select: "多选",
  file: "文件",
  computed: "计算字段",
  detail_table: "明细表格",
}

function createDraftSchema(index: number): CrfSchema {
  return {
    schemaVersion: "1.0",
    id: crypto.randomUUID(),
    projectId: "ON101",
    code: `atom_${index}`,
    name: "新原子表格",
    version: 1,
    status: "draft",
    category: "atomic",
    nodes: [
      {
        kind: "section",
        id: crypto.randomUUID(),
        title: "默认分组",
        children: [createFieldNode({ key: "field_1", label: "新字段", type: "text" })],
      },
    ],
  }
}

export function CrfDesignerPage() {
  const params = useParams({ from: "/crf/forms/$schemaId" })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const schemasQuery = useCrfSchemasQuery("ON101")
  const saveSchemaMutation = useSaveCrfSchemaMutation()
  const publishMutation = usePublishCrfSchemaMutation()
  const [schema, setSchema] = useState<CrfSchema>(() => createDraftSchema(1))
  const [selectedFieldId, setSelectedFieldId] = useState("")
  const [draggingFieldId, setDraggingFieldId] = useState("")

  const schemas = schemasQuery.data ?? []
  const fields = useMemo(() => flattenCrfFields(schema.nodes), [schema.nodes])
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0]
  const isNew = params.schemaId === "new"

  useEffect(() => {
    if (isNew) {
      const draft = createDraftSchema(schemas.length + 1)
      setSchema(draft)
      setSelectedFieldId(flattenCrfFields(draft.nodes)[0]?.id ?? "")
      return
    }

    const selected = schemas.find((item) => item.id === params.schemaId)
    if (!selected) return
    const loaded = structuredClone(selected)
    setSchema({ ...loaded, category: "atomic" })
    setSelectedFieldId(flattenCrfFields(loaded.nodes)[0]?.id ?? "")
  }, [isNew, params.schemaId, schemas])

  const updateSchemaMeta = (patch: Partial<Pick<CrfSchema, "code" | "name" | "version">>) => {
    setSchema((current) => ({ ...current, ...patch, category: "atomic", status: "draft" }))
  }

  const updateSelectedField = (patch: Partial<CrfFieldNode>) => {
    if (!selectedField) return
    setSchema((current) => ({
      ...current,
      status: "draft",
      nodes: updateFieldInNodes(current.nodes, selectedField.id, patch),
    }))
  }

  const addField = (type: CrfFieldType = "text") => {
    const newField = createFieldNode({
      label: type === "detail_table" ? "明细字段" : "新字段",
      key: type === "detail_table" ? `detail_${fields.length + 1}` : `field_${fields.length + 1}`,
      type,
      detail: type === "detail_table" ? { displayMode: "inline_table" } : undefined,
      table: { width: type === "detail_table" ? 220 : 160 },
    })
    setSchema((current) => ({ ...current, status: "draft", nodes: appendFieldToFirstSection(current.nodes, newField) }))
    setSelectedFieldId(newField.id)
  }

  const deleteSelectedField = () => {
    if (!selectedField || fields.length <= 1) return
    const nextFields = fields.filter((field) => field.id !== selectedField.id)
    setSchema((current) => ({ ...current, status: "draft", nodes: removeFieldFromNodes(current.nodes, selectedField.id) }))
    setSelectedFieldId(nextFields[0]?.id ?? "")
  }

  const saveSchema = async () => {
    const saved = await saveSchemaMutation.mutateAsync({ ...schema, category: "atomic", status: "draft" })
    setSchema(saved)
    await queryClient.invalidateQueries({ queryKey: ["crf-schemas"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks"] })
    if (isNew) {
      await navigate({ to: "/crf/forms/$schemaId", params: { schemaId: saved.id } })
    }
  }

  const publishSchema = async () => {
    const published = await publishMutation.mutateAsync(schema.id)
    setSchema(published)
    await queryClient.invalidateQueries({ queryKey: ["crf-schemas"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks"] })
  }

  return (
    <div className="grid min-h-[calc(100vh-124px)] gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
      <main className="min-w-0">
        <Card className="min-h-full">
          <CardHeader className="border-b bg-white/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-3">
                  <Button asChild variant="ghost" size="sm" className="rounded-full px-2 text-slate-500">
                    <Link to="/crf/forms">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      返回表格库
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_120px]">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">表格名称</span>
                    <Input
                      className="h-11 text-lg font-semibold"
                      value={schema.name}
                      onChange={(event) => updateSchemaMeta({ name: event.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">表格编码</span>
                    <Input value={schema.code} onChange={(event) => updateSchemaMeta({ code: normalizeKey(event.target.value) })} />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">版本</span>
                    <Input type="number" min={1} value={schema.version} onChange={(event) => updateSchemaMeta({ version: Number(event.target.value) || 1 })} />
                  </label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge className={schema.status === "published" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}>
                  {schema.status === "published" ? "已发布" : "草稿"}
                </Badge>
                <Button variant="outline" className="rounded-full" onClick={saveSchema} disabled={saveSchemaMutation.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  保存
                </Button>
                <Button className="rounded-full" onClick={publishSchema} disabled={publishMutation.isPending || isNew || schema.status === "published"}>
                  <Send className="mr-2 h-4 w-4" />
                  发布
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle>字段结构</CardTitle>
                <div className="mt-2 text-sm text-slate-500">点击字段后在右侧配置面板编辑属性</div>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="rounded-full" onClick={() => addField("detail_table")}>
                  <Table2 className="mr-2 h-4 w-4" />
                  明细字段
                </Button>
                <Button size="sm" className="rounded-full" onClick={() => addField("text")}>
                  <Plus className="mr-2 h-4 w-4" />
                  添加字段
                </Button>
              </div>
            </div>

            <div className="rounded-md border bg-slate-50 p-3">
              <div className="space-y-2">
                {fields.map((field, index) => (
                  <button
                    key={field.id}
                    type="button"
                    draggable
                    onDragStart={() => setDraggingFieldId(field.id)}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={() => {
                      setSchema((current) => ({ ...current, status: "draft", nodes: moveFieldBeforeInFirstSection(current.nodes, draggingFieldId, field.id) }))
                      setDraggingFieldId("")
                    }}
                    onClick={() => setSelectedFieldId(field.id)}
                    className={cn(
                      "grid w-full grid-cols-[24px_1fr_88px_32px_32px] items-center gap-3 rounded-md border bg-white px-4 py-3 text-left text-sm shadow-sm transition-colors",
                      selectedField?.id === field.id && "border-primary bg-primary/8 ring-1 ring-primary/20",
                    )}
                  >
                    <GripVertical className="h-4 w-4 text-slate-400" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-slate-700">
                        {field.label}{field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                      </span>
                      <span className="text-xs text-slate-400">{field.key}{field.unit ? ` · ${field.unit}` : ""}</span>
                    </span>
                    <Badge className={field.type === "detail_table" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600"}>
                      {fieldTypeLabels[field.type]}
                    </Badge>
                    <span className="inline-flex h-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100" onClick={(event) => {
                      event.stopPropagation()
                      setSchema((current) => ({ ...current, status: "draft", nodes: reorderFieldInFirstSection(current.nodes, field.id, -1) }))
                    }}>
                      <ArrowUp className={cn("h-4 w-4", index === 0 && "opacity-25")} />
                    </span>
                    <span className="inline-flex h-8 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100" onClick={(event) => {
                      event.stopPropagation()
                      setSchema((current) => ({ ...current, status: "draft", nodes: reorderFieldInFirstSection(current.nodes, field.id, 1) }))
                    }}>
                      <ArrowDown className={cn("h-4 w-4", index === fields.length - 1 && "opacity-25")} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <aside className="xl:sticky xl:top-[108px] xl:h-[calc(100vh-124px)]">
        <Card className="h-full">
          <CardHeader className="border-b bg-white/80">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>字段配置</CardTitle>
                <div className="mt-2 text-sm text-slate-500">{selectedField?.label ?? "未选择字段"}</div>
              </div>
              <Button variant="outline" size="icon" className="rounded-full" onClick={deleteSelectedField} disabled={fields.length <= 1} title="删除字段">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="h-[calc(100%-86px)] overflow-y-auto pt-5">
            {selectedField ? (
              <FieldEditor field={selectedField} schemas={schemas} currentSchemaId={schema.id} onChange={updateSelectedField} />
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">请选择字段</div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function FieldEditor({
  field,
  schemas,
  currentSchemaId,
  onChange,
}: {
  field: CrfFieldNode
  schemas: CrfSchema[]
  currentSchemaId: string
  onChange: (patch: Partial<CrfFieldNode>) => void
}) {
  const optionsText = useMemo(() => optionsToText(field.options), [field.options])
  const childSchemas = schemas.filter((item) => item.id !== currentSchemaId)

  return (
    <div className="space-y-4">
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段名称</span>
        <Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段 Key</span>
        <Input value={field.key} onChange={(event) => onChange({ key: normalizeKey(event.target.value) })} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段类型</span>
        <Select
          value={field.type}
          onValueChange={(value) => {
            const nextType = value as CrfFieldType
            onChange({
              type: nextType,
              detail: nextType === "detail_table" ? { displayMode: "inline_table", ...field.detail } : field.detail,
            })
          }}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {crfFieldTypes.map((type) => <SelectItem key={type} value={type}>{fieldTypeLabels[type]}</SelectItem>)}
          </SelectContent>
        </Select>
      </label>

      {field.type === "detail_table" ? (
        <div className="rounded-md border bg-cyan-50/60 p-3">
          <div className="mb-3 text-sm font-semibold text-cyan-800">明细表格</div>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">关联子表格</span>
            <Select
              value={field.detail?.targetSchemaId ?? "__none"}
              onValueChange={(value) => {
                const target = childSchemas.find((item) => item.id === value)
                onChange({
                  detail: {
                    ...field.detail,
                    targetSchemaId: value === "__none" ? undefined : value,
                    targetSchemaCode: target?.code,
                    displayMode: field.detail?.displayMode ?? "inline_table",
                  },
                })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">未选择</SelectItem>
                {childSchemas.map((item) => (
                  <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-600">最少行</span>
              <Input
                type="number"
                value={field.detail?.minRows ?? ""}
                onChange={(event) => onChange({ detail: { ...field.detail, minRows: event.target.value === "" ? undefined : Number(event.target.value) } })}
              />
            </label>
            <label className="space-y-2 text-sm">
              <span className="font-medium text-slate-600">最多行</span>
              <Input
                type="number"
                value={field.detail?.maxRows ?? ""}
                onChange={(event) => onChange({ detail: { ...field.detail, maxRows: event.target.value === "" ? undefined : Number(event.target.value) } })}
              />
            </label>
          </div>
          <div className="mt-3 text-xs leading-5 text-slate-500">
            明细字段表示一组可重复子记录，不是 Lookup。
          </div>
        </div>
      ) : null}

      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">单位</span>
        <Input value={field.unit ?? ""} onChange={(event) => onChange({ unit: event.target.value || undefined })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最小值</span>
          <Input type="number" value={field.validation?.min ?? ""} onChange={(event) => onChange({ validation: { ...field.validation, min: event.target.value === "" ? undefined : Number(event.target.value) } })} />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最大值</span>
          <Input type="number" value={field.validation?.max ?? ""} onChange={(event) => onChange({ validation: { ...field.validation, max: event.target.value === "" ? undefined : Number(event.target.value) } })} />
        </label>
      </div>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">列宽</span>
        <Input type="number" value={field.table?.width ?? 160} onChange={(event) => onChange({ table: { ...field.table, width: Number(event.target.value) || 160 } })} />
      </label>
      <div className="grid grid-cols-3 gap-3 rounded-md border bg-white p-3">
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={field.required ?? false} onCheckedChange={(checked) => onChange({ required: checked === true })} />
          必填
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={field.table?.sortable ?? true} onCheckedChange={(checked) => onChange({ table: { ...field.table, sortable: checked === true } })} />
          排序
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <Checkbox checked={field.table?.editable ?? true} onCheckedChange={(checked) => onChange({ table: { ...field.table, editable: checked === true } })} />
          可编辑
        </label>
      </div>
      {field.type === "single_select" || field.type === "multi_select" ? (
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">选项</span>
          <textarea
            className="min-h-28 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={optionsText}
            onChange={(event) => onChange({ options: textToOptions(event.target.value) })}
          />
        </label>
      ) : null}
    </div>
  )
}

function normalizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "")
}

function optionsToText(options?: CrfOption[]) {
  return options?.map((option) => `${option.label}=${option.value}`).join("\n") ?? ""
}

function textToOptions(value: string): CrfOption[] {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, optionValue] = line.split("=")
      return { label: label.trim(), value: (optionValue ?? label).trim() }
    })
}

function updateFieldInNodes(nodes: CrfNode[], fieldId: string, patch: Partial<CrfFieldNode>): CrfNode[] {
  return nodes.map((node) => {
    if (node.kind === "field") return node.id === fieldId ? { ...node, ...patch } : node
    return { ...node, children: updateFieldInNodes(node.children, fieldId, patch) }
  })
}

function appendFieldToFirstSection(nodes: CrfNode[], field: CrfFieldNode): CrfNode[] {
  if (nodes[0]?.kind === "section") {
    const [first, ...rest] = nodes
    return [{ ...first, children: [...first.children, field] }, ...rest]
  }
  const section: CrfSectionNode = { kind: "section", id: crypto.randomUUID(), title: "默认分组", children: [field] }
  return [section, ...nodes]
}

function removeFieldFromNodes(nodes: CrfNode[], fieldId: string): CrfNode[] {
  return nodes
    .map((node) => (node.kind === "field" ? node : { ...node, children: removeFieldFromNodes(node.children, fieldId) }))
    .filter((node) => node.kind !== "field" || node.id !== fieldId)
}

function reorderFieldInFirstSection(nodes: CrfNode[], fieldId: string, direction: -1 | 1): CrfNode[] {
  if (nodes[0]?.kind !== "section") return nodes
  const [first, ...rest] = nodes
  const index = first.children.findIndex((node) => node.kind === "field" && node.id === fieldId)
  const nextIndex = index + direction
  if (index < 0 || nextIndex < 0 || nextIndex >= first.children.length) return nodes
  const children = [...first.children]
  const [moved] = children.splice(index, 1)
  children.splice(nextIndex, 0, moved)
  return [{ ...first, children }, ...rest]
}

function moveFieldBeforeInFirstSection(nodes: CrfNode[], sourceFieldId: string, targetFieldId: string): CrfNode[] {
  if (!sourceFieldId || nodes[0]?.kind !== "section") return nodes
  const [first, ...rest] = nodes
  const children = [...first.children]
  const sourceIndex = children.findIndex((node) => node.kind === "field" && node.id === sourceFieldId)
  const targetIndex = children.findIndex((node) => node.kind === "field" && node.id === targetFieldId)
  if (sourceIndex < 0 || targetIndex < 0) return nodes
  const [moved] = children.splice(sourceIndex, 1)
  children.splice(sourceIndex < targetIndex ? targetIndex - 1 : targetIndex, 0, moved)
  return [{ ...first, children }, ...rest]
}
