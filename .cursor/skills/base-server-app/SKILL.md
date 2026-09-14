---
name: base-server-app
description: >-
  Guides secondary feature development on GravityD (Vue3 + self-hosted InsForge
  admin scaffold): new business modules, sys_menu entries, Postgres tables/RLS/migrations,
  Vue CRUD pages, and InsForge SDK APIs. Use when adding a module, menu, table,
  list/CRUD page, or when the user mentions GravityD, 二次开发, 新模块, module_*, sys_menu,
  migration, or InsForge schema.
---

# GravityD 二次开发

本仓库是 **GravityD** 中后台脚手架，运行时走**自托管 InsForge**。二次开发默认只改：

- `insforge-app/migrations/`（表 / RLS / 菜单种子）
- `frontend/web/`（页面、API、路由由菜单驱动）

不要复活 FastAPI `8001` 当主后端。不要在仓库根执行官方 `setup.sh` 或 `pnpm add`。

先读完本文件再改代码。细节按需打开：

- 环境、端口、禁令、账号：[reference.md](reference.md)
- 新模块完整清单（表 + 菜单 + API + 页）：[new-module.md](new-module.md)
- SDK 通用用法：已安装的 `insforge` skill（`@insforge/sdk`）。依赖只装在 `frontend/web`。

## 开工前

1. InsForge：`bash scripts/insforge-up.sh` → http://127.0.0.1:7130
2. 前端：在 `frontend/web` 执行 `./node_modules/.bin/vite --mode development` → http://127.0.0.1:5180/web
3. 后台账号 `admin@local.dev` / `123456`。旧 token 先清 `localStorage`。
4. 本机 `5432` / `6379` 等容器是别人的，**不要停、不要改端口抢占**。InsForge Postgres 必须是 `5433`。

大域新业务可按用户 6A 规范写 `docs/<任务名>/`。普通 CRUD 直接走 [new-module.md](new-module.md)。

## 硬约束

- 用户主键对齐 `auth.users(id)`（UUID）。业务表用 `profiles.id`，不要自建密码字段。
- 列表：`select('*')` 后**内存过滤 / 排序 / 分页**。禁止 `{ count: 'exact' } + range`（`head: true` 的行数统计除外）。
- 列名 `"order"` 禁止 `.order('order')`，内存排序。
- API 包装必须走 `frontend/web/src/utils/insforge-api.ts` 的 `ok()` / `unwrap()` / `pageOf()` / `rangeOf()` / `buildTree()`。`ok()` 的 `code` 必须是 `ResultEnum.SUCCESS = 0`。
- 客户端只用 `frontend/web/src/utils/insforge.ts` 的 `createClient({ baseUrl, anonKey, isServerMode: true })`。
- 未登录用 `HttpError(401)`（见 `currentUserId()`），不要吞掉后让页面空白。
- 导出 / 导入 / 上传未做就 `throw new Error("未迁移导出")`，不要假装打 FastAPI。
- **不要重跑** `002_seed_system.sql`（会 `TRUNCATE ... CASCADE` 清掉 profiles）。
- 菜单增量 `DELETE` 必须带 id 范围，避免误删其它模块。
- 新迁移末尾加 `NOTIFY pgrst, 'reload schema';`
- 不要提交 `.env`、`insforge/.env`、`fastapiadmin.db*`、密钥。

## 目录约定

| 用途 | 路径 |
|---|---|
| 表 / RLS / 种子 | `insforge-app/migrations/0xx_*.sql` |
| 已有增量脚本 | `insforge-app/scripts/apply-extra.sh`（003–006） |
| 前端 API | `frontend/web/src/api/module_<域>/<资源>.ts` |
| 页面 | `frontend/web/src/views/module_<域>/<资源>/index.vue` |
| SDK 入口 | `frontend/web/src/utils/insforge.ts` |
| 动态路由 | 菜单驱动，不要手写 `addRoute` 业务页 |

**不要迁**（页面可留着，不要接 InsForge、不要进侧栏）：代码生成、工作流、定时任务、AI、内部聊天、服务器监控、缓存监控。

已占用菜单 id：`1–49` 一期系统，`50–89` 扩展系统，`90–99` InsForge。**新业务从 `100` 起**，按 10/50 一段预留，写进迁移注释。

## 标准落地顺序

复制清单并打勾：

```
- [ ] SQL：表 + 索引 + RLS + 菜单 + SUPER_ADMIN 授权
- [ ] 应用迁移（docker compose exec psql，不要跑 002）
- [ ] API：insforge.database + ok/unwrap，对照 position.ts
- [ ] 页面：复制 module_system/position，改 API / 权限码 / 列
- [ ] 菜单 route_path / component_path / permission 对齐
- [ ] 浏览器点侧栏走通列表与新增
```

权限码：`module_<域>:<资源>:<动作>`，动作用 `query|create|update|delete|patch|detail|export`。

菜单类型：`1` 目录（绝对 path + redirect），`2` 页面（相对 path + `component_path`），`3` 按钮（只有 permission）。

`component_path` 例：`module_crm/customer/index`（无 `.vue`，对应 `src/views/...`）。

## 对照实现

- API：`frontend/web/src/api/module_system/position.ts`
- 页：`frontend/web/src/views/module_system/position/index.vue`（`FaSearchBar` + `FaTable` + `useTable`）
- 菜单种子：`insforge-app/migrations/005_insforge_menu.sql`
- 表 + RLS：`insforge-app/migrations/001_system_schema.sql`、`003_system_extend.sql`

## 验收

改了 UI / 路由 / 列表，必须在浏览器点侧栏进页，不要只截一张图。hash 路由形如 `http://127.0.0.1:5180/web/#/crm/customer`。

侧栏目录点标题会进第一个子页；子项多时侧栏可滚动。工作标签里的 404 旧路由会被清掉。
