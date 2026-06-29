import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { CheckCircle2, ClipboardEdit, Save } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useCrfEntryTasksQuery, useSaveCrfRecordMutation } from "@/hooks/useApiData"
import {
  createEmptyValues,
  flattenCrfFields,
  formatCrfValue,
  normalizeCrfValue,
  type CrfEntryTask,
  type CrfFieldNode,
} from "@/lib/crf"
import { cn } from "@/lib/utils"

export function CrfEntryPage() {
  const queryClient = useQueryClient()
  const tasksQuery = useCrfEntryTasksQuery("ON101")
  const saveMutation = useSaveCrfRecordMutation()
  const tasks = tasksQuery.data ?? []
  const [selectedTaskId, setSelectedTaskId] = useState("")
  const [values, setValues] = useState<Record<string, unknown>>({})

  useEffect(() => {
    if (selectedTaskId || tasks.length === 0) return
    setSelectedTaskId(tasks[0].taskId)
  }, [tasks, selectedTaskId])

  const selectedTask = tasks.find((task) => task.taskId === selectedTaskId) ?? tasks[0]
  const schema = selectedTask?.schema

  useEffect(() => {
    if (!selectedTask) return
    setValues({ ...createEmptyValues(selectedTask.schema), ...selectedTask.values })
  }, [selectedTask])

  const fields = useMemo(() => (schema ? flattenCrfFields(schema.nodes) : []), [schema])
  const siblingTasks = useMemo(
    () => tasks.filter((task) => selectedTask && task.schemaId === selectedTask.schemaId),
    [tasks, selectedTask],
  )

  const columns = useMemo<ColumnDef<CrfEntryTask>[]>(() => {
    if (!schema) return []
    const fixedColumns: ColumnDef<CrfEntryTask>[] = [
      { id: "subjectCode", accessorKey: "subjectCode", header: "受试者", size: 110 },
      { id: "visitCode", accessorKey: "visitCode", header: "访视", size: 90 },
      { id: "status", accessorKey: "status", header: "状态", size: 110, cell: ({ row }) => <StatusPill status={row.original.status} /> },
    ]
    const crfColumns: ColumnDef<CrfEntryTask>[] = flattenCrfFields(schema.nodes)
      .filter((field) => !field.table?.hidden)
      .map((field) => ({
        id: field.key,
        accessorFn: (row) => row.values[field.key],
        header: field.label,
        size: field.table?.width,
        minSize: field.table?.minWidth,
        enableSorting: field.table?.sortable ?? true,
        cell: ({ getValue }) => <CrfTableValue field={field} value={getValue()} />,
      }))
    return [...fixedColumns, ...crfColumns]
  }, [schema])

  const table = useReactTable({
    data: siblingTasks,
    columns,
    getCoreRowModel: getCoreRowModel(),
  })

  const updateValue = (field: CrfFieldNode, rawValue: string | boolean | string[]) => {
    setValues((current) => ({ ...current, [field.key]: normalizeCrfValue(field, rawValue) }))
  }

  const saveRecord = async () => {
    if (!selectedTask) return
    await saveMutation.mutateAsync({
      projectId: selectedTask.projectId,
      subjectId: selectedTask.subjectId,
      visitCode: selectedTask.visitCode,
      schemaId: selectedTask.schemaId,
      schemaVersion: selectedTask.schemaVersion,
      values,
      status: "draft",
    })
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks", "ON101"] })
  }

  if (tasksQuery.isLoading) {
    return <Card><CardContent className="p-8 text-sm text-slate-500">正在加载 CRF 填报任务...</CardContent></Card>
  }

  if (!selectedTask) {
    return <Card><CardContent className="p-8 text-sm text-slate-500">还没有配置访视表格</CardContent></Card>
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="min-h-[680px]">
          <CardHeader>
            <CardTitle>填报任务</CardTitle>
            <div className="text-sm text-slate-500">受试者 / 访视 / 表格</div>
          </CardHeader>
          <CardContent className="max-h-[560px] space-y-2 overflow-y-auto pr-2">
            {tasks.map((task) => (
              <button
                key={task.taskId}
                type="button"
                onClick={() => setSelectedTaskId(task.taskId)}
                className={cn(
                  "grid w-full grid-cols-[1fr_auto] gap-3 rounded-md border bg-white px-4 py-3 text-left text-sm transition-colors",
                  selectedTask.taskId === task.taskId && "border-primary bg-primary/8 text-primary",
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate font-semibold">{task.subjectCode} · {task.visitCode} · {task.schema.name}</span>
                  <span className="text-xs text-slate-400">{task.visitTitle} / {task.schema.code} v{task.schemaVersion}</span>
                </span>
                <StatusPill status={task.status} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>生成表单</CardTitle>
              <div className="mt-2 text-sm text-slate-500">
                {selectedTask.subjectCode} / {selectedTask.visitCode} / {selectedTask.schema.name}
              </div>
            </div>
            <Button className="rounded-full" disabled={saveMutation.isPending} onClick={saveRecord}>
              <Save className="mr-2 h-4 w-4" />
              保存填报
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {fields.map((field) => (
                <CrfFieldInput
                  key={field.id}
                  field={field}
                  value={values[field.key]}
                  onChange={(rawValue) => updateValue(field, rawValue)}
                />
              ))}
            </div>
            {saveMutation.isSuccess ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                填报数据已保存到 Postgres jsonb
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>{selectedTask.schema.name} 数据表</CardTitle>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <ClipboardEdit className="h-4 w-4" />
            同一原子表格在不同访视中复用
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="bg-slate-50">
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} style={{ width: header.getSize() }}>
                      {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}

function StatusPill({ status }: { status: CrfEntryTask["status"] }) {
  const map = {
    not_started: "未开始",
    draft: "草稿",
    submitted: "已提交",
    locked: "已锁定",
  }
  return <Badge className="bg-slate-100 text-slate-600">{map[status]}</Badge>
}

function CrfFieldInput({
  field,
  value,
  onChange,
}: {
  field: CrfFieldNode
  value: unknown
  onChange: (value: string | boolean | string[]) => void
}) {
  const label = (
    <div className="mb-2 text-sm font-medium text-slate-600">
      {field.label}
      {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
      {field.unit ? <span className="ml-2 text-xs text-slate-400">({field.unit})</span> : null}
    </div>
  )

  if (field.type === "boolean") {
    return (
      <label className="rounded-md border bg-white p-4">
        {label}
        <div className="flex h-10 items-center gap-2">
          <Checkbox checked={Boolean(value)} onCheckedChange={(checked) => onChange(checked === true)} />
          <span className="text-sm text-slate-600">是</span>
        </div>
      </label>
    )
  }

  if (field.type === "single_select") {
    return (
      <label className="rounded-md border bg-white p-4">
        {label}
        <Select value={String(value ?? "")} onValueChange={onChange}>
          <SelectTrigger><SelectValue placeholder="请选择" /></SelectTrigger>
          <SelectContent>
            {(field.options ?? []).map((option) => (
              <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    )
  }

  if (field.type === "multi_select") {
    const selectedValues = Array.isArray(value) ? value.map(String) : []
    return (
      <div className="rounded-md border bg-white p-4">
        {label}
        <div className="grid gap-2">
          {(field.options ?? []).map((option) => (
            <label key={option.value} className="flex items-center gap-2 text-sm text-slate-600">
              <Checkbox
                checked={selectedValues.includes(option.value)}
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
      </div>
    )
  }

  if (field.type === "long_text") {
    return (
      <label className="rounded-md border bg-white p-4 md:col-span-2">
        {label}
        <textarea
          className="min-h-24 w-full rounded-md border border-input bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={String(value ?? "")}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    )
  }

  if (field.type === "detail_table") {
    return (
      <div className="rounded-md border border-cyan-100 bg-cyan-50/70 p-4 md:col-span-2">
        {label}
        <div className="rounded-md border bg-white p-4 text-sm text-slate-600">
          <div className="font-semibold text-slate-700">关联子表格</div>
          <div className="mt-2 text-slate-500">
            {field.detail?.targetSchemaCode ? `子表：${field.detail.targetSchemaCode}` : "尚未选择子表格"}
          </div>
          <div className="mt-2 text-xs leading-5 text-slate-400">
            明细数据后续会以独立子记录保存，当前先完成 schema 关联配置。
          </div>
        </div>
      </div>
    )
  }

  return (
    <label className="rounded-md border bg-white p-4">
      {label}
      <Input type={getInputType(field)} value={String(value ?? "")} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function CrfTableValue({ field, value }: { field: CrfFieldNode; value: unknown }) {
  return <span className={field.table?.align === "right" ? "block text-right" : undefined}>{formatCrfValue(field, value)}</span>
}

function getInputType(field: CrfFieldNode) {
  if (field.type === "integer" || field.type === "decimal") return "number"
  if (field.type === "date") return "date"
  if (field.type === "datetime") return "datetime-local"
  return "text"
}
