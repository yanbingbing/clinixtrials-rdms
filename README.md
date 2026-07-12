# ClinixTrials RDMS

科研数据管理系统前端与 API。当前部署目标是 Vercel + Postgres + Drizzle。

## 本地开发

```bash
npm install
npm run db:up
npm run dev
```

本地默认数据库连接：

```bash
DATABASE_URL=postgres://clinixtrials:clinixtrials@localhost:5432/clinixtrials_rdms
```

## Vercel 部署

Vercel 负责：

- Vite 前端静态构建
- `/api/*` Node.js Functions

Postgres 使用外部服务，例如 Neon / Supabase / Railway。不要在 Vercel 上跑 `docker-compose.yml`。

Vercel 环境变量至少需要：

```bash
DATABASE_URL=postgres://...
VITE_API_BASE_URL=/api
```

## Drizzle

生成迁移：

```bash
npm run db:generate
```

执行迁移：

```bash
npm run db:migrate
```

执行迁移并写入默认数据：

```bash
npm run db:init
```

单独创建或重置默认登录账号：

```bash
npm run db:seed:auth
```

默认账号可以通过环境变量覆盖：

```bash
SEED_USER_EMAIL=me@example.com \
SEED_USER_PASSWORD='change-me' \
SEED_USER_NAME='默认管理员' \
npm run db:seed:auth
```

迁移不会在 Vercel build 阶段自动执行，需要手动跑。

## API

本地开发入口：

```bash
npm run api
```

Vercel 入口：

```txt
api/[...path].ts
```

Express app 复用 `server/src/index.ts` 导出的 `app`。
