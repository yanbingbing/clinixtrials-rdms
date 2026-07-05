import "dotenv/config"

import fs from "node:fs/promises"
import path from "node:path"
import pg from "pg"

const { Client } = pg

const databaseUrl = process.env.DATABASE_URL

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required")
}

const root = process.cwd()
const seedDir = path.join(root, "db", "init")

const client = new Client({ connectionString: databaseUrl })

await client.connect()

try {
  const files = (await fs.readdir(seedDir))
    .filter((file) => file.endsWith(".sql"))
    .sort((left, right) => left.localeCompare(right))

  for (const file of files) {
    const filePath = path.join(seedDir, file)
    const sql = await fs.readFile(filePath, "utf8")
    process.stdout.write(`Applying seed ${file}... `)
    await client.query(sql)
    process.stdout.write("done\n")
  }

  const counts = await client.query<{ table_name: string; count: number }>(`
    SELECT 'projects' AS table_name, count(*)::int AS count FROM projects
    UNION ALL SELECT 'subjects', count(*)::int FROM subjects
    UNION ALL SELECT 'accounts', count(*)::int FROM accounts
    UNION ALL SELECT 'visits', count(*)::int FROM visits
    UNION ALL SELECT 'forms', count(*)::int FROM forms
    UNION ALL SELECT 'crf_schemas', count(*)::int FROM crf_schemas
    UNION ALL SELECT 'crf_project_visits', count(*)::int FROM crf_project_visits
    UNION ALL SELECT 'crf_visit_forms', count(*)::int FROM crf_visit_forms
    UNION ALL SELECT 'crf_records', count(*)::int FROM crf_records
    ORDER BY table_name
  `)

  console.table(counts.rows)
} finally {
  await client.end()
}
