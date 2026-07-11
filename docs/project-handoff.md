# ClinixTrials RDMS 项目上下文

这份文档用于在移动目录、切换电脑或新开 Codex 任务后快速接续开发。聊天记录由 Codex 应用管理，不保存在 Git 仓库中；新任务可以先读取本文件和 Git 历史。

## 项目定位

ClinixTrials RDMS 是科研数据管理系统。当前主要业务入口是项目管理、项目内 CRF 访视计划和原子表格库。

CRF 的核心关系：

- 原子表格是可跨项目复用的独立表格定义。
- 项目通过访视计划定义 V0、V1、V2 等访视节点。
- 每个访视选择并排序需要填写的原子表格。
- 原子表格设计与访视计划解耦；计划只引用表格。

## 技术栈

- Vite + React + TypeScript
- TanStack Router、TanStack Query、TanStack Table
- Tailwind CSS、Radix UI / shadcn 风格组件
- Express API
- PostgreSQL + Drizzle ORM / Drizzle Kit
- Vercel 部署，Neon PostgreSQL 托管数据库

## 常用命令

```bash
npm install
npm run dev
npm run build
npm run db:up
npm run db:migrate
npm run db:seed
npm run db:init
```

`db:init` 会先运行 Drizzle migration，再按顺序执行 `db/init/*.sql` 写入可重复执行的默认数据。

## 环境变量

本地 `.env` 不提交 Git，至少包含：

```bash
DATABASE_URL=postgres://...
API_PORT=4000
PG_POOL_MAX=10
VITE_API_BASE_URL=/api
```

Vercel 已配置 Neon `DATABASE_URL`。迁移由开发者通过 `npm run db:migrate` 或 `npm run db:init` 手动执行，不放进 Vercel build。

## 当前实现

- 项目详情通过 `/projects/:projectId/crf` 进入访视计划。
- 访视和访视内表格都使用 fractional sort key 排序。
- 添加、修改、删除和排序均调用单行 API，不整份覆盖保存。
- 访视内表格默认折叠，可展开预览字段并拖拽排序。
- “添加表格”使用 Radix Popover，支持搜索现有原子表格和跳转新建。
- `visitCode` 当前只读，因为它参与主键和外键关系。

## 数据模型

CRF 主要表：

- `crf_schemas`：原子表格 schema 元数据与字段 JSON。
- `crf_project_visits`：项目访视节点。
- `crf_visit_forms`：访视与原子表格的关联及内层排序。
- `crf_records`：根据 schema 填写的数据记录。

仓库仍保留部分旧的 `forms`、`visit_forms`、`form_entries` 流程，后续需要逐步确认迁移和下线路径。

## Git 与部署

- GitHub：`git@github.com:yanbingbing/clinixtrials-rdms.git`
- 主分支：`main`
- Vercel 从 GitHub 自动部署。
- 数据库 migration 和默认数据初始化不由 Vercel 自动执行。

开始新任务时先运行：

```bash
git status --short --branch
npm run build
```
