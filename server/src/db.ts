import pg from "pg"
import type { QueryResultRow } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"

import * as schema from "./schema"

const { Pool } = pg

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://kydata:kydata@localhost:5432/kydata",
  max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? 1 : 10)),
  idleTimeoutMillis: 10_000,
})

export const drizzleDb = drizzle(pool, { schema })

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params)
}

export async function closePool() {
  await pool.end()
}
