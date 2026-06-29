import { useQuery } from "@tanstack/react-query"
import { useMutation } from "@tanstack/react-query"

import { api } from "@/lib/api"

export function useProjectsQuery() {
  return useQuery({
    queryKey: ["projects"],
    queryFn: api.projects,
  })
}

export function useCreateProjectMutation() {
  return useMutation({
    mutationFn: api.createProject,
  })
}

export function useSubjectsQuery() {
  return useQuery({
    queryKey: ["subjects"],
    queryFn: api.subjects,
  })
}

export function useAccountsQuery() {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: api.accounts,
  })
}

export function useDataMatrixQuery() {
  return useQuery({
    queryKey: ["data-matrix"],
    queryFn: api.dataMatrix,
  })
}

export function useFormTreeQuery(screeningNo = "P001") {
  return useQuery({
    queryKey: ["form-tree", screeningNo],
    queryFn: () => api.formTree(screeningNo),
  })
}

export function useStatsOverviewQuery() {
  return useQuery({
    queryKey: ["stats-overview"],
    queryFn: api.statsOverview,
  })
}

export function useCrfSchemasQuery(projectId = "ON101") {
  return useQuery({
    queryKey: ["crf-schemas", projectId],
    queryFn: () => api.crfSchemas(projectId),
  })
}

export function useLatestCrfSchemaQuery(projectId = "ON101", code = "baseline") {
  return useQuery({
    queryKey: ["crf-schema", projectId, code],
    queryFn: () => api.latestCrfSchema(projectId, code),
  })
}

export function useSaveCrfSchemaMutation() {
  return useMutation({
    mutationFn: api.saveCrfSchema,
  })
}

export function usePublishCrfSchemaMutation() {
  return useMutation({
    mutationFn: api.publishCrfSchema,
  })
}

export function useCrfRecordsQuery(projectId = "ON101", schemaId?: string) {
  return useQuery({
    queryKey: ["crf-records", projectId, schemaId],
    queryFn: () => api.crfRecords(projectId, schemaId),
    enabled: Boolean(schemaId),
  })
}

export function useSaveCrfRecordMutation() {
  return useMutation({
    mutationFn: api.saveCrfRecord,
  })
}

export function useCrfVisitPlanQuery(projectId = "ON101") {
  return useQuery({
    queryKey: ["crf-visit-plan", projectId],
    queryFn: () => api.crfVisitPlan(projectId),
  })
}

export function useSaveCrfVisitPlanMutation() {
  return useMutation({
    mutationFn: api.saveCrfVisitPlan,
  })
}

export function useCrfEntryTasksQuery(projectId = "ON101") {
  return useQuery({
    queryKey: ["crf-entry-tasks", projectId],
    queryFn: () => api.crfEntryTasks(projectId),
  })
}
