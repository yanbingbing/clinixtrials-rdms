import type { ColumnDef } from "@tanstack/react-table"

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
  targetSchemaId?: string
  targetSchemaCode?: string
  displayMode?: "inline_table" | "drawer"
  minRows?: number
  maxRows?: number
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
  table?: CrfTableSpec
  editor?: CrfEditorSpec
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
  schema: CrfSchema
}

export interface CrfVisitPlanItem {
  visitCode: string
  title: string
  sortOrder: number
  forms: CrfVisitForm[]
}

export interface CrfVisitPlanPayload {
  projectId: string
  visits: Array<{
    visitCode: string
    title: string
    sortOrder: number
    formSchemaIds: string[]
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

export function getDefaultValue(field: CrfFieldNode) {
  if (field.type === "multi_select") return []
  if (field.type === "detail_table") return []
  if (field.type === "boolean") return false
  return ""
}

export function formatCrfValue(field: CrfFieldNode, value: unknown) {
  if (Array.isArray(value)) {
    return value
      .map((item) => field.options?.find((option) => option.value === item)?.label ?? String(item))
      .join("、")
  }
  if (field.type === "boolean") {
    return value ? "是" : "否"
  }
  if (field.type === "detail_table") {
    return Array.isArray(value) && value.length > 0 ? `${value.length} 条明细` : "未填写"
  }
  if (field.options) {
    return field.options.find((option) => option.value === value)?.label ?? String(value ?? "")
  }
  if (value === null || value === undefined || value === "") {
    return "-"
  }
  return `${value}${field.unit ? ` ${field.unit}` : ""}`
}

export function normalizeCrfValue(field: CrfFieldNode, rawValue: string | boolean | string[]) {
  if (field.type === "integer") {
    return rawValue === "" ? "" : Number.parseInt(String(rawValue), 10)
  }
  if (field.type === "decimal") {
    return rawValue === "" ? "" : Number.parseFloat(String(rawValue))
  }
  if (field.type === "boolean") {
    return Boolean(rawValue)
  }
  return rawValue
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
    detail: partial.detail,
    table: {
      width: 160,
      sortable: true,
      filterable: true,
      editable: true,
      ...partial.table,
    },
    editor: partial.editor,
  }
}
