import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Link, Navigate, Outlet, useNavigate, useRouterState } from "@tanstack/react-router"
import {
  Building2,
  FileText,
  FolderKanban,
  Home,
  LogOut,
  Plus,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { CreateProjectDialog } from "@/components/layout/CreateProjectDialog"
import { authClient, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const navItems = [
  { label: "首页", to: "/", icon: Home },
  { label: "项目管理", to: "/projects", icon: FolderKanban },
  { label: "模块库", to: "/crf/forms", icon: FileText },
  { label: "组织管理", to: "/organizations", icon: Building2 },
] as const

export function AppShell() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const [createProjectOpen, setCreateProjectOpen] = useState(false)
  const { data: session, isPending } = useSession()
  const { data: activeOrganization } = authClient.useActiveOrganization()

  if (isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f7fafb] text-sm text-slate-500">
        正在加载…
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" />
  }

  const userName = session.user.name || session.user.email

  const handleSignOut = async () => {
    await authClient.signOut()
    void navigate({ to: "/login" })
  }

  return (
    <div className="min-h-screen bg-[#f7fafb] text-slate-700">
      <header className="sticky top-0 z-30 h-[92px] bg-primary text-white shadow-sm">
        <div className="flex h-full items-center justify-between gap-5 px-6">
          <div className="flex min-w-0 items-center gap-4">
            <img
              src="/brand-logo.png"
              alt="江苏大学附属医院"
              className="h-14 w-14 shrink-0 rounded-full"
            />
            <div className="min-w-0">
              <div className="truncate text-2xl font-semibold">江苏大学附属医院</div>
              <div className="truncate text-sm text-white/90">Affiliated Hospital of Jiangsu University</div>
            </div>
            <div className="hidden h-8 w-px bg-white/70 lg:block" />
            <div className="hidden text-lg font-semibold lg:block">科研数据管理系统</div>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <Button
              className="hidden rounded-full bg-white px-5 text-primary hover:bg-white/90 xl:inline-flex"
              onClick={() => setCreateProjectOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              创建项目
            </Button>
            <div className="hidden h-8 w-px bg-white/55 md:block" />
            <div className="hidden items-center gap-3 md:flex">
              <div className="h-10 w-10 overflow-hidden rounded-full border-2 border-white/70 bg-slate-200">
                <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-100 to-slate-300 text-sm font-semibold text-slate-700">
                  {userName.slice(0, 1)}
                </div>
              </div>
              <div className="min-w-0">
                <div className="max-w-[160px] truncate text-sm font-semibold">{userName}</div>
                <div className="max-w-[160px] truncate text-xs text-white/80">
                  {activeOrganization ? activeOrganization.name : "未加入组织"}
                </div>
              </div>
            </div>
            <div className="hidden h-8 w-px bg-white/55 lg:block" />
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="hidden h-9 items-center gap-1.5 rounded-full px-3 text-sm text-white/90 transition-colors hover:bg-white/15 hover:text-white md:flex"
              title="退出登录"
            >
              <LogOut className="h-4 w-4" />
              退出
            </button>
          </div>
        </div>
      </header>

      <div className="app-workspace-bg flex min-h-[calc(100vh-92px)]">
        <aside className="sticky top-[92px] hidden h-[calc(100vh-92px)] w-[188px] shrink-0 border-r border-white/70 bg-transparent px-5 py-5 lg:block">
          <nav className="flex flex-col gap-2">
            {navItems.map((item) => {
              const Icon = item.icon
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to)
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-12 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-600 transition-colors",
                    active && "bg-primary text-white shadow-sm",
                    !active && "hover:bg-white hover:text-slate-900",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>
        </aside>

        <main className="relative min-w-0 flex-1 bg-transparent">
          <div className="p-4 md:p-5 xl:p-6">
            <Outlet />
          </div>
        </main>
      </div>
      <CreateProjectDialog
        open={createProjectOpen}
        onClose={() => setCreateProjectOpen(false)}
        onCreated={() => {
          void queryClient.invalidateQueries({ queryKey: ["projects"] })
          void queryClient.invalidateQueries({ queryKey: ["stats-overview"] })
        }}
      />
    </div>
  )
}
