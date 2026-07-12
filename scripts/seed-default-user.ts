import "dotenv/config"

import { auth } from "../server/src/auth"
import { closePool } from "../server/src/db"

const email = (process.env.SEED_USER_EMAIL ?? "me@yanbingbing.com").trim().toLowerCase()
const password = process.env.SEED_USER_PASSWORD ?? "123123"
const name = (process.env.SEED_USER_NAME ?? "默认管理员").trim()

if (!email || !password || !name) {
  throw new Error("SEED_USER_EMAIL, SEED_USER_PASSWORD and SEED_USER_NAME cannot be empty")
}

try {
  const context = await auth.$context
  const passwordHash = await context.password.hash(password)
  const existing = await context.internalAdapter.findUserByEmail(email, { includeAccounts: true })

  if (!existing) {
    const user = await context.internalAdapter.createUser({
      email,
      name,
      emailVerified: true,
      role: "admin",
    })

    await context.internalAdapter.linkAccount({
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: passwordHash,
    })

    console.log(`Created default auth user: ${email}`)
  } else {
    await context.internalAdapter.updateUser(existing.user.id, { role: "admin", emailVerified: true })
    const credentialAccount = existing.accounts.find((account) => account.providerId === "credential")

    if (credentialAccount) {
      await context.internalAdapter.updatePassword(existing.user.id, passwordHash)
      console.log(`Reset password for default auth user: ${email}`)
    } else {
      await context.internalAdapter.linkAccount({
        accountId: existing.user.id,
        providerId: "credential",
        userId: existing.user.id,
        password: passwordHash,
      })
      console.log(`Added credential login for default auth user: ${email}`)
    }
  }
} finally {
  await closePool()
}
