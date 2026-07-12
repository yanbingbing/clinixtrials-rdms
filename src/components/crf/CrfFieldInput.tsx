import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  createEmptyDetailRow,
  detailRowErrorKey,
  formatCrfValue,
  getFieldSpan,
  isFieldVisible,
  normalizeCrfValue,
  type CrfFieldNode,
} from "@/lib/crf"
import { cn } from "@/lib/utils"

export interface CrfFieldInputProps {
  field: CrfFieldNode
  value: unknown
  onChange: (value: unknown) => void
  /** 当前字段的校验错误 */
  error?: string
  /** 完整错误表，用于子表行内错误（key 形如 `字段.行号.子字段`） */
  errors?: Record<string, string>
  disabled?: boolean
}

export function CrfFieldInput({ field, value, onChange, error, errors, disabled }: CrfFieldInputProps) {
  const label = (
    <div className="mb-2 text-sm font-medium text-slate-600">
      {field.label}
      {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
      {field.unit ? <span className="ml-2 text-xs text-slate-400">({field.unit})</span> : null}
    </div>
  )

  const footer = error ? (
    <div className="mt-2 text-xs text-rose-600">{error}</div>
  ) : field.editor?.helpText ? (
    <div className="mt-2 text-xs text-slate-400">{field.editor.helpText}</div>
  ) : null

  return (
    <div
      data-span={getFieldSpan(field)}
      className={cn(
        "rounded-md border bg-white p-4",
        field.type === "detail_table" && "border-cyan-100 bg-cyan-50/40",
        error && "border-rose-300",
      )}
    >
      {label}
      <FieldControl field={field} value={value} onChange={onChange} errors={errors} disabled={disabled} />
      {footer}
    </div>
  )
}

function FieldControl({
  field,
  value,
  onChange,
  errors,
  disabled,
}: {
  field: CrfFieldNode
  value: unknown
  onChange: (value: unknown) => void
  errors?: Record<string, string>
  disabled?: boolean
}) {
  switch (field.type) {
    case "boolean":
      return (
        <OptionPills
          options={[
            { label: "是", value: "true" },
            { label: "否", value: "false" },
          ]}
          selected={value === true ? "true" : value === false ? "false" : ""}
          disabled={disabled}
          onSelect={(next) => onChange(next === "" ? "" : next === "true")}
        />
      )
    case "single_select": {
      const options = field.options ?? []
      const selected = String(value ?? "")
      if (options.length <= 4) {
        return <OptionPills options={options} selected={selected} disabled={disabled} onSelect={onChange} />
      }
      return (
        <Select value={selected || undefined} onValueChange={onChange} disabled={disabled}>
          <SelectTrigger>
            <SelectValue placeholder={field.editor?.placeholder ?? "请选择"} />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    }
    case "multi_select": {
      const selectedValues = Array.isArray(value) ? value.map(String) : []
      return (
        <div className="grid gap-2">
          {(field.options ?? []).map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={selectedValues.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((item) => item !== option.value)
                  onChange(next)
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      )
    }
    case "long_text":
      return (
        <textarea
          className="w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          rows={field.editor?.rows ?? 4}
          placeholder={field.editor?.placeholder}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "integer":
    case "decimal":
      return <NumericInput field={field} value={value} onChange={onChange} disabled={disabled} />
    case "date":
      return <Input type="date" value={String(value ?? "")} disabled={disabled} onChange={(event) => onChange(event.target.value)} />
    case "datetime":
      return (
        <Input
          type="datetime-local"
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "file":
      return (
        <Input
          placeholder={field.editor?.placeholder ?? "粘贴文件链接（上传功能后续接入）"}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "computed":
      return (
        <div>
          <div className="flex h-10 items-center rounded-md border border-dashed bg-slate-50 px-3 text-sm font-semibold text-slate-700">
            {formatCrfValue(field, value)}
          </div>
          {field.compute?.expression ? (
            <div className="mt-1.5 font-mono text-xs text-slate-400">= {field.compute.expression}</div>
          ) : (
            <div className="mt-1.5 text-xs text-amber-600">尚未配置公式</div>
          )}
        </div>
      )
    case "detail_table":
      return <DetailTableInput field={field} value={value} onChange={onChange} errors={errors} disabled={disabled} />
    default:
      return (
        <Input
          placeholder={field.editor?.placeholder}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}

function OptionPills({
  options,
  selected,
  onSelect,
  disabled,
}: {
  options: Array<{ label: string; value: string }>
  selected: string
  onSelect: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected === option.value
        return (
          <button
            key={option.value}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(active ? "" : option.value)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm transition-colors disabled:opacity-50",
              active
                ? "border-primary bg-primary text-primary-foreground"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function NumericInput({
  field,
  value,
  onChange,
  disabled,
  compact,
}: {
  field: CrfFieldNode
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
  compact?: boolean
}) {
  const pattern = field.type === "integer" ? /^-?\d*$/ : /^-?\d*\.?\d*$/

  return (
    <div className="relative">
      <Input
        inputMode={field.type === "integer" ? "numeric" : "decimal"}
        placeholder={field.editor?.placeholder}
        className={cn(field.unit && !compact && "pr-14", compact && "h-8")}
        value={String(value ?? "")}
        disabled={disabled}
        onChange={(event) => {
          const text = event.target.value
          if (pattern.test(text)) onChange(text)
        }}
        onBlur={(event) => onChange(normalizeCrfValue(field, event.target.value))}
      />
      {field.unit && !compact ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-xs text-slate-400">
          {field.unit}
        </span>
      ) : null}
    </div>
  )
}

function DetailTableInput({
  field,
  value,
  onChange,
  errors,
  disabled,
}: {
  field: CrfFieldNode
  value: unknown
  onChange: (value: unknown) => void
  errors?: Record<string, string>
  disabled?: boolean
}) {
  const subFields = field.detail?.fields ?? []
  const rows = (Array.isArray(value) ? value : []) as Array<Record<string, unknown>>
  const maxRows = field.detail?.maxRows
  const minRows = field.detail?.minRows ?? 0

  if (subFields.length === 0) {
    return (
      <div className="rounded-md border border-dashed bg-white p-4 text-sm text-slate-400">
        该子表还没有配置子字段，请先在设计器中添加。
      </div>
    )
  }

  const updateRow = (rowIndex: number, subKey: string, subValue: unknown) => {
    const next = rows.map((row, index) => (index === rowIndex ? { ...row, [subKey]: subValue } : row))
    onChange(next)
  }

  const addRow = () => {
    onChange([...rows, createEmptyDetailRow(field)])
  }

  const removeRow = (rowIndex: number) => {
    onChange(rows.filter((_, index) => index !== rowIndex))
  }

  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-md border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50">
              <TableHead className="h-9 w-[44px] px-3 text-xs text-slate-400">#</TableHead>
              {subFields.map((sub) => (
                <TableHead key={sub.id} className="h-9 px-3 text-xs" style={{ minWidth: sub.table?.width ?? 140 }}>
                  {sub.label}
                  {sub.required ? <span className="ml-0.5 text-rose-500">*</span> : null}
                  {sub.unit ? <span className="ml-1 text-slate-400">({sub.unit})</span> : null}
                </TableHead>
              ))}
              <TableHead className="h-9 w-[52px] px-3" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={subFields.length + 2} className="py-6 text-center text-sm text-slate-400">
                  暂无明细，点击下方按钮添加
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  <TableCell className="px-3 py-1.5 text-xs text-slate-400">{rowIndex + 1}</TableCell>
                  {subFields.map((sub) => {
                    const cellError = errors?.[detailRowErrorKey(field.key, rowIndex, sub.key)]
                    return (
                      <TableCell key={sub.id} className="px-2 py-1.5 align-top">
                        {isFieldVisible(sub, row) ? (
                          <div title={cellError}>
                            <CellControl
                              field={sub}
                              value={row[sub.key]}
                              disabled={disabled}
                              hasError={Boolean(cellError)}
                              onChange={(next) => updateRow(rowIndex, sub.key, next)}
                            />
                            {cellError ? <div className="mt-1 text-xs text-rose-600">{cellError}</div> : null}
                          </div>
                        ) : (
                          <div className="flex h-8 items-center px-1 text-xs text-slate-300">—</div>
                        )}
                      </TableCell>
                    )
                  })}
                  <TableCell className="px-2 py-1.5">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:text-rose-600"
                      disabled={disabled || rows.length <= minRows}
                      title={rows.length <= minRows ? `至少保留 ${minRows} 行` : "删除本行"}
                      onClick={() => removeRow(rowIndex)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full"
          disabled={disabled || (maxRows !== undefined && rows.length >= maxRows)}
          onClick={addRow}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          添加一行
        </Button>
        <div className="text-xs text-slate-400">
          {rows.length} 行
          {minRows > 0 ? ` · 至少 ${minRows} 行` : ""}
          {maxRows !== undefined ? ` · 最多 ${maxRows} 行` : ""}
        </div>
      </div>
    </div>
  )
}

/** 子表单元格里的紧凑控件 */
function CellControl({
  field,
  value,
  onChange,
  disabled,
  hasError,
}: {
  field: CrfFieldNode
  value: unknown
  onChange: (value: unknown) => void
  disabled?: boolean
  hasError?: boolean
}) {
  const errorClass = hasError ? "border-rose-400 focus-visible:ring-rose-300" : undefined

  switch (field.type) {
    case "boolean":
      return (
        <Select
          value={value === true ? "true" : value === false ? "false" : "__unset"}
          disabled={disabled}
          onValueChange={(next) => onChange(next === "__unset" ? "" : next === "true")}
        >
          <SelectTrigger className={cn("h-8", errorClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset">-</SelectItem>
            <SelectItem value="true">是</SelectItem>
            <SelectItem value="false">否</SelectItem>
          </SelectContent>
        </Select>
      )
    case "single_select":
      return (
        <Select
          value={String(value ?? "") || "__unset"}
          disabled={disabled}
          onValueChange={(next) => onChange(next === "__unset" ? "" : next)}
        >
          <SelectTrigger className={cn("h-8", errorClass)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__unset">-</SelectItem>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )
    case "multi_select": {
      const selectedValues = Array.isArray(value) ? value.map(String) : []
      return (
        <div className="flex flex-wrap gap-x-3 gap-y-1 py-1">
          {(field.options ?? []).map((option) => (
            <label key={option.value} className="flex items-center gap-1.5 text-xs text-slate-600">
              <Checkbox
                checked={selectedValues.includes(option.value)}
                disabled={disabled}
                onCheckedChange={(checked) => {
                  const next = checked
                    ? [...selectedValues, option.value]
                    : selectedValues.filter((item) => item !== option.value)
                  onChange(next)
                }}
              />
              {option.label}
            </label>
          ))}
        </div>
      )
    }
    case "integer":
    case "decimal":
      return <NumericInput field={field} value={value} onChange={onChange} disabled={disabled} compact />
    case "date":
      return (
        <Input
          type="date"
          className={cn("h-8", errorClass)}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    case "datetime":
      return (
        <Input
          type="datetime-local"
          className={cn("h-8", errorClass)}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
    default:
      return (
        <Input
          className={cn("h-8", errorClass)}
          placeholder={field.editor?.placeholder}
          value={String(value ?? "")}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
      )
  }
}
