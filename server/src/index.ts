import "dotenv/config"

import cors from "cors"
import express from "express"
import { randomUUID } from "node:crypto"

import { closePool, pool, query } from "./db"

export const app = express()
const port = Number(process.env.API_PORT ?? 4000)

app.use(cors())
app.use(express.json())

app.get("/api/health", async (_req, res, next) => {
  try {
    const result = await query<{ ok: number }>("SELECT 1 AS ok")
    res.json({ ok: result.rows[0]?.ok === 1 })
  } catch (error) {
    next(error)
  }
})

app.get("/api/projects", async (_req, res, next) => {
  try {
    const result = await query<{
      code: string
      start: string
      end: string
      status: string
      progress: number
      budget: number
      center: string
      name: string
      principalInvestigator: string
      targetEnrollment: number
      department: string
    }>(`
      SELECT
        code,
        name,
        center,
        department,
        status,
        to_char(start_date, 'YYYY-MM-DD') AS start,
        COALESCE(to_char(end_date, 'YYYY-MM-DD'), '') AS end,
        budget,
        progress,
        principal_investigator AS "principalInvestigator",
        target_enrollment AS "targetEnrollment"
      FROM projects
      ORDER BY code
    `)

    res.json(result.rows.map((row) => ({ id: row.code, ...row })))
  } catch (error) {
    next(error)
  }
})

app.post("/api/projects", async (req, res, next) => {
  try {
    const body = req.body as {
      title?: string
      code?: string
      startDate?: string
      endDate?: string
      budget?: number | string
      principalInvestigator?: string
      targetEnrollment?: number | string
      department?: string
    }
    const title = body.title?.trim()
    const code = body.code?.trim()
    const startDate = body.startDate?.trim()
    const endDate = body.endDate?.trim() || null
    const budget = Number(body.budget)
    const principalInvestigator = body.principalInvestigator?.trim()
    const targetEnrollment = Number(body.targetEnrollment)
    const department = body.department?.trim()

    if (
      !title ||
      !code ||
      !startDate ||
      !principalInvestigator ||
      !department ||
      !Number.isFinite(budget) ||
      budget < 0 ||
      !Number.isFinite(targetEnrollment) ||
      targetEnrollment < 0
    ) {
      res.status(400).json({
        error: "Bad Request",
        message: "标题、项目编号、立项日期、预算金额、主要研究者、目标入组例数和研究科室为必填项",
      })
      return
    }

    const result = await query<{
      code: string
      start: string
      end: string
      status: string
      progress: number
      budget: number
      center: string
      name: string
      principalInvestigator: string
      targetEnrollment: number
      department: string
    }>(
      `
        INSERT INTO projects (
          code,
          name,
          center,
          status,
          start_date,
          end_date,
          budget,
          progress,
          principal_investigator,
          target_enrollment,
          department
        )
        VALUES ($1, $2, '瑞金医院', '立项', $3::date, $4::date, $5::integer, 0, $6, $7::integer, $8)
        RETURNING
          code,
          name,
          center,
          department,
          status,
          to_char(start_date, 'YYYY-MM-DD') AS start,
          COALESCE(to_char(end_date, 'YYYY-MM-DD'), '') AS end,
          budget,
          progress,
          principal_investigator AS "principalInvestigator",
          target_enrollment AS "targetEnrollment"
      `,
      [
        code,
        title,
        startDate,
        endDate,
        Math.round(budget),
        principalInvestigator,
        Math.round(targetEnrollment),
        department,
      ],
    )

    const row = result.rows[0]
    res.status(201).json({ id: row.code, ...row })
  } catch (error) {
    const pgError = error as { code?: string }
    if (pgError.code === "23505") {
      res.status(409).json({
        error: "Conflict",
        message: "项目编号已存在",
      })
      return
    }
    next(error)
  }
})

app.get("/api/subjects", async (_req, res, next) => {
  try {
    const result = await query<{
      topicNo: string
      center: string
      screeningNo: string
      randomNo: string
      initials: string
      status: string
      gender: "男" | "女"
      informedAt: string
      enrolledAt: string
      currentVisit: string
      nextVisit: string
    }>(`
      SELECT
        topic_no AS "topicNo",
        center,
        screening_no AS "screeningNo",
        random_no AS "randomNo",
        initials,
        status,
        gender,
        to_char(informed_at, 'YYYY-MM-DD') AS "informedAt",
        to_char(enrolled_at, 'YYYY-MM-DD') AS "enrolledAt",
        current_visit AS "currentVisit",
        next_visit AS "nextVisit"
      FROM subjects
      ORDER BY screening_no
    `)

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

app.get("/api/accounts", async (_req, res, next) => {
  try {
    const result = await query<{
      name: string
      role: string
      hospital: string
      status: string
      phone: string
    }>(`
      SELECT name, role, hospital, status, phone
      FROM accounts
      ORDER BY created_at
    `)

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

app.get("/api/data-matrix", async (_req, res, next) => {
  try {
    const [subjectsResult, visitsResult] = await Promise.all([
      query<{ screeningNo: string }>(`
        SELECT screening_no AS "screeningNo"
        FROM subjects
        ORDER BY screening_no
      `),
      query<{ visit: string; forms: string[] }>(`
        SELECT
          v.code AS visit,
          array_agg(f.name ORDER BY vf.sort_order) AS forms
        FROM visits v
        JOIN visit_forms vf ON vf.visit_id = v.id
        JOIN forms f ON f.id = vf.form_id
        WHERE v.code <> 'V0'
        GROUP BY v.code, v.sort_order
        ORDER BY v.sort_order
      `),
    ])

    res.json({
      patients: subjectsResult.rows.map((row) => row.screeningNo.replace("P", "R10")),
      visits: visitsResult.rows,
    })
  } catch (error) {
    next(error)
  }
})

type CrfSchemaBody = {
  id?: string
  schemaVersion?: "1.0"
  projectId?: string
  code?: string
  name?: string
  version?: number
  status?: "draft" | "published" | "archived"
  category?: "base" | "atomic"
  nodes?: unknown[]
}

type CrfSchemaRow = {
  id: string
  projectId: string
  code: string
  name: string
  version: number
  status: "draft" | "published" | "archived"
  schema: CrfSchemaBody
  createdAt: string
  publishedAt: string | null
}

function hydrateCrfSchema(row: CrfSchemaRow) {
  return {
    ...row.schema,
    id: row.id,
    projectId: row.projectId,
    code: row.code,
    name: row.name,
    version: row.version,
    status: row.status,
    createdAt: row.createdAt,
    publishedAt: row.publishedAt,
  }
}

function normalizeCrfSchema(body: CrfSchemaBody, id = body.id ?? randomUUID()) {
  const projectId = body.projectId?.trim() || "ON101"
  const code = body.code?.trim() || "baseline"
  const name = body.name?.trim() || "未命名表单"
  const version = Number(body.version ?? 1)
  const status = body.status ?? "draft"
  const nodes = Array.isArray(body.nodes) ? body.nodes : []

  if (!projectId || !code || !name || !Number.isInteger(version) || version < 1 || nodes.length === 0) {
    throw new Error("CRF schema requires projectId, code, name, version and nodes")
  }

  return {
    schemaVersion: "1.0" as const,
    id,
    projectId,
    code,
    name,
    version,
    status,
    category: body.category ?? "atomic",
    nodes,
  }
}

app.get("/api/crf-schemas", async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId ?? "ON101")
    const result = await query<CrfSchemaRow>(
      `
        SELECT
          id::text,
          project_id AS "projectId",
          code,
          name,
          version,
          status,
          schema,
          created_at AS "createdAt",
          published_at AS "publishedAt"
        FROM crf_schemas
        WHERE project_id = $1
        ORDER BY code, version DESC
      `,
      [projectId],
    )

    res.json(result.rows.map(hydrateCrfSchema))
  } catch (error) {
    next(error)
  }
})

app.get("/api/crf-schemas/latest", async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId ?? "ON101")
    const code = String(req.query.code ?? "baseline")
    const result = await query<CrfSchemaRow>(
      `
        SELECT
          id::text,
          project_id AS "projectId",
          code,
          name,
          version,
          status,
          schema,
          created_at AS "createdAt",
          published_at AS "publishedAt"
        FROM crf_schemas
        WHERE project_id = $1 AND code = $2
        ORDER BY
          CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END,
          version DESC
        LIMIT 1
      `,
      [projectId, code],
    )

    if (!result.rows[0]) {
      res.status(404).json({ error: "Not Found", message: "CRF schema not found" })
      return
    }

    res.json(hydrateCrfSchema(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.get("/api/crf-schemas/:id", async (req, res, next) => {
  try {
    const result = await query<CrfSchemaRow>(
      `
        SELECT
          id::text,
          project_id AS "projectId",
          code,
          name,
          version,
          status,
          schema,
          created_at AS "createdAt",
          published_at AS "publishedAt"
        FROM crf_schemas
        WHERE id = $1::uuid
      `,
      [req.params.id],
    )

    if (!result.rows[0]) {
      res.status(404).json({ error: "Not Found", message: "CRF schema not found" })
      return
    }

    res.json(hydrateCrfSchema(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.post("/api/crf-schemas", async (req, res, next) => {
  try {
    const schema = normalizeCrfSchema(req.body as CrfSchemaBody)
    const result = await query<CrfSchemaRow>(
      `
        INSERT INTO crf_schemas (id, project_id, code, name, version, status, schema, published_at)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::jsonb, CASE WHEN $6 = 'published' THEN now() ELSE NULL END)
        ON CONFLICT (project_id, code, version) DO UPDATE SET
          name = EXCLUDED.name,
          status = EXCLUDED.status,
          schema = EXCLUDED.schema,
          published_at = CASE WHEN EXCLUDED.status = 'published' THEN COALESCE(crf_schemas.published_at, now()) ELSE crf_schemas.published_at END
        RETURNING
          id::text,
          project_id AS "projectId",
          code,
          name,
          version,
          status,
          schema,
          created_at AS "createdAt",
          published_at AS "publishedAt"
      `,
      [
        schema.id,
        schema.projectId,
        schema.code,
        schema.name,
        schema.version,
        schema.status,
        JSON.stringify(schema),
      ],
    )

    res.status(201).json(hydrateCrfSchema(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.post("/api/crf-schemas/:id/publish", async (req, res, next) => {
  try {
    const result = await query<CrfSchemaRow>(
      `
        UPDATE crf_schemas
        SET
          status = 'published',
          schema = jsonb_set(schema, '{status}', '"published"', true),
          published_at = COALESCE(published_at, now())
        WHERE id = $1::uuid
        RETURNING
          id::text,
          project_id AS "projectId",
          code,
          name,
          version,
          status,
          schema,
          created_at AS "createdAt",
          published_at AS "publishedAt"
      `,
      [req.params.id],
    )

    if (!result.rows[0]) {
      res.status(404).json({ error: "Not Found", message: "CRF schema not found" })
      return
    }

    res.json(hydrateCrfSchema(result.rows[0]))
  } catch (error) {
    next(error)
  }
})

app.get("/api/crf-visit-plan", async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId ?? "ON101")
    const result = await query<{
      visitCode: string
      title: string
      visitSortOrder: number
      schemaId: string | null
      code: string | null
      name: string | null
      version: number | null
      required: boolean | null
      formSortOrder: number | null
      status: string | null
      schema: CrfSchemaBody | null
      createdAt: string | null
      publishedAt: string | null
    }>(
      `
        SELECT
          cpv.visit_code AS "visitCode",
          cpv.title,
          cpv.sort_order AS "visitSortOrder",
          cs.id::text AS "schemaId",
          cs.code,
          cs.name,
          cs.version,
          cvf.required,
          cvf.sort_order AS "formSortOrder",
          cs.status,
          cs.schema,
          cs.created_at AS "createdAt",
          cs.published_at AS "publishedAt"
        FROM crf_project_visits cpv
        LEFT JOIN crf_visit_forms cvf
          ON cvf.project_id = cpv.project_id
         AND cvf.visit_code = cpv.visit_code
        LEFT JOIN crf_schemas cs ON cs.id = cvf.schema_id
        WHERE cpv.project_id = $1
        ORDER BY cpv.sort_order, cvf.sort_order NULLS LAST
      `,
      [projectId],
    )

    const visits = new Map<
      string,
      {
        visitCode: string
        title: string
        sortOrder: number
        forms: Array<{
          schemaId: string
          code: string
          name: string
          version: number
          required: boolean
          sortOrder: number
          schema: unknown
        }>
      }
    >()

    for (const row of result.rows) {
      const visit = visits.get(row.visitCode) ?? {
        visitCode: row.visitCode,
        title: row.title,
        sortOrder: row.visitSortOrder,
        forms: [],
      }
      if (row.schemaId && row.schema && row.code && row.name && row.version !== null) {
        visit.forms.push({
          schemaId: row.schemaId,
          code: row.code,
          name: row.name,
          version: row.version,
          required: row.required ?? true,
          sortOrder: row.formSortOrder ?? visit.forms.length + 1,
          schema: hydrateCrfSchema({
            id: row.schemaId,
            projectId,
            code: row.code,
            name: row.name,
            version: row.version,
            status: (row.status ?? "draft") as "draft" | "published" | "archived",
            schema: row.schema,
            createdAt: row.createdAt ?? "",
            publishedAt: row.publishedAt,
          }),
        })
      }
      visits.set(row.visitCode, visit)
    }

    res.json([...visits.values()])
  } catch (error) {
    next(error)
  }
})

app.post("/api/crf-visit-plan", async (req, res, next) => {
  const client = await pool.connect()
  try {
    const body = req.body as {
      projectId?: string
      visits?: Array<{
        visitCode?: string
        title?: string
        sortOrder?: number
        formSchemaIds?: string[]
      }>
    }
    const projectId = body.projectId?.trim() || "ON101"
    const visits = Array.isArray(body.visits) ? body.visits : []

    if (visits.length === 0) {
      res.status(400).json({ error: "Bad Request", message: "访视计划不能为空" })
      return
    }

    await client.query("BEGIN")
    await client.query("DELETE FROM crf_project_visits WHERE project_id = $1", [projectId])

    for (const [visitIndex, visit] of visits.entries()) {
      const visitCode = visit.visitCode?.trim()
      const title = visit.title?.trim()
      if (!visitCode || !title) continue

      await client.query(
        `
          INSERT INTO crf_project_visits (project_id, visit_code, title, sort_order)
          VALUES ($1, $2, $3, $4)
        `,
        [projectId, visitCode, title, visit.sortOrder ?? visitIndex],
      )

      for (const [formIndex, schemaId] of (visit.formSchemaIds ?? []).entries()) {
        await client.query(
          `
            INSERT INTO crf_visit_forms (project_id, visit_code, schema_id, sort_order, required)
            VALUES ($1, $2, $3::uuid, $4, true)
          `,
          [projectId, visitCode, schemaId, formIndex + 1],
        )
      }
    }

    await client.query("COMMIT")
    res.status(201).json({ ok: true })
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined)
    next(error)
  } finally {
    client.release()
  }
})

app.get("/api/crf-entry-tasks", async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId ?? "ON101")
    const result = await query<{
      id: string | null
      projectId: string
      subjectId: string
      subjectCode: string
      visitCode: string
      visitTitle: string
      schemaId: string
      schemaVersion: number
      schemaCode: string
      schemaName: string
      schemaStatus: "draft" | "published" | "archived"
      schema: CrfSchemaBody
      values: Record<string, unknown> | null
      recordStatus: "draft" | "submitted" | "locked" | null
      sortOrder: number
      createdAt: string
      publishedAt: string | null
    }>(
      `
        SELECT
          cr.id::text,
          cpv.project_id AS "projectId",
          s.id::text AS "subjectId",
          s.screening_no AS "subjectCode",
          cpv.visit_code AS "visitCode",
          cpv.title AS "visitTitle",
          cs.id::text AS "schemaId",
          cs.version AS "schemaVersion",
          cs.code AS "schemaCode",
          cs.name AS "schemaName",
          cs.status AS "schemaStatus",
          cs.schema,
          cr.values,
          cr.status AS "recordStatus",
          cpv.sort_order * 100 + cvf.sort_order AS "sortOrder",
          cs.created_at AS "createdAt",
          cs.published_at AS "publishedAt"
        FROM subjects s
        CROSS JOIN crf_project_visits cpv
        JOIN crf_visit_forms cvf
          ON cvf.project_id = cpv.project_id
         AND cvf.visit_code = cpv.visit_code
        JOIN crf_schemas cs ON cs.id = cvf.schema_id
        LEFT JOIN crf_records cr
          ON cr.subject_id = s.id
         AND cr.visit_code = cpv.visit_code
         AND cr.schema_id = cs.id
        WHERE cpv.project_id = $1
        ORDER BY s.screening_no, cpv.sort_order, cvf.sort_order
      `,
      [projectId],
    )

    res.json(
      result.rows.map((row) => ({
        id: row.id,
        taskId: `${row.subjectId}:${row.visitCode}:${row.schemaId}`,
        projectId: row.projectId,
        subjectId: row.subjectId,
        subjectCode: row.subjectCode,
        visitCode: row.visitCode,
        visitTitle: row.visitTitle,
        schemaId: row.schemaId,
        schemaVersion: row.schemaVersion,
        schema: hydrateCrfSchema({
          id: row.schemaId,
          projectId: row.projectId,
          code: row.schemaCode,
          name: row.schemaName,
          version: row.schemaVersion,
          status: row.schemaStatus,
          schema: row.schema,
          createdAt: row.createdAt,
          publishedAt: row.publishedAt,
        }),
        values: row.values ?? {},
        status: row.recordStatus ?? "not_started",
        sortOrder: row.sortOrder,
      })),
    )
  } catch (error) {
    next(error)
  }
})

app.get("/api/crf-records", async (req, res, next) => {
  try {
    const projectId = String(req.query.projectId ?? "ON101")
    const schemaId = String(req.query.schemaId ?? "")
    const result = await query<{
      id: string
      projectId: string
      subjectId: string
      subjectCode: string
      visitCode: string
      schemaId: string
      schemaVersion: number
      values: Record<string, unknown>
      status: string
      createdAt: string
      updatedAt: string
    }>(
      `
        SELECT
          cr.id::text,
          cr.project_id AS "projectId",
          cr.subject_id::text AS "subjectId",
          s.screening_no AS "subjectCode",
          cr.visit_code AS "visitCode",
          cr.schema_id::text AS "schemaId",
          cr.schema_version AS "schemaVersion",
          cr.values,
          cr.status,
          cr.created_at AS "createdAt",
          cr.updated_at AS "updatedAt"
        FROM crf_records cr
        JOIN subjects s ON s.id = cr.subject_id
        WHERE cr.project_id = $1
          AND ($2 = '' OR cr.schema_id = $2::uuid)
        ORDER BY s.screening_no, cr.visit_code
      `,
      [projectId, schemaId],
    )

    res.json(result.rows)
  } catch (error) {
    next(error)
  }
})

app.post("/api/crf-records", async (req, res, next) => {
  try {
    const body = req.body as {
      projectId?: string
      subjectId?: string
      visitCode?: string
      schemaId?: string
      schemaVersion?: number
      values?: Record<string, unknown>
      status?: "draft" | "submitted"
    }

    if (!body.projectId || !body.subjectId || !body.visitCode || !body.schemaId || !body.schemaVersion) {
      res.status(400).json({ error: "Bad Request", message: "缺少 CRF 记录必要字段" })
      return
    }

    const result = await query(
      `
        INSERT INTO crf_records (project_id, subject_id, visit_code, schema_id, schema_version, values, status)
        VALUES ($1, $2::uuid, $3, $4::uuid, $5, $6::jsonb, $7)
        ON CONFLICT (subject_id, visit_code, schema_id) DO UPDATE SET
          values = EXCLUDED.values,
          status = EXCLUDED.status,
          updated_at = now()
        RETURNING id::text
      `,
      [
        body.projectId,
        body.subjectId,
        body.visitCode,
        body.schemaId,
        body.schemaVersion,
        JSON.stringify(body.values ?? {}),
        body.status ?? "draft",
      ],
    )

    res.status(201).json({ id: result.rows[0].id })
  } catch (error) {
    next(error)
  }
})

app.patch("/api/crf-records/:id", async (req, res, next) => {
  try {
    const body = req.body as { values?: Record<string, unknown>; status?: "draft" | "submitted" | "locked" }
    const result = await query(
      `
        UPDATE crf_records
        SET
          values = COALESCE($2::jsonb, values),
          status = COALESCE($3, status),
          updated_at = now()
        WHERE id = $1::uuid
        RETURNING id::text
      `,
      [req.params.id, body.values === undefined ? null : JSON.stringify(body.values), body.status ?? null],
    )

    if (!result.rows[0]) {
      res.status(404).json({ error: "Not Found", message: "CRF record not found" })
      return
    }

    res.json({ id: result.rows[0].id })
  } catch (error) {
    next(error)
  }
})

const formTreeHandler: express.RequestHandler = async (req, res, next) => {
  try {
    const screeningNo = (req.params as { screeningNo?: string }).screeningNo ?? "P001"
    const result = await query<{
      visit: string
      title: string
      form: string
      done: boolean
      visitDone: boolean
    }>(
      `
        SELECT
          v.code AS visit,
          v.title,
          f.name AS form,
          COALESCE(fe.done, false) AS done,
          bool_and(COALESCE(fe.done, false)) OVER (PARTITION BY v.id) AS "visitDone"
        FROM visits v
        JOIN visit_forms vf ON vf.visit_id = v.id
        JOIN forms f ON f.id = vf.form_id
        LEFT JOIN subjects s ON s.screening_no = $1
        LEFT JOIN form_entries fe
          ON fe.subject_id = s.id
         AND fe.visit_id = v.id
         AND fe.form_id = f.id
        WHERE v.code IN ('V0', 'V1')
        ORDER BY v.sort_order, vf.sort_order
      `,
      [screeningNo],
    )

    const grouped = new Map<
      string,
      { label: string; done: boolean; children: Array<{ label: string; done: boolean }> }
    >()

    for (const row of result.rows) {
      const label = `${row.visit}-${row.title}`
      const group = grouped.get(row.visit) ?? {
        label,
        done: row.visitDone,
        children: [],
      }
      group.done = row.visitDone
      group.children.push({ label: row.form, done: row.done })
      grouped.set(row.visit, group)
    }

    res.json([...grouped.values()])
  } catch (error) {
    next(error)
  }
}

app.get("/api/form-tree", formTreeHandler)
app.get("/api/form-tree/:screeningNo", formTreeHandler)

app.get("/api/stats/overview", async (_req, res, next) => {
  try {
    const [projectStatus, budget, subjectStatus, filterGroup] = await Promise.all([
      query<{ name: string; value: number }>(`
        SELECT status AS name, count(*)::int AS value
        FROM projects
        GROUP BY status
        ORDER BY status
      `),
      query<{ name: string; budget: number }>(`
        SELECT code AS name, budget
        FROM projects
        ORDER BY code
      `),
      query<{ name: string; value: number }>(`
        SELECT status AS name, count(*)::int AS value
        FROM subjects
        GROUP BY status
        ORDER BY status
      `),
      query<{ name: string; screened: number; grouped: number }>(`
        SELECT
          substring(topic_no from 1 for 5) AS name,
          count(*)::int AS screened,
          count(*) FILTER (WHERE status IN ('治疗期', '完成研究', '退出研究'))::int AS grouped
        FROM subjects
        GROUP BY substring(topic_no from 1 for 5)
        ORDER BY name
      `),
    ])

    res.json({
      projectStatus: projectStatus.rows,
      budget: budget.rows,
      subjectStatus: subjectStatus.rows,
      filterGroup: filterGroup.rows,
    })
  } catch (error) {
    next(error)
  }
})

app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(error)
  res.status(500).json({
    error: "Internal Server Error",
    message: error instanceof Error ? error.message : "Unknown error",
  })
})

if (!process.env.VERCEL) {
  const server = app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`)
  })

  const shutdown = async () => {
    server.close()
    await closePool()
    process.exit(0)
  }

  process.on("SIGINT", shutdown)
  process.on("SIGTERM", shutdown)
}

export default app
