import type { Subject } from "@/data/mock"
import type {
  CrfEntryTask,
  CrfRecord,
  CrfRecordDraft,
  CrfSchema,
  CrfVisitPlanItem,
  CrfVisitPlanPayload,
} from "@/lib/crf"

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "/api"

export interface ProjectProgressRow {
  id: string
  code: string
  name: string
  center: string
  department: string
  start: string
  end: string
  status: string
  budget: number
  progress: number
  principalInvestigator: string
  targetEnrollment: number
}

export interface CreateProjectPayload {
  title: string
  code: string
  startDate: string
  endDate?: string
  budget: number
  principalInvestigator: string
  targetEnrollment: number
  department: string
}

export interface AccountRow {
  name: string
  role: string
  hospital: string
  status: string
  phone: string
}

export interface DataMatrixResponse {
  patients: string[]
  visits: Array<{ visit: string; forms: string[] }>
}

export interface FormTreeItem {
  label: string
  done: boolean
  children: Array<{ label: string; done: boolean }>
}

export interface StatsOverview {
  projectStatus: Array<{ name: string; value: number }>
  budget: Array<{ name: string; budget: number }>
  subjectStatus: Array<{ name: string; value: number }>
  filterGroup: Array<{ name: string; screened: number; grouped: number }>
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`)
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message ?? `Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

async function patchJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message ?? `Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

async function deleteJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: "DELETE",
  })
  if (!response.ok) {
    const errorBody = await response.json().catch(() => null)
    throw new Error(errorBody?.message ?? `Request failed: ${response.status} ${response.statusText}`)
  }
  return response.json() as Promise<T>
}

const encodePath = (value: string) => encodeURIComponent(value)

export const api = {
  health: () => getJson<{ ok: boolean }>("/health"),
  projects: () => getJson<ProjectProgressRow[]>("/projects"),
  createProject: (payload: CreateProjectPayload) => postJson<ProjectProgressRow>("/projects", payload),
  subjects: () => getJson<Subject[]>("/subjects"),
  accounts: () => getJson<AccountRow[]>("/accounts"),
  dataMatrix: () => getJson<DataMatrixResponse>("/data-matrix"),
  formTree: (screeningNo = "P001") => getJson<FormTreeItem[]>(`/form-tree/${screeningNo}`),
  statsOverview: () => getJson<StatsOverview>("/stats/overview"),
  crfSchemas: (projectId = "ON101") => getJson<CrfSchema[]>(`/crf-schemas?projectId=${projectId}`),
  latestCrfSchema: (projectId = "ON101", code = "baseline") =>
    getJson<CrfSchema>(`/crf-schemas/latest?projectId=${projectId}&code=${code}`),
  saveCrfSchema: (schema: CrfSchema) => postJson<CrfSchema>("/crf-schemas", schema),
  publishCrfSchema: (schemaId: string) => postJson<CrfSchema>(`/crf-schemas/${schemaId}/publish`, {}),
  crfVisitPlan: (projectId = "ON101") => getJson<CrfVisitPlanItem[]>(`/crf-visit-plan?projectId=${projectId}`),
  saveCrfVisitPlan: (payload: CrfVisitPlanPayload) => postJson<{ ok: boolean }>("/crf-visit-plan", payload),
  createCrfVisit: (projectId: string, body: { visitCode: string; title: string; sortKey: string }) =>
    postJson<{ ok: boolean }>(`/projects/${encodePath(projectId)}/crf-visits`, body),
  updateCrfVisit: (
    projectId: string,
    visitCode: string,
    body: Partial<{ title: string; sortKey: string }>,
  ) => patchJson<{ ok: boolean }>(`/projects/${encodePath(projectId)}/crf-visits/${encodePath(visitCode)}`, body),
  deleteCrfVisit: (projectId: string, visitCode: string) =>
    deleteJson<{ ok: boolean }>(`/projects/${encodePath(projectId)}/crf-visits/${encodePath(visitCode)}`),
  addCrfVisitForm: (
    projectId: string,
    visitCode: string,
    body: { schemaId: string; sortKey: string; required?: boolean },
  ) =>
    postJson<{ ok: boolean }>(
      `/projects/${encodePath(projectId)}/crf-visits/${encodePath(visitCode)}/forms`,
      body,
    ),
  updateCrfVisitForm: (
    projectId: string,
    visitCode: string,
    schemaId: string,
    body: Partial<{ sortKey: string; required: boolean }>,
  ) =>
    patchJson<{ ok: boolean }>(
      `/projects/${encodePath(projectId)}/crf-visits/${encodePath(visitCode)}/forms/${encodePath(schemaId)}`,
      body,
    ),
  deleteCrfVisitForm: (projectId: string, visitCode: string, schemaId: string) =>
    deleteJson<{ ok: boolean }>(
      `/projects/${encodePath(projectId)}/crf-visits/${encodePath(visitCode)}/forms/${encodePath(schemaId)}`,
    ),
  crfEntryTasks: (projectId = "ON101") => getJson<CrfEntryTask[]>(`/crf-entry-tasks?projectId=${projectId}`),
  crfRecords: (projectId = "ON101", schemaId?: string) =>
    getJson<CrfRecord[]>(
      `/crf-records?projectId=${projectId}${schemaId ? `&schemaId=${schemaId}` : ""}`,
    ),
  saveCrfRecord: (record: CrfRecordDraft) => postJson<{ id: string }>("/crf-records", record),
  updateCrfRecord: (recordId: string, body: Pick<CrfRecordDraft, "values" | "status">) =>
    patchJson<{ id: string }>(`/crf-records/${recordId}`, body),
}
