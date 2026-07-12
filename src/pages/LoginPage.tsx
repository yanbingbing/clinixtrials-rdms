import { useState } from "react"
import { Navigate, useNavigate } from "@tanstack/react-router"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { authClient, useSession } from "@/lib/auth-client"

export function LoginPage() {
  const navigate = useNavigate()
  const { data: session, isPending } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isPending && session) {
    return <Navigate to="/" />
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const { error } = await authClient.signIn.email({ email, password })
      if (error) {
        setError(error.message ?? "邮箱或密码错误")
        return
      }
      void navigate({ to: "/" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f8f7] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src="/brand-logo.png" alt="江苏大学附属医院" className="h-16 w-16 rounded-full" />
          <div>
            <div className="text-2xl font-semibold text-slate-800">科研数据管理系统</div>
            <div className="mt-1 text-sm text-slate-500">江苏大学附属医院 · Research Data Management System</div>
          </div>
        </div>

        <div className="rounded-xl border border-teal-100 bg-white p-8 shadow-sm">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-600" htmlFor="login-email">
                邮箱
              </label>
              <Input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@example.com"
                autoComplete="email"
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-600" htmlFor="login-password">
                密码
              </label>
              <Input
                id="login-password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="请输入密码"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</div>
            )}

            <Button type="submit" className="mt-2 h-10 w-full" disabled={submitting}>
              {submitting ? "请稍候…" : "登录"}
            </Button>

            <div className="text-center text-xs text-slate-400">
              账号由平台管理员开通，如需访问请联系管理员
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
