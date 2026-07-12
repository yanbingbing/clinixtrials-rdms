import type { ColumnDef } from "@tanstack/react-table"

import { evaluateExpression } from "@/lib/crf-expression"

export const crfFieldTypes = [
  "text",
  "long_text",
  "integer",
  "decimal",
  "date",
  "datetime",
  "boolean",
  "single_select",
  "multi_select",
  "file",
  "computed",
  "detail_table",
] as const

export type CrfFieldType = (typeof crfFieldTypes)[number]

export const crfFieldTypeLabels: Record<CrfFieldType, string> = {
  text: "短文本",
  long_text: "长文本",
  integer: "数值",
  decimal: "数值",
  date: "日期",
  datetime: "日期时间",
  boolean: "是/否",
  single_select: "单选",
  multi_select: "多选",
  file: "文件",
  computed: "公式",
  detail_table: "子表",
}

/** 新建/切换字段时可选的类型：integer 仅作为旧数据兼容保留，统一用 decimal（数值） */
export const crfCreatableFieldTypes = crfFieldTypes.filter((type) => type !== "integer")

export interface CrfOption {
  label: string
  value: string
  color?: string
}

export interface CrfValidation {
  min?: number
  max?: number
  minLength?: number
  maxLength?: number
  pattern?: string
  precision?: number
  message?: string
}

export interface CrfVisibilityRule {
  field: string
  operator: "eq" | "neq" | "in" | "not_in" | "empty" | "not_empty"
  value?: unknown
}

export interface CrfTableSpec {
  width?: number
  minWidth?: number
  pinned?: "left" | "right"
  align?: "left" | "center" | "right"
  sortable?: boolean
  filterable?: boolean
  editable?: boolean
  hidden?: boolean
}

export interface CrfEditorSpec {
  placeholder?: string
  helpText?: string
  rows?: number
}

export interface CrfDetailTableSpec {
  fields: CrfFieldNode[]
  minRows?: number
  maxRows?: number
}

export interface CrfComputeSpec {
  expression: string
  precision?: number
}

export interface CrfFieldNode {
  kind: "field"
  id: string
  key: string
  label: string
  type: CrfFieldType
  required?: boolean
  unit?: string
  defaultValue?: unknown
  options?: CrfOption[]
  validation?: CrfValidation
  visibility?: CrfVisibilityRule
  detail?: CrfDetailTableSpec
  compute?: CrfComputeSpec
  table?: CrfTableSpec
  editor?: CrfEditorSpec
  /** 表单布局占宽，12 格制（12=整行、6=半行），缺省按 12 */
  span?: number
}

export interface CrfSectionNode {
  kind: "section"
  id: string
  title: string
  description?: string
  children: CrfNode[]
}

export type CrfNode = CrfSectionNode | CrfFieldNode

export interface CrfSchema {
  schemaVersion: "1.0"
  id: string
  projectId: string
  code: string
  name: string
  version: number
  status: "draft" | "published" | "archived"
  category?: "base" | "atomic"
  nodes: CrfNode[]
  createdAt?: string
  publishedAt?: string | null
}

export interface CrfRecord {
  id: string
  projectId: string
  subjectId: string
  subjectCode: string
  visitCode: string
  schemaId: string
  schemaVersion: number
  values: Record<string, unknown>
  status: "draft" | "submitted" | "locked"
  createdAt?: string
  updatedAt?: string
}

export interface CrfVisitForm {
  schemaId: string
  code: string
  name: string
  version: number
  required: boolean
  sortOrder: number
  sortKey: string
  schema: CrfSchema
}

export interface CrfVisitPlanItem {
  visitCode: string
  title: string
  sortOrder: number
  sortKey: string
  forms: CrfVisitForm[]
}

export interface CrfVisitPlanPayload {
  projectId: string
  visits: Array<{
    visitCode: string
    title: string
    sortOrder: number
    sortKey: string
    forms?: Array<{ schemaId: string; sortKey: string }>
    formSchemaIds?: string[]
  }>
}

export interface CrfEntryTask {
  id: string | null
  taskId: string
  projectId: string
  subjectId: string
  subjectCode: string
  visitCode: string
  visitTitle: string
  schemaId: string
  schemaVersion: number
  schema: CrfSchema
  values: Record<string, unknown>
  status: "draft" | "submitted" | "locked" | "not_started"
  sortOrder: number
}

export interface CrfRecordDraft {
  projectId: string
  subjectId: string
  visitCode: string
  schemaId: string
  schemaVersion: number
  values: Record<string, unknown>
  status?: "draft" | "submitted"
}

export function flattenCrfFields(nodes: CrfNode[]): CrfFieldNode[] {
  const fields: CrfFieldNode[] = []

  for (const node of nodes) {
    if (node.kind === "field") {
      fields.push(node)
      continue
    }
    fields.push(...flattenCrfFields(node.children))
  }

  return fields
}

export function crfSchemaToColumns(schema: CrfSchema): ColumnDef<CrfRecord>[] {
  return flattenCrfFields(schema.nodes)
    .filter((field) => !field.table?.hidden)
    .map((field) => ({
      id: field.key,
      accessorFn: (row) => row.values[field.key],
      header: field.label,
      size: field.table?.width,
      minSize: field.table?.minWidth,
      enableSorting: field.table?.sortable ?? true,
      enableColumnFilter: field.table?.filterable ?? true,
      meta: {
        crfField: field,
      },
    }))
}

export function createEmptyValues(schema: CrfSchema) {
  return Object.fromEntries(
    flattenCrfFields(schema.nodes)
      .filter((field) => field.type !== "computed")
      .map((field) => [field.key, field.defaultValue ?? getDefaultValue(field)]),
  )
}

export function getDefaultValue(field: CrfFieldNode): unknown {
  if (field.type === "multi_select") return []
  if (field.type === "detail_table") {
    const minRows = field.detail?.minRows ?? 0
    return Array.from({ length: minRows }, () => createEmptyDetailRow(field))
  }
  return ""
}

export function createEmptyDetailRow(field: CrfFieldNode): Record<string, unknown> {
  return Object.fromEntries(
    (field.detail?.fields ?? [])
      .filter((sub) => sub.type !== "computed")
      .map((sub) => [sub.key, sub.defaultValue ?? getDefaultValue(sub)]),
  )
}

export function isEmptyValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  return false
}

function visibilityValueEquals(target: unknown, expected: unknown): boolean {
  if (Array.isArray(target)) return target.some((item) => visibilityValueEquals(item, expected))
  if (typeof target === "boolean" || typeof expected === "boolean") {
    return String(target) === String(expected)
  }
  return String(target ?? "") === String(expected ?? "")
}

export function isFieldVisible(field: CrfFieldNode, values: Record<string, unknown>): boolean {
  const rule = field.visibility
  if (!rule || !rule.field) return true
  const target = values[rule.field]

  switch (rule.operator) {
    case "eq":
      return visibilityValueEquals(target, rule.value)
    case "neq":
      return !visibilityValueEquals(target, rule.value)
    case "in":
      return Array.isArray(rule.value) && rule.value.some((item) => visibilityValueEquals(target, item))
    case "not_in":
      return !(Array.isArray(rule.value) && rule.value.some((item) => visibilityValueEquals(target, item)))
    case "empty":
      return isEmptyValue(target)
    case "not_empty":
      return !isEmptyValue(target)
    default:
      return true
  }
}

export function validateFieldValue(field: CrfFieldNode, value: unknown): string | null {
  const rules = field.validation
  const empty = isEmptyValue(value)

  if (field.required && empty) return rules?.message ?? "必填"

  // 子表的行数约束要在空值提前返回之前检查：0 行也可能低于最少行数
  if (field.type === "detail_table") {
    const rows = Array.isArray(value) ? value.length : 0
    if (field.detail?.minRows !== undefined && rows < field.detail.minRows) return `至少填写 ${field.detail.minRows} 行`
    if (field.detail?.maxRows !== undefined && rows > field.detail.maxRows) return `最多填写 ${field.detail.maxRows} 行`
    return null
  }

  if (empty) return null

  if (field.type === "integer" || field.type === "decimal") {
    const num = Number(value)
    if (!Number.isFinite(num)) return "请输入数字"
    if (field.type === "integer" && !Number.isInteger(num)) return "请输入整数"
    if (rules?.min !== undefined && num < rules.min) return rules.message ?? `不能小于 ${rules.min}`
    if (rules?.max !== undefined && num > rules.max) return rules.message ?? `不能大于 ${rules.max}`
    if (field.type === "decimal" && rules?.precision !== undefined) {
      const decimals = String(value).split(".")[1]?.length ?? 0
      if (decimals > rules.precision) return `最多保留 ${rules.precision} 位小数`
    }
  }

  if (field.type === "text" || field.type === "long_text") {
    const text = String(value)
    if (rules?.minLength !== undefined && text.length < rules.minLength) return rules.message ?? `至少 ${rules.minLength} 个字符`
    if (rules?.maxLength !== undefined && text.length > rules.maxLength) return rules.message ?? `最多 ${rules.maxLength} 个字符`
    if (rules?.pattern) {
      try {
        if (!new RegExp(rules.pattern).test(text)) return rules.message ?? "格式不正确"
      } catch {
        // 无效正则不拦录入
      }
    }
  }

  return null
}

export function detailRowErrorKey(fieldKey: string, rowIndex: number, subKey: string) {
  return `${fieldKey}.${rowIndex}.${subKey}`
}

export function validateSchemaValues(schema: CrfSchema, values: Record<string, unknown>): Record<string, string> {
  const errors: Record<string, string> = {}

  for (const field of flattenCrfFields(schema.nodes)) {
    if (field.type === "computed") continue
    if (!isFieldVisible(field, values)) continue

    const value = values[field.key]
    const error = validateFieldValue(field, value)
    if (error) errors[field.key] = error

    if (field.type === "detail_table" && Array.isArray(value)) {
      value.forEach((row, rowIndex) => {
        const rowValues = (row ?? {}) as Record<string, unknown>
        for (const sub of field.detail?.fields ?? []) {
          if (sub.type === "computed") continue
          if (!isFieldVisible(sub, rowValues)) continue
          const subError = validateFieldValue(sub, rowValues[sub.key])
          if (subError) errors[detailRowErrorKey(field.key, rowIndex, sub.key)] = subError
        }
      })
    }
  }

  return errors
}

function roundTo(value: number, precision?: number) {
  if (precision === undefined) return value
  const factor = 10 ** precision
  return Math.round(value * factor) / factor
}

export function resolveComputedValues(schema: CrfSchema, values: Record<string, unknown>): Record<string, unknown> {
  const result = { ...values }

  for (const field of flattenCrfFields(schema.nodes)) {
    if (field.type !== "computed" || !field.compute?.expression) continue
    const computed = evaluateExpression(field.compute.expression, result)
    result[field.key] = computed === null ? "" : roundTo(computed, field.compute.precision)
  }

  return result
}

export function formatCrfValue(field: CrfFieldNode, value: unknown): string {
  if (field.type === "detail_table") {
    return Array.isArray(value) && value.length > 0 ? `${value.length} 条明细` : "未填写"
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "-"
    return value
      .map((item) => field.options?.find((option) => option.value === item)?.label ?? String(item))
      .join("、")
  }
  if (field.type === "boolean") {
    if (value === true) return "是"
    if (value === false) return "否"
    return "-"
  }
  if (field.options) {
    if (isEmptyValue(value)) return "-"
    return field.options.find((option) => option.value === value)?.label ?? String(value)
  }
  if (isEmptyValue(value)) {
    return "-"
  }
  return `${value}${field.unit ? ` ${field.unit}` : ""}`
}

export function normalizeCrfValue(field: CrfFieldNode, rawValue: unknown): unknown {
  if (field.type === "integer") {
    return rawValue === "" ? "" : Number.parseInt(String(rawValue), 10)
  }
  if (field.type === "decimal") {
    return rawValue === "" ? "" : Number.parseFloat(String(rawValue))
  }
  if (field.type === "boolean") {
    return typeof rawValue === "boolean" ? rawValue : ""
  }
  return rawValue
}

export const CRF_GRID_COLUMNS = 12

export function getFieldSpan(field: CrfFieldNode): number {
  const span = field.span ?? CRF_GRID_COLUMNS
  return Math.min(Math.max(Math.round(span), 1), CRF_GRID_COLUMNS)
}

/** 按 span 贪心分行，返回每行的元素下标（只统计字段节点） */
function groupIntoRows(children: CrfNode[]): number[][] {
  const rows: number[][] = []
  let current: number[] = []
  let sum = 0

  children.forEach((node, index) => {
    if (node.kind !== "field") {
      if (current.length > 0) rows.push(current)
      current = []
      sum = 0
      return
    }
    const span = getFieldSpan(node)
    if (sum + span > CRF_GRID_COLUMNS && current.length > 0) {
      rows.push(current)
      current = []
      sum = 0
    }
    current.push(index)
    sum += span
  })
  if (current.length > 0) rows.push(current)
  return rows
}

/** 行归一：拖拽后某行只剩一个半行(6)字段时，恢复为整行 */
export function normalizeRowSpans(children: CrfNode[]): CrfNode[] {
  const result = [...children]
  for (const row of groupIntoRows(result)) {
    if (row.length !== 1) continue
    const node = result[row[0]]
    if (node.kind === "field" && getFieldSpan(node) === 6) {
      result[row[0]] = { ...node, span: CRF_GRID_COLUMNS }
    }
  }
  return result
}

export type CrfDropZone = "before" | "after" | "left" | "right"

/**
 * 拖拽落点：
 * - before/after：作为独立整行插到目标上方/下方（span 重置为 12）
 * - left/right：与目标并排在同一行（双方 span 都变为 6）
 */
export function applyFieldDrop(nodes: CrfNode[], sourceId: string, targetId: string, zone: CrfDropZone): CrfNode[] {
  if (!sourceId || sourceId === targetId || nodes[0]?.kind !== "section") return nodes

  const [first, ...rest] = nodes
  const children = [...first.children]
  const sourceIndex = children.findIndex((node) => node.kind === "field" && node.id === sourceId)
  if (sourceIndex < 0) return nodes
  const [moved] = children.splice(sourceIndex, 1)
  const targetIndex = children.findIndex((node) => node.kind === "field" && node.id === targetId)
  if (targetIndex < 0 || moved.kind !== "field") return nodes
  const target = children[targetIndex] as CrfFieldNode

  if (zone === "left" || zone === "right") {
    children[targetIndex] = { ...target, span: 6 }
    children.splice(zone === "left" ? targetIndex : targetIndex + 1, 0, { ...moved, span: 6 })
  } else {
    children.splice(zone === "before" ? targetIndex : targetIndex + 1, 0, { ...moved, span: CRF_GRID_COLUMNS })
  }

  return [{ ...first, children: normalizeRowSpans(children) }, ...rest]
}

export function createFieldNode(partial: Partial<CrfFieldNode> = {}): CrfFieldNode {
  const key = partial.key?.trim() || `field_${Date.now()}`

  return {
    kind: "field",
    id: partial.id ?? crypto.randomUUID(),
    key,
    label: partial.label?.trim() || "未命名字段",
    type: partial.type ?? "text",
    required: partial.required ?? false,
    unit: partial.unit,
    options: partial.options,
    validation: partial.validation,
    visibility: partial.visibility,
    detail: partial.detail,
    compute: partial.compute,
    table: {
      width: 160,
      sortable: true,
      filterable: true,
      editable: true,
      ...partial.table,
    },
    editor: partial.editor,
    span: partial.span,
  }
}
