import "dotenv/config"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins/admin"
import { organization } from "better-auth/plugins/organization"
import { eq } from "drizzle-orm"

import * as authSchema from "./auth-schema"
import { drizzleDb } from "./db"

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:5173",
  trustedOrigins: ["http://localhost:5173", "http://localhost:4173"],
  database: drizzleAdapter(drizzleDb, {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
    // 前期不开放自助注册：账号由平台管理员创建（scripts/create-admin.ts / 管理后台）
    disableSignUp: true,
  },
  databaseHooks: {
    user: {
      create: {
        // 尚未接入邮件服务，注册即视为已验证；接入验证邮件后应移除，
        // 否则任何人都能用他人邮箱注册并查看发给该邮箱的组织邀请
        before: async (user) => ({
          data: { ...user, emailVerified: true },
        }),
      },
    },
    session: {
      create: {
        before: async (session) => {
          const memberships = await drizzleDb
            .select({ organizationId: authSchema.member.organizationId })
            .from(authSchema.member)
            .where(eq(authSchema.member.userId, session.userId))
            .limit(1)

          return {
            data: {
              ...session,
              activeOrganizationId: memberships[0]?.organizationId ?? null,
            },
          }
        },
      },
    },
  },
  plugins: [
    admin(),
    organization({
      // 组织由平台管理员开通，普通用户不能自建
      allowUserToCreateOrganization: async (user) =>
        (user as { role?: string | null }).role === "admin",
      creatorRole: "owner",
    }),
  ],
})
