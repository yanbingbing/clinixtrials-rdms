import pg from "pg"
import type { QueryResultRow } from "pg"

const { Pool } = pg

export const pool = new Pool({
  connectionString:
    process.env.DATABASE_URL ?? "postgres://kydata:kydata@localhost:5432/kydata",
})

export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []) {
  return pool.query<T>(text, params)
}

export async function closePool() {
  await pool.end()
}
