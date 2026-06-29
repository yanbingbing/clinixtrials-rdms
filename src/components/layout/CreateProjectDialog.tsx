import type { FormEvent } from "react"
import { useState } from "react"
import { X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCreateProjectMutation } from "@/hooks/useApiData"
import type { CreateProjectPayload } from "@/lib/api"

interface CreateProjectDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

const initialForm = {
  title: "",
  code: "",
  startDate: "",
  endDate: "",
  budget: "",
  principalInvestigator: "",
  targetEnrollment: "",
  department: "",
}

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const [form, setForm] = useState(initialForm)
  const [error, setError] = useState("")
  const createProject = useCreateProjectMutation()

  if (!open) {
    return null
  }

  const updateField = (field: keyof typeof initialForm, value: string) => {
    setForm((current) => ({ ...current, [field]: value }))
    setError("")
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const payload: CreateProjectPayload = {
      title: form.title.trim(),
      code: form.code.trim(),
      startDate: form.startDate,
      endDate: form.endDate || undefined,
      budget: Number(form.budget),
      principalInvestigator: form.principalInvestigator.trim(),
      targetEnrollment: Number(form.targetEnrollment),
      department: form.department.trim(),
    }

    if (
      !payload.title ||
      !payload.code ||
      !payload.startDate ||
      !payload.principalInvestigator ||
      !payload.department ||
      !Number.isFinite(payload.budget) ||
      !Number.isFinite(payload.targetEnrollment)
    ) {
      setError("请填写标题、项目编号、立项日期、预算金额、主要研究者、目标入组例数和研究科室")
      return
    }

    try {
      await createProject.mutateAsync(payload)
      setForm(initialForm)
      onCreated()
      onClose()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "创建项目失败")
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/35 px-4">
      <div className="w-full max-w-[560px] rounded-lg bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">创建项目</h2>
            <p className="mt-1 text-sm text-slate-500">项目编号可按个人偏好的 Alias 编码填写。</p>
          </div>
          <Button type="button" size="icon" variant="ghost" className="rounded-full" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <Field label="标题" required>
            <Input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder="请输入项目标题"
            />
          </Field>

          <Field label="项目编号 / Alias" required>
            <Input
              value={form.code}
              onChange={(event) => updateField("code", event.target.value)}
              placeholder="例如 ON109 或 WOUND-001"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="立项日期" required>
              <Input
                type="date"
                value={form.startDate}
                onChange={(event) => updateField("startDate", event.target.value)}
              />
            </Field>
            <Field label="结束日期">
              <Input
                type="date"
                value={form.endDate}
                onChange={(event) => updateField("endDate", event.target.value)}
              />
            </Field>
          </div>

          <Field label="预算金额" required>
            <Input
              type="number"
              min="0"
              step="1"
              value={form.budget}
              onChange={(event) => updateField("budget", event.target.value)}
              placeholder="请输入预算金额"
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="主要研究者" required>
              <Input
                value={form.principalInvestigator}
                onChange={(event) => updateField("principalInvestigator", event.target.value)}
                placeholder="主任 / 医生"
              />
            </Field>
            <Field label="研究科室" required>
              <Input
                value={form.department}
                onChange={(event) => updateField("department", event.target.value)}
                placeholder="例如 血管外科"
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="目标入组例数" required>
              <Input
                type="number"
                min="0"
                step="1"
                value={form.targetEnrollment}
                onChange={(event) => updateField("targetEnrollment", event.target.value)}
                placeholder="请输入例数"
              />
            </Field>
          </div>

          {error ? <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-500">{error}</div> : null}

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button type="submit" disabled={createProject.isPending}>
              {createProject.isPending ? "创建中..." : "创建"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium text-slate-600">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      {children}
    </label>
  )
}
