import React from "react"
import ReactDOM from "react-dom/client"
import {
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

import { AppShell } from "@/components/layout/AppShell"
import { CrfDesignerPage } from "@/pages/CrfDesignerPage"
import { CrfEntryPage } from "@/pages/CrfEntryPage"
import { CrfFormsLibraryPage } from "@/pages/CrfFormsLibraryPage"
import { CrfPlanPage } from "@/pages/CrfPlanPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { DataDetailPage } from "@/pages/DataDetailPage"
import { DataEntryPage } from "@/pages/DataEntryPage"
import { DataManagementPage } from "@/pages/DataManagementPage"
import {
  AccountsPage,
  ProgressPage,
  ProjectsPage,
  RegistrationPage,
} from "@/pages/GenericManagementPage"
import { PatientsPage } from "@/pages/PatientsPage"
import { ProjectOverviewPage } from "@/pages/ProjectOverviewPage"
import { StatisticsPage } from "@/pages/StatisticsPage"
import "@/index.css"

const rootRoute = createRootRoute({
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: DashboardPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
})

const projectOverviewRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects/$projectId",
  component: ProjectOverviewPage,
})

const progressRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/progress",
  component: ProgressPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/patients",
  component: PatientsPage,
})

const dataRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/data",
  component: DataManagementPage,
})

const crfDesignerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crf/designer",
  component: CrfPlanPage,
})

const crfFormsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crf/forms",
  component: CrfFormsLibraryPage,
})

const crfFormDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crf/forms/$schemaId",
  component: CrfDesignerPage,
})

const crfEntryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/crf/entry",
  component: CrfEntryPage,
})

const statisticsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/statistics",
  component: StatisticsPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accounts",
  component: AccountsPage,
})

const registrationRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/registration",
  component: RegistrationPage,
})

const entryRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/entry",
  component: DataEntryPage,
})

const entryDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/entry/detail",
  component: DataDetailPage,
})

const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  projectOverviewRoute,
  progressRoute,
  patientsRoute,
  dataRoute,
  crfDesignerRoute,
  crfFormsRoute,
  crfFormDetailRoute,
  crfEntryRoute,
  statisticsRoute,
  accountsRoute,
  registrationRoute,
  entryRoute,
  entryDetailRoute,
])

const router = createRouter({ routeTree })
const queryClient = new QueryClient()

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router
  }
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>,
)
