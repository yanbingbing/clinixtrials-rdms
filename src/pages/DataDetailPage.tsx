import { ChevronDown, MoreHorizontal } from "lucide-react"
import type React from "react"

import { FilterSelect } from "@/components/business"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { formTree as fallbackFormTree } from "@/data/mock"
import { useFormTreeQuery } from "@/hooks/useApiData"

export function DataDetailPage() {
  const formTreeQuery = useFormTreeQuery("P001")
  const formTree = (formTreeQuery.data ?? fallbackFormTree).map((group) =>
    group.label.startsWith("V1") ? { ...group, children: [] } : group,
  )

  return (
    <div className="space-y-5">
      <div className="px-1 py-2 text-base font-medium">
        <span className="text-slate-500">数据录入</span>
        <span className="mx-2 text-slate-400">/</span>
        <span className="text-slate-800">数据详情</span>
      </div>
      <Card className="min-h-[720px]">
        <CardContent className="p-5">
          <div className="grid gap-5 xl:grid-cols-[310px_1fr]">
            <div className="rounded-lg border bg-white p-5">
              <div className="space-y-6">
                {formTree.map((group) => (
                  <div key={group.label} className="space-y-5">
                    <div className="flex items-center justify-between text-base font-semibold">
                      <span className="flex items-center gap-2">
                        {group.label}
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      </span>
                      <Checkbox checked={group.done} />
                    </div>
                    {group.children.map((item) => (
                      <div key={item.label} className="flex items-center justify-between pl-1 text-sm font-semibold text-slate-600">
                        <span>-{item.label}</span>
                        <Checkbox checked={item.done} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <FormRow label="访视日期">
                <div className="rounded-md border bg-white px-4 py-2 text-slate-600">2026-09-12</div>
              </FormRow>
              <FormRow label="民族">
                <div className="w-36">
                  <FilterSelect value="汉族" options={["汉族", "回族", "满族"]} className="h-10 bg-white" />
                </div>
              </FormRow>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-20 items-center justify-between rounded-lg border bg-white px-6 py-4">
      <div className="flex min-w-0 flex-1 items-center gap-20">
        <div className="w-32 shrink-0 text-base font-semibold text-slate-600">{label}</div>
        <div>{children}</div>
      </div>
      <MoreHorizontal className="h-5 w-5 text-slate-500" />
    </div>
  )
}
