import {
  boolean,
  date,
  foreignKey,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core"

export const projects = pgTable("projects", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  center: text("center").notNull(),
  status: text("status").notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  budget: integer("budget").notNull(),
  progress: integer("progress").notNull(),
  principalInvestigator: text("principal_investigator").notNull(),
  targetEnrollment: integer("target_enrollment").notNull(),
  department: text("department").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const subjects = pgTable("subjects", {
  id: uuid("id").primaryKey().defaultRandom(),
  topicNo: text("topic_no").notNull(),
  center: text("center").notNull(),
  screeningNo: text("screening_no").notNull().unique(),
  randomNo: text("random_no").notNull(),
  initials: text("initials").notNull(),
  status: text("status").notNull(),
  gender: text("gender").notNull(),
  informedAt: date("informed_at").notNull(),
  enrolledAt: date("enrolled_at").notNull(),
  currentVisit: text("current_visit").notNull(),
  nextVisit: text("next_visit").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  role: text("role").notNull(),
  hospital: text("hospital").notNull(),
  status: text("status").notNull(),
  phone: text("phone").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
})

export const visits = pgTable("visits", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  title: text("title").notNull(),
  sortOrder: integer("sort_order").notNull().unique(),
})

export const forms = pgTable("forms", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  sortOrder: integer("sort_order").notNull().unique(),
})

export const visitForms = pgTable(
  "visit_forms",
  {
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.visitId, table.formId] }),
  }),
)

export const formEntries = pgTable(
  "form_entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    visitId: uuid("visit_id")
      .notNull()
      .references(() => visits.id, { onDelete: "cascade" }),
    formId: uuid("form_id")
      .notNull()
      .references(() => forms.id, { onDelete: "cascade" }),
    done: boolean("done").notNull().default(false),
    value: jsonb("value").notNull().default({}),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueEntry: unique().on(table.subjectId, table.visitId, table.formId),
  }),
)

export const crfSchemas = pgTable(
  "crf_schemas",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.code, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    version: integer("version").notNull(),
    status: text("status").notNull(),
    schema: jsonb("schema").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    uniqueSchemaVersion: unique().on(table.projectId, table.code, table.version),
  }),
)

export const crfRecords = pgTable(
  "crf_records",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectId: text("project_id")
      .notNull()
      .references(() => projects.code, { onDelete: "cascade" }),
    subjectId: uuid("subject_id")
      .notNull()
      .references(() => subjects.id, { onDelete: "cascade" }),
    visitCode: text("visit_code")
      .notNull()
      .references(() => visits.code),
    schemaId: uuid("schema_id")
      .notNull()
      .references(() => crfSchemas.id, { onDelete: "restrict" }),
    schemaVersion: integer("schema_version").notNull(),
    values: jsonb("values").notNull().default({}),
    status: text("status").notNull().default("draft"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uniqueRecord: unique().on(table.subjectId, table.visitCode, table.schemaId),
  }),
)

export const crfProjectVisits = pgTable(
  "crf_project_visits",
  {
    projectId: text("project_id")
      .notNull()
      .references(() => projects.code, { onDelete: "cascade" }),
    visitCode: text("visit_code")
      .notNull()
      .references(() => visits.code),
    title: text("title").notNull(),
    sortOrder: integer("sort_order").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.visitCode] }),
    uniqueSortOrder: unique().on(table.projectId, table.sortOrder),
  }),
)

export const crfVisitForms = pgTable(
  "crf_visit_forms",
  {
    projectId: text("project_id").notNull(),
    visitCode: text("visit_code").notNull(),
    schemaId: uuid("schema_id")
      .notNull()
      .references(() => crfSchemas.id, { onDelete: "restrict" }),
    sortOrder: integer("sort_order").notNull(),
    required: boolean("required").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.projectId, table.visitCode, table.schemaId] }),
    visitFk: foreignKey({
      columns: [table.projectId, table.visitCode],
      foreignColumns: [crfProjectVisits.projectId, crfProjectVisits.visitCode],
    }).onDelete("cascade"),
  }),
)
