import "dotenv/config"

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./server/src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgres://clinixtrials:clinixtrials@localhost:5432/clinixtrials_rdms",
  },
  strict: true,
  verbose: true,
})
