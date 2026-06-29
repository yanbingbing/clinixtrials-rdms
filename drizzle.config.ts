import "dotenv/config"

import { defineConfig } from "drizzle-kit"

export default defineConfig({
  schema: "./server/src/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://kydata:kydata@localhost:5432/kydata",
  },
  strict: true,
  verbose: true,
})
