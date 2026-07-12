import { useState, type DragEvent } from "react"
import { ArrowDown, ArrowUp, GripVertical } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { crfFieldTypeLabels, getFieldSpan, type CrfDropZone, type CrfFieldNode } from "@/lib/crf"
import { cn } from "@/lib/utils"

interface DragOverState {
  fieldId: string
  zone: CrfDropZone
}

export interface FieldGridListProps {
  fields: CrfFieldNode[]
  selectedFieldId?: string
  onSelect: (fieldId: string) => void
  onDrop: (sourceId: string, targetId: string, zone: CrfDropZone) => void
  onReorder: (fieldId: string, direction: -1 | 1) => void
}

/** 判定指针落在卡片的哪个投放区：左右 22% 为并排区，中间按上下半分 */
function resolveDropZone(event: DragEvent<HTMLElement>): CrfDropZone {
  const rect = event.currentTarget.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  if (x < rect.width * 0.22) return "left"
  if (x > rect.width * 0.78) return "right"
  return y < rect.height / 2 ? "before" : "after"
}

const zoneIndicatorClass: Record<CrfDropZone, string> = {
  left: "border-l-4 border-l-primary",
  right: "border-r-4 border-r-primary",
  before: "border-t-4 border-t-primary",
  after: "border-b-4 border-b-primary",
}

export function FieldGridList({ fields, selectedFieldId, onSelect, onDrop, onReorder }: FieldGridListProps) {
  const [draggingFieldId, setDraggingFieldId] = useState("")
  const [dragOver, setDragOver] = useState<DragOverState | null>(null)

  return (
    <div className="crf-grid gap-2">
      {fields.map((field, index) => {
        const span = getFieldSpan(field)
        const isDragOver = dragOver?.fieldId === field.id && draggingFieldId !== field.id

        return (
          <div
            key={field.id}
            data-span={span}
            draggable
            onDragStart={() => setDraggingFieldId(field.id)}
            onDragEnd={() => {
              setDraggingFieldId("")
              setDragOver(null)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              if (draggingFieldId && draggingFieldId !== field.id) {
                setDragOver({ fieldId: field.id, zone: resolveDropZone(event) })
              }
            }}
            onDragLeave={(event) => {
              if (event.currentTarget === event.target) setDragOver(null)
            }}
            onDrop={(event) => {
              event.preventDefault()
              if (draggingFieldId && draggingFieldId !== field.id) {
                onDrop(draggingFieldId, field.id, resolveDropZone(event))
              }
              setDraggingFieldId("")
              setDragOver(null)
            }}
            onClick={() => onSelect(field.id)}
            className={cn(
              "flex cursor-pointer items-center gap-2 rounded-md border bg-white px-3 py-2.5 text-left text-sm shadow-sm transition-colors",
              selectedFieldId === field.id && "border-primary bg-primary/8 ring-1 ring-primary/20",
              draggingFieldId === field.id && "opacity-40",
              isDragOver && dragOver && zoneIndicatorClass[dragOver.zone],
            )}
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-slate-400" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-700">
                {field.label}
                {field.required ? <span className="ml-1 text-rose-500">*</span> : null}
                {field.visibility ? <span className="ml-2 text-xs font-normal text-sky-500">联动</span> : null}
              </span>
              <span className="block truncate text-xs text-slate-400">
                {field.key}
                {field.unit ? ` · ${field.unit}` : ""}
                {span !== 12 ? ` · ${span}/12` : ""}
                {field.type === "detail_table" ? ` · ${field.detail?.fields?.length ?? 0} 个子字段` : ""}
                {field.type === "computed" && field.compute?.expression ? ` · = ${field.compute.expression}` : ""}
              </span>
            </span>
            <Badge
              className={cn(
                "shrink-0",
                field.type === "detail_table"
                  ? "bg-cyan-100 text-cyan-700"
                  : field.type === "computed"
                    ? "bg-violet-100 text-violet-700"
                    : "bg-slate-100 text-slate-600",
              )}
            >
              {crfFieldTypeLabels[field.type]}
            </Badge>
            <span className="flex shrink-0 items-center">
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-25"
                disabled={index === 0}
                onClick={(event) => {
                  event.stopPropagation()
                  onReorder(field.id, -1)
                }}
              >
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 disabled:opacity-25"
                disabled={index === fields.length - 1}
                onClick={(event) => {
                  event.stopPropagation()
                  onReorder(field.id, 1)
                }}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </span>
          </div>
        )
      })}
    </div>
  )
}
