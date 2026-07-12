import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Building2, Check, Mail, UserPlus, Users } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { authClient, useSession } from "@/lib/auth-client"
import { cn } from "@/lib/utils"

const roleLabels: Record<string, string> = {
  owner: "所有者",
  admin: "管理员",
  member: "成员",
}

function roleLabel(role: string | null | undefined) {
  if (!role) return "成员"
  return role
    .split(",")
    .map((part) => roleLabels[part.trim()] ?? part.trim())
    .join("、")
}

function slugify(value: string) {
  const base = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return base
}

export function OrganizationsPage() {
  const queryClient = useQueryClient()
  const { data: session } = useSession()
  const { data: organizations, refetch: refetchOrganizations } = authClient.useListOrganizations()
  const { data: activeOrganization, refetch: refetchActiveOrganization } =
    authClient.useActiveOrganization()

  const isPlatformAdmin = session?.user.role === "admin"
  const [orgName, setOrgName] = useState("")
  const [orgSlug, setOrgSlug] = useState("")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member")
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(null)

  const notify = (kind: "ok" | "error", text: string) => {
    setFeedback({ kind, text })
    window.setTimeout(() => setFeedback(null), 4000)
  }

  const refreshAll = async () => {
    await Promise.all([
      refetchOrganizations(),
      refetchActiveOrganization(),
      queryClient.invalidateQueries({ queryKey: ["org-invitations"] }),
      queryClient.invalidateQueries({ queryKey: ["my-invitations"] }),
    ])
  }

  const myInvitations = useQuery({
    queryKey: ["my-invitations"],
    queryFn: async () => {
      const { data, error } = await authClient.organization.listUserInvitations()
      if (error) throw new Error(error.message)
      return data ?? []
    },
  })

  const orgInvitations = useQuery({
    queryKey: ["org-invitations", activeOrganization?.id],
    enabled: Boolean(activeOrganization?.id),
    queryFn: async () => {
      const { data, error } = await authClient.organization.listInvitations({
        query: { organizationId: activeOrganization!.id },
      })
      if (error) throw new Error(error.message)
      return (data ?? []).filter((invitation) => invitation.status === "pending")
    },
  })

  const createOrganization = useMutation({
    mutationFn: async () => {
      const name = orgName.trim()
      const slug = orgSlug.trim() || slugify(name)
      if (!name) throw new Error("请输入组织名称")
      if (!slug) throw new Error("请输入组织标识（仅小写字母、数字和连字符）")
      const { error } = await authClient.organization.create({ name, slug })
      if (error) throw new Error(error.message ?? "创建组织失败")
    },
    onSuccess: async () => {
      setOrgName("")
      setOrgSlug("")
      notify("ok", "组织创建成功")
      await refreshAll()
    },
    onError: (error: Error) => notify("error", error.message),
  })

  const setActive = useMutation({
    mutationFn: async (organizationId: string) => {
      const { error } = await authClient.organization.setActive({ organizationId })
      if (error) throw new Error(error.message ?? "切换组织失败")
    },
    onSuccess: refreshAll,
    onError: (error: Error) => notify("error", error.message),
  })

  const inviteMember = useMutation({
    mutationFn: async () => {
      const email = inviteEmail.trim()
      if (!email) throw new Error("请输入被邀请人的邮箱")
      const { error } = await authClient.organization.inviteMember({
        email,
        role: inviteRole,
      })
      if (error) throw new Error(error.message ?? "发送邀请失败")
    },
    onSuccess: async () => {
      setInviteEmail("")
      notify("ok", "邀请已创建，对方登录后可在本页接受")
      await refreshAll()
    },
    onError: (error: Error) => notify("error", error.message),
  })

  const cancelInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.cancelInvitation({ invitationId })
      if (error) throw new Error(error.message ?? "取消邀请失败")
    },
    onSuccess: refreshAll,
    onError: (error: Error) => notify("error", error.message),
  })

  const acceptInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { data, error } = await authClient.organization.acceptInvitation({ invitationId })
      if (error) throw new Error(error.message ?? "接受邀请失败")
      return data
    },
    onSuccess: async (data) => {
      notify("ok", "已加入组织")
      if (data?.invitation.organizationId) {
        await authClient.organization.setActive({ organizationId: data.invitation.organizationId })
      }
      await refreshAll()
    },
    onError: (error: Error) => notify("error", error.message),
  })

  const rejectInvitation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await authClient.organization.rejectInvitation({ invitationId })
      if (error) throw new Error(error.message ?? "拒绝邀请失败")
    },
    onSuccess: refreshAll,
    onError: (error: Error) => notify("error", error.message),
  })

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await authClient.organization.removeMember({
        memberIdOrEmail: memberId,
      })
      if (error) throw new Error(error.message ?? "移除成员失败")
    },
    onSuccess: refreshAll,
    onError: (error: Error) => notify("error", error.message),
  })

  const pendingMyInvitations = (myInvitations.data ?? []).filter(
    (invitation) => invitation.status === "pending",
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">组织管理</h1>
        {feedback && (
          <div
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              feedback.kind === "ok" ? "bg-teal-50 text-teal-700" : "bg-red-50 text-red-600",
            )}
          >
            {feedback.text}
          </div>
        )}
      </div>

      {pendingMyInvitations.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-4 w-4 text-amber-600" />
              我收到的邀请
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {pendingMyInvitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-white px-3 py-2"
              >
                <div className="text-sm text-slate-700">
                  邀请你以
                  <Badge variant="gray" className="mx-1">
                    {roleLabel(invitation.role)}
                  </Badge>
                  身份加入组织
                  <span className="ml-1 font-medium">
                    {(invitation as { organizationName?: string }).organizationName ??
                      invitation.organizationId}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => acceptInvitation.mutate(invitation.id)}
                    disabled={acceptInvitation.isPending}
                  >
                    接受
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => rejectInvitation.mutate(invitation.id)}
                    disabled={rejectInvitation.isPending}
                  >
                    拒绝
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-primary" />
                我的组织
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {(organizations ?? []).length === 0 && (
                <div className="rounded-md bg-slate-50 px-3 py-4 text-center text-sm text-slate-500">
                  {isPlatformAdmin
                    ? "还没有组织，可以先创建一个"
                    : "你还没有加入任何组织，请等待管理员邀请"}
                </div>
              )}
              {(organizations ?? []).map((organization) => {
                const isActive = organization.id === activeOrganization?.id
                return (
                  <button
                    key={organization.id}
                    type="button"
                    onClick={() => {
                      if (!isActive) setActive.mutate(organization.id)
                    }}
                    className={cn(
                      "flex items-center justify-between rounded-md border px-3 py-2.5 text-left transition-colors",
                      isActive
                        ? "border-primary/40 bg-teal-50/70"
                        : "border-slate-200 hover:border-primary/40 hover:bg-slate-50",
                    )}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-700">
                        {organization.name}
                      </div>
                      <div className="truncate text-xs text-slate-400">{organization.slug}</div>
                    </div>
                    {isActive && (
                      <Badge className="shrink-0 gap-1">
                        <Check className="h-3 w-3" />
                        当前
                      </Badge>
                    )}
                  </button>
                )
              })}
            </CardContent>
          </Card>

          {isPlatformAdmin && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">创建组织</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                className="flex flex-col gap-3"
                onSubmit={(event) => {
                  event.preventDefault()
                  createOrganization.mutate()
                }}
              >
                <Input
                  value={orgName}
                  onChange={(event) => {
                    setOrgName(event.target.value)
                    setOrgSlug(slugify(event.target.value))
                  }}
                  placeholder="组织名称，如：瑞金医院"
                  required
                />
                <Input
                  value={orgSlug}
                  onChange={(event) => setOrgSlug(slugify(event.target.value))}
                  placeholder="组织标识，如：ruijin-hospital"
                  required
                />
                <Button type="submit" disabled={createOrganization.isPending}>
                  {createOrganization.isPending ? "创建中…" : "创建组织"}
                </Button>
              </form>
            </CardContent>
          </Card>
          )}
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4 text-primary" />
              {activeOrganization ? `${activeOrganization.name} · 成员` : "组织成员"}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!activeOrganization && (
              <div className="rounded-md bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
                请先在左侧选择或创建一个组织
              </div>
            )}

            {activeOrganization && (
              <>
                <form
                  className="flex flex-wrap items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    inviteMember.mutate()
                  }}
                >
                  <div className="relative min-w-[220px] flex-1">
                    <UserPlus className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      placeholder="输入邮箱邀请成员加入"
                      className="pl-9"
                      required
                    />
                  </div>
                  <Select
                    value={inviteRole}
                    onValueChange={(value) => setInviteRole(value as "member" | "admin")}
                  >
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="member">成员</SelectItem>
                      <SelectItem value="admin">管理员</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" disabled={inviteMember.isPending}>
                    {inviteMember.isPending ? "发送中…" : "发送邀请"}
                  </Button>
                </form>

                <div className="overflow-hidden rounded-md border border-slate-200">
                  {(activeOrganization.members ?? []).map((member) => {
                    const isSelf = member.userId === session?.user.id
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between gap-3 border-b border-slate-100 px-3 py-2.5 last:border-b-0"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal-50 text-sm font-semibold text-primary">
                            {(member.user.name || member.user.email).slice(0, 1)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-slate-700">
                              {member.user.name || member.user.email}
                              {isSelf && <span className="ml-1 text-xs text-slate-400">（我）</span>}
                            </div>
                            <div className="truncate text-xs text-slate-400">{member.user.email}</div>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge variant={member.role.includes("owner") ? "default" : "gray"}>
                            {roleLabel(member.role)}
                          </Badge>
                          {!member.role.includes("owner") && !isSelf && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => removeMember.mutate(member.id)}
                              disabled={removeMember.isPending}
                            >
                              移除
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>

                {(orgInvitations.data ?? []).length > 0 && (
                  <div>
                    <div className="mb-2 text-sm font-medium text-slate-600">待处理的邀请</div>
                    <div className="flex flex-col gap-2">
                      {(orgInvitations.data ?? []).map((invitation) => (
                        <div
                          key={invitation.id}
                          className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-slate-50 px-3 py-2"
                        >
                          <div className="text-sm text-slate-600">
                            {invitation.email}
                            <Badge variant="gray" className="ml-2">
                              {roleLabel(invitation.role)}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => cancelInvitation.mutate(invitation.id)}
                            disabled={cancelInvitation.isPending}
                          >
                            取消邀请
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
