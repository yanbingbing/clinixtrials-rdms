import { Link } from "@tanstack/react-router"
import { ArrowRight, FileText, FolderKanban, LibraryBig, type LucideIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useCrfSchemasQuery, useCrfVisitPlanQuery, useProjectsQuery } from "@/hooks/useApiData"
import { flattenCrfFields } from "@/lib/crf"

export function DashboardPage() {
  const projectsQuery = useProjectsQuery()
  const schemasQuery = useCrfSchemasQuery()
  const visitPlanQuery = useCrfVisitPlanQuery()

  const projects = projectsQuery.data ?? []
  const schemas = schemasQuery.data ?? []
  const visits = visitPlanQuery.data ?? []
  const fieldCount = schemas.reduce((total, schema) => total + flattenCrfFields(schema.nodes).length, 0)

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-5">
      <section className="panel px-6 py-5">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <div className="text-sm font-medium text-primary">CRF 配置工作台</div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">先从项目进入，再配置项目 CRF</h1>
            <p className="mt-3 text-sm leading-6 text-slate-500">
              当前阶段只保留核心入口：项目管理负责进入具体项目，模块库负责维护可复用模块；项目下的 CRF 配置就是访视计划。
            </p>
          </div>
          <div className="grid min-w-[320px] grid-cols-3 gap-3">
            <Metric label="项目" value={projects.length} />
            <Metric label="模块" value={schemas.length} />
            <Metric label="访视" value={visits.length} />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <HomeActionCard
          icon={FolderKanban}
          title="项目管理"
          description="先进入具体研究项目，在项目详情中打开 CRF 配置，再维护该项目的访视计划。"
          to="/projects"
          buttonLabel="进入项目管理"
          meta={`${projects.length} 个项目`}
        />
        <HomeActionCard
          icon={FileText}
          title="模块库"
          description="维护 Visit、人口学特征、实验室检查等可复用模块，模块设计与访视计划解耦。"
          to="/crf/forms"
          buttonLabel="进入模块库"
          meta={`${schemas.length} 个模块 / ${fieldCount} 个字段`}
        />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>最近的模块</CardTitle>
              <div className="mt-2 text-sm text-slate-500">模块库是当前 CRF 配置的底座</div>
            </div>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/crf/forms">查看全部</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="divide-y divide-slate-100">
              {schemas.slice(0, 5).map((schema) => {
                const fields = flattenCrfFields(schema.nodes)
                return (
                  <Link
                    key={schema.id}
                    to="/crf/forms/$schemaId"
                    params={{ schemaId: schema.id }}
                    className="flex items-center justify-between gap-4 py-4 transition-colors hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold text-slate-900">{schema.name}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {schema.code} · v{schema.version} · {fields.length} 个字段
                      </div>
                    </div>
                    <Badge variant={schema.status === "published" ? "default" : "gray"}>
                      {schema.status === "published" ? "已发布" : "草稿"}
                    </Badge>
                  </Link>
                )
              })}
              {schemas.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500">还没有模块</div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>访视计划概览</CardTitle>
            <div className="mt-2 text-sm text-slate-500">编辑入口在项目详情的 CRF 配置里</div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {visits.map((visit) => (
                <div
                  key={visit.visitCode}
                  className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-slate-900">{visit.visitCode}</div>
                      <div className="mt-1 text-xs text-slate-500">{visit.title}</div>
                    </div>
                    <Badge>{visit.forms.length} 个模块</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {visit.forms.map((form) => (
                      <span
                        key={form.schemaId}
                        className="rounded-sm bg-white px-2.5 py-1 text-xs text-slate-600 ring-1 ring-slate-100"
                      >
                        {form.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              {visits.length === 0 ? (
                <div className="rounded-md border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                  还没有配置访视计划
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-slate-100 bg-slate-50 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div>
    </div>
  )
}

function HomeActionCard({
  icon: Icon,
  title,
  description,
  to,
  buttonLabel,
  meta,
}: {
  icon: LucideIcon
  title: string
  description: string
  to: "/projects" | "/crf/forms"
  buttonLabel: string
  meta: string
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-white">
        <div className="flex items-start justify-between gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>{title}</CardTitle>
              <div className="mt-1 text-xs text-slate-500">{meta}</div>
            </div>
          </div>
          <LibraryBig className="h-5 w-5 text-slate-300" />
        </div>
      </CardHeader>
      <CardContent className="space-y-5 pt-5">
        <p className="min-h-12 text-sm leading-6 text-slate-500">{description}</p>
        <Button asChild className="rounded-full">
          <Link to={to}>
            {buttonLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
