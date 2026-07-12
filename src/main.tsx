import React from "react"
import ReactDOM from "react-dom/client"
import {
  Outlet,
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
import { LoginPage } from "@/pages/LoginPage"
import { OrganizationsPage } from "@/pages/OrganizationsPage"
import { PatientsPage } from "@/pages/PatientsPage"
import { ProjectOverviewPage } from "@/pages/ProjectOverviewPage"
import { StatisticsPage } from "@/pages/StatisticsPage"
import "@/index.css"

const rootRoute = createRootRoute({
  component: Outlet,
})

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
})

const appRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: "app",
  component: AppShell,
})

const indexRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/",
  component: DashboardPage,
})

const projectsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/projects",
  component: ProjectsPage,
})

const projectOverviewRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/projects/$projectId",
  component: ProjectOverviewPage,
})

const projectCrfRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/projects/$projectId/crf",
  component: CrfPlanPage,
})

const progressRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/progress",
  component: ProgressPage,
})

const patientsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/patients",
  component: PatientsPage,
})

const dataRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/data",
  component: DataManagementPage,
})

const crfDesignerRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/crf/designer",
  component: CrfPlanPage,
})

const crfFormsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/crf/forms",
  component: CrfFormsLibraryPage,
})

const crfFormDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/crf/forms/$schemaId",
  component: CrfDesignerPage,
})

const crfEntryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/crf/entry",
  component: CrfEntryPage,
})

const statisticsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/statistics",
  component: StatisticsPage,
})

const accountsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/accounts",
  component: AccountsPage,
})

const organizationsRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/organizations",
  component: OrganizationsPage,
})

const registrationRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/registration",
  component: RegistrationPage,
})

const entryRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/entry",
  component: DataEntryPage,
})

const entryDetailRoute = createRoute({
  getParentRoute: () => appRoute,
  path: "/entry/detail",
  component: DataDetailPage,
})

const routeTree = rootRoute.addChildren([
  loginRoute,
  appRoute.addChildren([
    indexRoute,
    projectsRoute,
    projectOverviewRoute,
    projectCrfRoute,
    progressRoute,
    patientsRoute,
    dataRoute,
    crfDesignerRoute,
    crfFormsRoute,
    crfFormDetailRoute,
    crfEntryRoute,
    statisticsRoute,
    accountsRoute,
    organizationsRoute,
    registrationRoute,
    entryRoute,
    entryDetailRoute,
  ]),
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
