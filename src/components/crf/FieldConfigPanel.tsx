import { useState } from "react"
import { ChevronDown, ChevronRight, Plus, Trash2 } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { validateExpression } from "@/lib/crf-expression"
import {
  createFieldNode,
  crfCreatableFieldTypes,
  crfFieldTypeLabels,
  type CrfFieldNode,
  type CrfFieldType,
  type CrfOption,
  type CrfVisibilityRule,
} from "@/lib/crf"
import { cn } from "@/lib/utils"

/** 子表内允许的子字段类型（不允许嵌套子表 / 公式 / 文件） */
const subFieldTypes = crfCreatableFieldTypes.filter(
  (type) => type !== "detail_table" && type !== "computed" && type !== "file",
)

const optionColors: Array<{ label: string; value: string; className: string }> = [
  { label: "灰", value: "gray", className: "bg-slate-400" },
  { label: "绿", value: "green", className: "bg-emerald-500" },
  { label: "橙", value: "orange", className: "bg-amber-500" },
  { label: "红", value: "red", className: "bg-rose-500" },
  { label: "蓝", value: "blue", className: "bg-sky-500" },
]

export function normalizeKey(value: string) {
  return value.replace(/[^a-zA-Z0-9_]/g, "")
}

/** 切换字段类型时清理与新类型无关的配置，避免残留脏数据 */
export function buildTypeSwitchPatch(field: CrfFieldNode, nextType: CrfFieldType): Partial<CrfFieldNode> {
  const isSelect = nextType === "single_select" || nextType === "multi_select"
  return {
    type: nextType,
    options: isSelect
      ? field.options ?? [
          { label: "选项 1", value: "1" },
          { label: "选项 2", value: "2" },
        ]
      : undefined,
    compute: nextType === "computed" ? field.compute ?? { expression: "" } : undefined,
    detail: nextType === "detail_table" ? field.detail ?? { fields: [] } : undefined,
    unit: nextType === "integer" || nextType === "decimal" || nextType === "computed" ? field.unit : undefined,
    validation: undefined,
    defaultValue: undefined,
  }
}

export interface FieldConfigPanelProps {
  field: CrfFieldNode
  /** 同一作用域的全部字段（主表字段 或 子表内字段），用于 key 查重、联动、公式引用 */
  scopeFields: CrfFieldNode[]
  onChange: (patch: Partial<CrfFieldNode>) => void
  /** 子表内的字段编辑时为 false：类型受限、不再显示子表配置 */
  isSubField?: boolean
}

export function FieldConfigPanel({ field, scopeFields, onChange, isSubField }: FieldConfigPanelProps) {
  const availableTypes = isSubField ? subFieldTypes : crfCreatableFieldTypes
  const duplicateKey = scopeFields.some((item) => item.id !== field.id && item.key === field.key)
  const isNumeric = field.type === "integer" || field.type === "decimal"
  const isSelect = field.type === "single_select" || field.type === "multi_select"

  return (
    <div className="space-y-4">
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段名称</span>
        <Input value={field.label} onChange={(event) => onChange({ label: event.target.value })} />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段 Key</span>
        <Input
          className={cn(duplicateKey && "border-rose-400")}
          value={field.key}
          onChange={(event) => onChange({ key: normalizeKey(event.target.value) })}
        />
        {duplicateKey ? (
          <span className="block text-xs text-rose-600">Key 与同级字段重复，保存前请修改</span>
        ) : (
          <span className="block text-xs text-slate-400">数据以 Key 存储，发布后请勿修改</span>
        )}
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">字段类型</span>
        <Select
          value={field.type}
          onValueChange={(value) => onChange(buildTypeSwitchPatch(field, value as CrfFieldType))}
        >
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {field.type === "integer" ? (
              <SelectItem value="integer">数值</SelectItem>
            ) : null}
            {availableTypes.map((type) => (
              <SelectItem key={type} value={type}>{crfFieldTypeLabels[type]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>

      {field.type !== "computed" ? (
        <label className="flex items-center gap-2 rounded-md border bg-white p-3 text-sm text-slate-600">
          <Checkbox checked={field.required ?? false} onCheckedChange={(checked) => onChange({ required: checked === true })} />
          必填
        </label>
      ) : null}

      {isNumeric ? <NumericConfig field={field} onChange={onChange} /> : null}
      {isSelect ? <OptionsEditor field={field} onChange={onChange} /> : null}
      {field.type === "computed" ? <ComputeConfig field={field} scopeFields={scopeFields} onChange={onChange} /> : null}
      {field.type === "detail_table" && !isSubField ? <DetailFieldsEditor field={field} onChange={onChange} /> : null}

      {field.type !== "computed" && field.type !== "detail_table" ? (
        <EditorConfig field={field} onChange={onChange} />
      ) : null}

      <VisibilityEditor field={field} scopeFields={scopeFields} onChange={onChange} />

      {!isSubField ? (
        <div className="space-y-3 rounded-md border bg-white p-3">
          <div className="text-sm font-semibold text-slate-600">布局</div>
          <label className="space-y-2 text-sm">
            <span className="font-medium text-slate-600">占宽（12 格制）</span>
            <Select
              value={String(field.span ?? 12)}
              onValueChange={(value) => onChange({ span: Number(value) })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="12">整行（12）</SelectItem>
                <SelectItem value="6">1/2 行（6）</SelectItem>
                <SelectItem value="8">2/3 行（8）</SelectItem>
                <SelectItem value="4">1/3 行（4）</SelectItem>
                <SelectItem value="3">1/4 行（3）</SelectItem>
              </SelectContent>
            </Select>
          </label>
          <div className="text-xs text-slate-400">也可以在字段列表里把字段拖到另一个字段的左/右侧并排。</div>
        </div>
      ) : null}

      <div className="space-y-3 rounded-md border bg-white p-3">
        <div className="text-sm font-semibold text-slate-600">数据表展示</div>
        <div className="grid grid-cols-2 gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={field.table?.sortable ?? true}
              onCheckedChange={(checked) => onChange({ table: { ...field.table, sortable: checked === true } })}
            />
            可排序
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-600">
            <Checkbox
              checked={field.table?.editable ?? true}
              onCheckedChange={(checked) => onChange({ table: { ...field.table, editable: checked === true } })}
            />
            可编辑
          </label>
        </div>
      </div>
    </div>
  )
}

function NumericConfig({ field, onChange }: { field: CrfFieldNode; onChange: (patch: Partial<CrfFieldNode>) => void }) {
  return (
    <div className="space-y-3 rounded-md border bg-white p-3">
      <div className="text-sm font-semibold text-slate-600">数值约束</div>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">单位</span>
        <Input
          placeholder="如 kg、mmHg、×10^9/L"
          value={field.unit ?? ""}
          onChange={(event) => onChange({ unit: event.target.value || undefined })}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最小值</span>
          <Input
            type="number"
            value={field.validation?.min ?? ""}
            onChange={(event) =>
              onChange({ validation: { ...field.validation, min: event.target.value === "" ? undefined : Number(event.target.value) } })
            }
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最大值</span>
          <Input
            type="number"
            value={field.validation?.max ?? ""}
            onChange={(event) =>
              onChange({ validation: { ...field.validation, max: event.target.value === "" ? undefined : Number(event.target.value) } })
            }
          />
        </label>
      </div>
      {field.type === "decimal" ? (
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">小数位数</span>
          <Input
            type="number"
            min={0}
            max={6}
            placeholder="不限制"
            value={field.validation?.precision ?? ""}
            onChange={(event) =>
              onChange({
                validation: { ...field.validation, precision: event.target.value === "" ? undefined : Number(event.target.value) },
              })
            }
          />
        </label>
      ) : null}
    </div>
  )
}

function EditorConfig({ field, onChange }: { field: CrfFieldNode; onChange: (patch: Partial<CrfFieldNode>) => void }) {
  return (
    <div className="space-y-3 rounded-md border bg-white p-3">
      <div className="text-sm font-semibold text-slate-600">录入提示</div>
      {field.type === "long_text" ? (
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">输入框行数</span>
          <Input
            type="number"
            min={2}
            value={field.editor?.rows ?? 4}
            onChange={(event) => onChange({ editor: { ...field.editor, rows: Number(event.target.value) || 4 } })}
          />
        </label>
      ) : null}
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">占位提示</span>
        <Input
          value={field.editor?.placeholder ?? ""}
          onChange={(event) => onChange({ editor: { ...field.editor, placeholder: event.target.value || undefined } })}
        />
      </label>
      <label className="space-y-2 text-sm">
        <span className="font-medium text-slate-600">帮助文案</span>
        <Input
          placeholder="展示在输入框下方"
          value={field.editor?.helpText ?? ""}
          onChange={(event) => onChange({ editor: { ...field.editor, helpText: event.target.value || undefined } })}
        />
      </label>
    </div>
  )
}

function OptionsEditor({ field, onChange }: { field: CrfFieldNode; onChange: (patch: Partial<CrfFieldNode>) => void }) {
  const options = field.options ?? []

  const updateOption = (index: number, patch: Partial<CrfOption>) => {
    onChange({ options: options.map((option, i) => (i === index ? { ...option, ...patch } : option)) })
  }

  return (
    <div className="space-y-2 rounded-md border bg-white p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-slate-600">选项</div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 rounded-full text-xs"
          onClick={() => onChange({ options: [...options, { label: `选项 ${options.length + 1}`, value: String(options.length + 1) }] })}
        >
          <Plus className="mr-1 h-3 w-3" />
          添加
        </Button>
      </div>
      {options.length === 0 ? (
        <div className="rounded-md border border-dashed p-3 text-center text-xs text-amber-600">选择类型字段至少需要一个选项</div>
      ) : null}
      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="grid grid-cols-[1fr_86px_64px_28px] items-center gap-2">
            <Input
              className="h-8 text-sm"
              placeholder="显示名"
              value={option.label}
              onChange={(event) => updateOption(index, { label: event.target.value })}
            />
            <Input
              className="h-8 font-mono text-xs"
              placeholder="值"
              title="存储值；参与公式计算时请填数字"
              value={option.value}
              onChange={(event) => updateOption(index, { value: event.target.value })}
            />
            <Select
              value={option.color ?? "__none"}
              onValueChange={(value) => updateOption(index, { color: value === "__none" ? undefined : value })}
            >
              <SelectTrigger className="h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none">无色</SelectItem>
                {optionColors.map((color) => (
                  <SelectItem key={color.value} value={color.value}>
                    <span className="flex items-center gap-1.5">
                      <span className={cn("h-2.5 w-2.5 rounded-full", color.className)} />
                      {color.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-rose-600"
              onClick={() => onChange({ options: options.filter((_, i) => i !== index) })}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
      </div>
      <div className="text-xs text-slate-400">选项值参与公式计算（如评分求和）时，值请填数字。</div>
    </div>
  )
}

function ComputeConfig({
  field,
  scopeFields,
  onChange,
}: {
  field: CrfFieldNode
  scopeFields: CrfFieldNode[]
  onChange: (patch: Partial<CrfFieldNode>) => void
}) {
  const referencable = scopeFields.filter(
    (item) =>
      item.id !== field.id &&
      (item.type === "integer" || item.type === "decimal" || item.type === "computed" || item.type === "single_select"),
  )
  const availableKeys = scopeFields.filter((item) => item.id !== field.id).map((item) => item.key)
  const expression = field.compute?.expression ?? ""
  const expressionError = expression ? validateExpression(expression, availableKeys) : null

  return (
    <div className="space-y-3 rounded-md border border-violet-200 bg-violet-50/50 p-3">
      <div className="text-sm font-semibold text-violet-800">公式</div>
      <textarea
        className="min-h-16 w-full rounded-md border border-input bg-white px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="如：weight / (height / 100) / (height / 100)"
        value={expression}
        onChange={(event) => onChange({ compute: { ...field.compute, expression: event.target.value } })}
      />
      {expression ? (
        expressionError ? (
          <div className="text-xs text-rose-600">{expressionError}</div>
        ) : (
          <div className="text-xs text-emerald-600">公式有效</div>
        )
      ) : (
        <div className="text-xs text-slate-400">支持 + - * / 和括号，点击下方字段插入引用</div>
      )}
      {referencable.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {referencable.map((item) => (
            <button
              key={item.id}
              type="button"
              className="rounded-full border border-violet-200 bg-white px-2.5 py-1 text-xs text-violet-700 hover:bg-violet-100"
              title={`插入 ${item.key}`}
              onClick={() =>
                onChange({
                  compute: { ...field.compute, expression: expression ? `${expression} ${item.key}` : item.key },
                })
              }
            >
              {item.label}
              <span className="ml-1 font-mono text-violet-400">{item.key}</span>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-xs text-slate-400">当前没有可引用的数值字段（整数 / 小数 / 单选 / 公式）</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">小数位数</span>
          <Input
            type="number"
            min={0}
            max={6}
            placeholder="不限制"
            value={field.compute?.precision ?? ""}
            onChange={(event) =>
              onChange({
                compute: {
                  expression,
                  ...field.compute,
                  precision: event.target.value === "" ? undefined : Number(event.target.value),
                },
              })
            }
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">单位</span>
          <Input value={field.unit ?? ""} onChange={(event) => onChange({ unit: event.target.value || undefined })} />
        </label>
      </div>
    </div>
  )
}

function VisibilityEditor({
  field,
  scopeFields,
  onChange,
}: {
  field: CrfFieldNode
  scopeFields: CrfFieldNode[]
  onChange: (patch: Partial<CrfFieldNode>) => void
}) {
  const candidates = scopeFields.filter((item) => item.id !== field.id && item.type !== "detail_table")
  const rule = field.visibility
  const targetField = candidates.find((item) => item.key === rule?.field)

  const updateRule = (patch: Partial<CrfVisibilityRule>) => {
    onChange({ visibility: { field: "", operator: "eq", ...rule, ...patch } })
  }

  return (
    <div className="space-y-3 rounded-md border bg-white p-3">
      <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
        <Checkbox
          checked={Boolean(rule)}
          onCheckedChange={(checked) => {
            if (checked === true) {
              onChange({ visibility: { field: candidates[0]?.key ?? "", operator: "eq", value: "" } })
            } else {
              onChange({ visibility: undefined })
            }
          }}
        />
        条件显示（联动）
      </label>
      {rule ? (
        candidates.length === 0 ? (
          <div className="text-xs text-amber-600">同级没有可依赖的字段</div>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Select value={rule.field || undefined} onValueChange={(value) => updateRule({ field: value })}>
                <SelectTrigger className="h-9"><SelectValue placeholder="选择字段" /></SelectTrigger>
                <SelectContent>
                  {candidates.map((item) => (
                    <SelectItem key={item.id} value={item.key}>{item.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={rule.operator}
                onValueChange={(value) => updateRule({ operator: value as CrfVisibilityRule["operator"] })}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="eq">等于</SelectItem>
                  <SelectItem value="neq">不等于</SelectItem>
                  <SelectItem value="not_empty">已填写</SelectItem>
                  <SelectItem value="empty">未填写</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {rule.operator === "eq" || rule.operator === "neq" ? (
              targetField?.type === "boolean" ? (
                <Select value={String(rule.value ?? "")} onValueChange={(value) => updateRule({ value: value === "true" })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择值" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">是</SelectItem>
                    <SelectItem value="false">否</SelectItem>
                  </SelectContent>
                </Select>
              ) : targetField?.options?.length ? (
                <Select value={String(rule.value ?? "") || undefined} onValueChange={(value) => updateRule({ value })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="选择值" /></SelectTrigger>
                  <SelectContent>
                    {targetField.options.map((option) => (
                      <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-9"
                  placeholder="比较值"
                  value={String(rule.value ?? "")}
                  onChange={(event) => updateRule({ value: event.target.value })}
                />
              )
            ) : null}
            <div className="text-xs text-slate-400">满足条件时才显示本字段；隐藏字段不参与提交校验。</div>
          </div>
        )
      ) : null}
    </div>
  )
}

function DetailFieldsEditor({ field, onChange }: { field: CrfFieldNode; onChange: (patch: Partial<CrfFieldNode>) => void }) {
  const detailFields = field.detail?.fields ?? []
  const [expandedId, setExpandedId] = useState("")

  const updateDetail = (fields: CrfFieldNode[]) => {
    onChange({ detail: { ...field.detail, fields } })
  }

  const updateSubField = (subId: string, patch: Partial<CrfFieldNode>) => {
    updateDetail(detailFields.map((sub) => (sub.id === subId ? { ...sub, ...patch } : sub)))
  }

  const addSubField = () => {
    const sub = createFieldNode({
      key: `col_${detailFields.length + 1}`,
      label: `子字段 ${detailFields.length + 1}`,
      type: "text",
      table: { width: 140 },
    })
    updateDetail([...detailFields, sub])
    setExpandedId(sub.id)
  }

  const moveSubField = (index: number, direction: -1 | 1) => {
    const nextIndex = index + direction
    if (nextIndex < 0 || nextIndex >= detailFields.length) return
    const next = [...detailFields]
    const [moved] = next.splice(index, 1)
    next.splice(nextIndex, 0, moved)
    updateDetail(next)
  }

  return (
    <div className="space-y-3 rounded-md border border-cyan-200 bg-cyan-50/50 p-3">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold text-cyan-800">子表字段</div>
        <Button type="button" variant="outline" size="sm" className="h-7 rounded-full text-xs" onClick={addSubField}>
          <Plus className="mr-1 h-3 w-3" />
          添加子字段
        </Button>
      </div>

      {detailFields.length === 0 ? (
        <div className="rounded-md border border-dashed bg-white p-3 text-center text-xs text-amber-600">
          子表至少需要一个子字段
        </div>
      ) : (
        <div className="space-y-1.5">
          {detailFields.map((sub, index) => {
            const expanded = expandedId === sub.id
            return (
              <div key={sub.id} className="overflow-hidden rounded-md border bg-white">
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => setExpandedId(expanded ? "" : sub.id)}
                  >
                    {expanded ? (
                      <ChevronDown className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    )}
                    <span className="truncate text-sm font-medium text-slate-700">
                      {sub.label}
                      {sub.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
                    </span>
                    <Badge className="shrink-0 bg-slate-100 text-[11px] text-slate-500">{crfFieldTypeLabels[sub.type]}</Badge>
                  </button>
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400"
                      disabled={index === 0}
                      onClick={() => moveSubField(index, -1)}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400"
                      disabled={index === detailFields.length - 1}
                      onClick={() => moveSubField(index, 1)}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-slate-400 hover:text-rose-600"
                      onClick={() => updateDetail(detailFields.filter((item) => item.id !== sub.id))}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                {expanded ? (
                  <div className="border-t bg-slate-50/60 p-3">
                    <FieldConfigPanel
                      field={sub}
                      scopeFields={detailFields}
                      isSubField
                      onChange={(patch) => updateSubField(sub.id, patch)}
                    />
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最少行</span>
          <Input
            type="number"
            min={0}
            value={field.detail?.minRows ?? ""}
            onChange={(event) =>
              onChange({
                detail: {
                  fields: detailFields,
                  ...field.detail,
                  minRows: event.target.value === "" ? undefined : Number(event.target.value),
                },
              })
            }
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium text-slate-600">最多行</span>
          <Input
            type="number"
            min={1}
            value={field.detail?.maxRows ?? ""}
            onChange={(event) =>
              onChange({
                detail: {
                  fields: detailFields,
                  ...field.detail,
                  maxRows: event.target.value === "" ? undefined : Number(event.target.value),
                },
              })
            }
          />
        </label>
      </div>
      <div className="text-xs leading-5 text-slate-500">
        子表是一组可重复的子记录（如合并用药、既往病史），数据内嵌保存在本模块记录中。
      </div>
    </div>
  )
}
