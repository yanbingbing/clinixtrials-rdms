import { useEffect, useMemo, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table"
import { AlertCircle, CheckCircle2, ClipboardEdit, Save, Send } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { CrfFieldInput } from "@/components/crf/CrfFieldInput"
import { useCrfEntryTasksQuery, useSaveCrfRecordMutation } from "@/hooks/useApiData"
import {
  createEmptyValues,
  flattenCrfFields,
  formatCrfValue,
  isFieldVisible,
  resolveComputedValues,
  validateSchemaValues,
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
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [showValidation, setShowValidation] = useState(false)
  const [lastAction, setLastAction] = useState<"draft" | "submitted" | null>(null)

  useEffect(() => {
    if (selectedTaskId || tasks.length === 0) return
    setSelectedTaskId(tasks[0].taskId)
  }, [tasks, selectedTaskId])

  const selectedTask = tasks.find((task) => task.taskId === selectedTaskId) ?? tasks[0]
  const schema = selectedTask?.schema

  useEffect(() => {
    if (!selectedTask) return
    setValues({ ...createEmptyValues(selectedTask.schema), ...selectedTask.values })
    setErrors({})
    setShowValidation(false)
    setLastAction(null)
  }, [selectedTask])

  const fields = useMemo(() => (schema ? flattenCrfFields(schema.nodes) : []), [schema])

  // 公式字段随其他字段实时求值；显隐和校验都基于求值后的完整数据
  const displayValues = useMemo(
    () => (schema ? resolveComputedValues(schema, values) : values),
    [schema, values],
  )
  const visibleFields = useMemo(
    () => fields.filter((field) => isFieldVisible(field, displayValues)),
    [fields, displayValues],
  )

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

  const locked = selectedTask?.status === "locked"

  const updateValue = (field: CrfFieldNode, nextValue: unknown) => {
    setValues((current) => {
      const next = { ...current, [field.key]: nextValue }
      if (showValidation && schema) {
        setErrors(validateSchemaValues(schema, resolveComputedValues(schema, next)))
      }
      return next
    })
  }

  const persist = async (status: "draft" | "submitted") => {
    if (!selectedTask || !schema) return
    await saveMutation.mutateAsync({
      projectId: selectedTask.projectId,
      subjectId: selectedTask.subjectId,
      visitCode: selectedTask.visitCode,
      schemaId: selectedTask.schemaId,
      schemaVersion: selectedTask.schemaVersion,
      // 公式字段的结果一并快照，报表可直接读取
      values: resolveComputedValues(schema, values),
      status,
    })
    setLastAction(status)
    await queryClient.invalidateQueries({ queryKey: ["crf-entry-tasks", "ON101"] })
  }

  const saveDraft = () => persist("draft")

  const submitRecord = async () => {
    if (!schema) return
    const nextErrors = validateSchemaValues(schema, displayValues)
    setErrors(nextErrors)
    setShowValidation(true)
    if (Object.keys(nextErrors).length > 0) return
    await persist("submitted")
  }

  if (tasksQuery.isLoading) {
    return <Card><CardContent className="p-8 text-sm text-slate-500">正在加载 CRF 填报任务...</CardContent></Card>
  }

  if (!selectedTask) {
    return <Card><CardContent className="p-8 text-sm text-slate-500">还没有配置访视模块</CardContent></Card>
  }

  const errorCount = Object.keys(errors).length

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-[340px_1fr]">
        <Card className="min-h-[680px]">
          <CardHeader>
            <CardTitle>填报任务</CardTitle>
            <div className="text-sm text-slate-500">受试者 / 访视 / 模块</div>
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
              <CardTitle>模块填报</CardTitle>
              <div className="mt-2 text-sm text-slate-500">
                {selectedTask.subjectCode} / {selectedTask.visitCode} / {selectedTask.schema.name}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                className="rounded-full"
                disabled={saveMutation.isPending || locked}
                onClick={saveDraft}
              >
                <Save className="mr-2 h-4 w-4" />
                保存草稿
              </Button>
              <Button className="rounded-full" disabled={saveMutation.isPending || locked} onClick={submitRecord}>
                <Send className="mr-2 h-4 w-4" />
                提交
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {locked ? (
              <div className="mb-4 rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                该记录已锁定，不能修改。
              </div>
            ) : null}
            {showValidation && errorCount > 0 ? (
              <div className="mb-4 flex items-center gap-2 rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                还有 {errorCount} 处未通过校验，请修改后再提交（保存草稿不受影响）。
              </div>
            ) : null}
            <div className="crf-grid">
              {visibleFields.map((field) => (
                <CrfFieldInput
                  key={field.id}
                  field={field}
                  value={displayValues[field.key]}
                  error={showValidation ? errors[field.key] : undefined}
                  errors={showValidation ? errors : undefined}
                  disabled={locked}
                  onChange={(nextValue) => updateValue(field, nextValue)}
                />
              ))}
            </div>
            {saveMutation.isSuccess && lastAction ? (
              <div className="mt-5 flex items-center gap-2 text-sm text-emerald-600">
                <CheckCircle2 className="h-4 w-4" />
                {lastAction === "submitted" ? "已提交，数据通过全部校验" : "草稿已保存"}
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
            同一模块可以在不同访视中复用
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
  const labelMap = {
    not_started: "未开始",
    draft: "草稿",
    submitted: "已提交",
    locked: "已锁定",
  }
  const colorMap = {
    not_started: "bg-slate-100 text-slate-500",
    draft: "bg-amber-100 text-amber-700",
    submitted: "bg-emerald-100 text-emerald-700",
    locked: "bg-slate-200 text-slate-600",
  }
  return <Badge className={colorMap[status]}>{labelMap[status]}</Badge>
}

function CrfTableValue({ field, value }: { field: CrfFieldNode; value: unknown }) {
  return <span className={field.table?.align === "right" ? "block text-right" : undefined}>{formatCrfValue(field, value)}</span>
}
