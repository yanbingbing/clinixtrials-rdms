import { useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useParams } from "@tanstack/react-router"
import {
  AlertTriangle,
  ArrowLeft,
  Eye,
  ListTree,
  Plus,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Trash2,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { CrfFieldInput } from "@/components/crf/CrfFieldInput"
import { FieldConfigPanel, normalizeKey } from "@/components/crf/FieldConfigPanel"
import { FieldGridList } from "@/components/crf/FieldGridList"
import {
  useCrfSchemasQuery,
  usePublishCrfSchemaMutation,
  useSaveCrfSchemaMutation,
} from "@/hooks/useApiData"
import { validateExpression } from "@/lib/crf-expression"
import {
  applyFieldDrop,
  createEmptyValues,
  createFieldNode,
  crfCreatableFieldTypes,
  crfFieldTypeLabels,
  flattenCrfFields,
  isFieldVisible,
  resolveComputedValues,
  validateSchemaValues,
  type CrfFieldNode,
  type CrfFieldType,
  type CrfNode,
  type CrfSchema,
  type CrfSectionNode,
} from "@/lib/crf"
import { cn } from "@/lib/utils"

function createDraftSchema(index: number): CrfSchema {
  return {
    schemaVersion: "1.0",
    id: crypto.randomUUID(),
    projectId: "ON101",
    code: `form_${index}`,
    name: "新模块",
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
  const params = useParams({ from: "/app/crf/forms/$schemaId" })
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const schemasQuery = useCrfSchemasQuery("ON101")
  const saveSchemaMutation = useSaveCrfSchemaMutation()
  const publishMutation = usePublishCrfSchemaMutation()
  const [schema, setSchema] = useState<CrfSchema>(() => createDraftSchema(1))
  const [selectedFieldId, setSelectedFieldId] = useState("")
  const [mode, setMode] = useState<"edit" | "preview">("edit")

  const schemas = schemasQuery.data ?? []
  const fields = useMemo(() => flattenCrfFields(schema.nodes), [schema.nodes])
  const selectedField = fields.find((field) => field.id === selectedFieldId) ?? fields[0]
  const isNew = params.schemaId === "new"
  const issues = useMemo(() => collectSchemaIssues(schema), [schema])

  // 每个路由参数只初始化一次，避免列表刷新（窗口聚焦重拉等）把正在编辑的内容重置掉
  const loadedSchemaIdRef = useRef("")

  useEffect(() => {
    if (isNew) {
      if (loadedSchemaIdRef.current === "new") return
      loadedSchemaIdRef.current = "new"
      const draft = createDraftSchema((schemasQuery.data?.length ?? 0) + 1)
      setSchema(draft)
      setSelectedFieldId(flattenCrfFields(draft.nodes)[0]?.id ?? "")
      return
    }

    if (loadedSchemaIdRef.current === params.schemaId) return
    const selected = schemasQuery.data?.find((item) => item.id === params.schemaId)
    if (!selected) return
    loadedSchemaIdRef.current = params.schemaId
    const loaded = structuredClone(selected)
    setSchema({ ...loaded, category: "atomic" })
    setSelectedFieldId(flattenCrfFields(loaded.nodes)[0]?.id ?? "")
  }, [isNew, params.schemaId, schemasQuery.data])

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

  const addField = (type: CrfFieldType) => {
    const existingKeys = new Set(fields.map((field) => field.key))
    let index = fields.length + 1
    while (existingKeys.has(`field_${index}`)) index += 1

    const newField = createFieldNode({
      label: `新${crfFieldTypeLabels[type]}字段`,
      key: `field_${index}`,
      type,
      options:
        type === "single_select" || type === "multi_select"
          ? [
              { label: "选项 1", value: "1" },
              { label: "选项 2", value: "2" },
            ]
          : undefined,
      compute: type === "computed" ? { expression: "" } : undefined,
      detail:
        type === "detail_table"
          ? { fields: [createFieldNode({ key: "col_1", label: "子字段 1", type: "text", table: { width: 140 } })] }
          : undefined,
      table: { width: type === "detail_table" ? 220 : 160 },
    })
    setSchema((current) => ({ ...current, status: "draft", nodes: appendFieldToFirstSection(current.nodes, newField) }))
    setSelectedFieldId(newField.id)
    setMode("edit")
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
    if (issues.length > 0) return
    const published = await publishMutation.mutateAsync(schema.id)
    setSchema(published)
    await queryClient.invalidateQueries({ queryKey: ["crf-schemas"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-visit-plan"] })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks"] })
  }

  return (
    <div className="grid min-h-[calc(100vh-124px)] gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
      <main className="min-w-0">
        <Card className="min-h-full">
          <CardHeader className="border-b bg-white/80">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="mb-3">
                  <Button asChild variant="ghost" size="sm" className="rounded-full px-2 text-slate-500">
                    <Link to="/crf/forms">
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      返回模块库
                    </Link>
                  </Button>
                </div>
                <div className="grid gap-3 lg:grid-cols-[minmax(260px,1fr)_220px_120px]">
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">模块名称</span>
                    <Input
                      className="h-11 text-lg font-semibold"
                      value={schema.name}
                      onChange={(event) => updateSchemaMeta({ name: event.target.value })}
                    />
                  </label>
                  <label className="space-y-2 text-sm">
                    <span className="font-medium text-slate-600">模块编码</span>
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
                <Button
                  className="rounded-full"
                  onClick={publishSchema}
                  disabled={publishMutation.isPending || isNew || schema.status === "published" || issues.length > 0}
                  title={issues.length > 0 ? "请先解决配置问题" : undefined}
                >
                  <Send className="mr-2 h-4 w-4" />
                  发布
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {issues.length > 0 ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  发布前需要解决 {issues.length} 个配置问题
                </div>
                <ul className="mt-2 list-inside list-disc space-y-1 text-xs text-amber-700">
                  {issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1 rounded-full border bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors",
                    mode === "edit" ? "bg-white font-medium text-slate-800 shadow-sm" : "text-slate-500",
                  )}
                >
                  <ListTree className="h-4 w-4" />
                  字段结构
                </button>
                <button
                  type="button"
                  onClick={() => setMode("preview")}
                  className={cn(
                    "flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors",
                    mode === "preview" ? "bg-white font-medium text-slate-800 shadow-sm" : "text-slate-500",
                  )}
                >
                  <Eye className="h-4 w-4" />
                  预览表单
                </button>
              </div>
              <AddFieldButton onAdd={addField} />
            </div>

            {mode === "edit" ? (
              <div className="rounded-md border bg-slate-50 p-3">
                <div className="mb-2 text-xs text-slate-400">
                  拖到字段上/下方调整顺序；拖到字段左/右边缘可两个字段并排一行
                </div>
                <FieldGridList
                  fields={fields}
                  selectedFieldId={selectedField?.id}
                  onSelect={setSelectedFieldId}
                  onDrop={(sourceId, targetId, zone) => {
                    setSchema((current) => ({
                      ...current,
                      status: "draft",
                      nodes: applyFieldDrop(current.nodes, sourceId, targetId, zone),
                    }))
                  }}
                  onReorder={(fieldId, direction) => {
                    setSchema((current) => ({ ...current, status: "draft", nodes: reorderFieldInFirstSection(current.nodes, fieldId, direction) }))
                  }}
                />
              </div>
            ) : (
              <SchemaPreview schema={schema} />
            )}
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
              <FieldConfigPanel field={selectedField} scopeFields={fields} onChange={updateSelectedField} />
            ) : (
              <div className="rounded-md border border-dashed p-8 text-center text-sm text-slate-500">请选择字段</div>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  )
}

function AddFieldButton({ onAdd }: { onAdd: (type: CrfFieldType) => void }) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button size="sm" className="rounded-full">
          <Plus className="mr-2 h-4 w-4" />
          添加字段
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="end">
        <div className="mb-2 text-xs font-medium text-slate-500">选择字段类型</div>
        <div className="grid grid-cols-3 gap-1.5">
          {crfCreatableFieldTypes.map((type) => (
            <button
              key={type}
              type="button"
              className={cn(
                "rounded-md border px-2 py-2 text-sm text-slate-600 transition-colors hover:border-primary/40 hover:bg-primary/5",
                type === "detail_table" && "text-cyan-700",
                type === "computed" && "text-violet-700",
              )}
              onClick={() => {
                onAdd(type)
                setOpen(false)
              }}
            >
              {crfFieldTypeLabels[type]}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

/** 设计器内的实时预览：可以直接试填，公式和联动即时生效 */
function SchemaPreview({ schema }: { schema: CrfSchema }) {
  const [values, setValues] = useState<Record<string, unknown>>(() => createEmptyValues(schema))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState(false)

  const displayValues = useMemo(() => resolveComputedValues(schema, values), [schema, values])
  const visibleFields = useMemo(
    () => flattenCrfFields(schema.nodes).filter((field) => isFieldVisible(field, displayValues)),
    [schema.nodes, displayValues],
  )

  const runValidation = () => {
    setErrors(validateSchemaValues(schema, displayValues))
    setChecked(true)
  }

  const reset = () => {
    setValues(createEmptyValues(schema))
    setErrors({})
    setChecked(false)
  }

  const errorCount = Object.keys(errors).length

  return (
    <div className="rounded-md border bg-slate-50 p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-slate-500">试填表单验证配置效果；公式、联动、校验都会即时生效</div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={reset}>
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            清空
          </Button>
          <Button type="button" size="sm" className="rounded-full" onClick={runValidation}>
            <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
            模拟提交校验
          </Button>
        </div>
      </div>
      {checked ? (
        errorCount > 0 ? (
          <div className="mb-4 rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm text-rose-700">
            共 {errorCount} 处未通过校验
          </div>
        ) : (
          <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
            全部校验通过
          </div>
        )
      ) : null}
      <div className="crf-grid">
        {visibleFields.map((field) => (
          <CrfFieldInput
            key={field.id}
            field={field}
            value={displayValues[field.key]}
            error={checked ? errors[field.key] : undefined}
            errors={checked ? errors : undefined}
            onChange={(nextValue) => {
              setValues((current) => {
                const next = { ...current, [field.key]: nextValue }
                if (checked) setErrors(validateSchemaValues(schema, resolveComputedValues(schema, next)))
                return next
              })
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** 发布前的 schema 完整性检查 */
function collectSchemaIssues(schema: CrfSchema): string[] {
  const issues: string[] = []
  const fields = flattenCrfFields(schema.nodes)

  const checkScope = (scopeFields: CrfFieldNode[], scopeName: string) => {
    const seenKeys = new Map<string, number>()
    for (const field of scopeFields) {
      seenKeys.set(field.key, (seenKeys.get(field.key) ?? 0) + 1)
    }
    for (const [key, count] of seenKeys) {
      if (count > 1) issues.push(`${scopeName}存在重复的字段 Key「${key}」`)
    }

    for (const field of scopeFields) {
      const name = `${scopeName}字段「${field.label || field.key}」`
      if (!field.label.trim()) issues.push(`${scopeName}存在未命名字段（${field.key}）`)
      if (!field.key.trim()) issues.push(`${name}缺少 Key`)
      if ((field.type === "single_select" || field.type === "multi_select") && !(field.options?.length)) {
        issues.push(`${name}还没有配置选项`)
      }
      if (field.type === "computed") {
        const availableKeys = scopeFields.filter((item) => item.id !== field.id).map((item) => item.key)
        const error = validateExpression(field.compute?.expression ?? "", availableKeys)
        if (error) issues.push(`${name}的公式无效：${error}`)
      }
      if (field.visibility?.field && !scopeFields.some((item) => item.key === field.visibility?.field)) {
        issues.push(`${name}的联动依赖字段「${field.visibility.field}」不存在`)
      }
    }
  }

  checkScope(fields, "")

  for (const field of fields) {
    if (field.type !== "detail_table") continue
    const subFields = field.detail?.fields ?? []
    if (subFields.length === 0) {
      issues.push(`子表「${field.label}」还没有子字段`)
      continue
    }
    checkScope(subFields, `子表「${field.label}」内`)
  }

  return issues
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

