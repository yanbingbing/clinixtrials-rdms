import pg from "pg"
import type { QueryResultRow } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"

import * as authSchema from "./auth-schema"
import * as schema from "./schema"

const { Pool } = pg

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ??
    "postgres://clinixtrials:clinixtrials@localhost:5432/clinixtrials_rdms",
  max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? 1 : 10)),
  idleTimeoutMillis: 10_000,
})

export const drizzleDb = drizzle(pool, { schema: { ...schema, ...authSchema } })

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params)
}

export async function closePool() {
  await pool.end()
}
