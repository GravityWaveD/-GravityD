# GravityD CLI 开发使用说明

面向要在本仓库做二次开发的同学和 Agent。读完应能：把当前仓库绑到 CLI、生成一个业务 CRUD 模块、把迁移套进自托管 InsForge、在后台侧栏走通。

整体环境、端口、菜单约定仍看 [开发指南.md](./开发指南.md)。本文件只讲 **`@gravityd/cli`**。

---

## 1. 这是什么

对标官方：

```bash
npx @insforge/cli link --project-id <project-id>
```

InsForge 云端 `link` 会写 `.insforge/project.json`（含 `api_key` / `oss_host`）。GravityD 是**仓库内自托管**，没有云端 project-id，对应命令是：

```bash
npx --yes ./packages/gravityd-cli link --project-id local -y
```

它只做三件事：

1. 确认当前目录是 GravityD 仓库（存在 `insforge-app/migrations`、`frontend/web`、`scripts/lib.sh`）。
2. 写入 `.gravityd/project.json`（项目标识、InsForge 地址、仓库根路径）。
3. 后续 `module add` / `migrate apply` / `up` 都认这份绑定。

**不写入密钥。** `ACCESS_ANON_KEY`、`ROOT_ADMIN_PASSWORD`、`VITE_INSFORGE_ANON_KEY` 仍只在 `insforge/.env` 和 `frontend/web/.env*`。`.gravityd/` 已 gitignore，不要提交。

包名 `@gravityd/cli`，命令名 `gravityd`。目前**没有发到 npm**，用仓库内路径调用。

---

## 2. 前置条件

| 项 | 要求 |
|---|---|
| Node.js | ≥ 20 |
| 工作目录 | GravityD 仓库根，或其子目录（会向上查找） |
| 本地栈 | 二次开发前建议 `bash scripts/init.sh` 已跑过；日常 `bash scripts/dev.sh` |
| Docker | `module add --apply`、`migrate apply`、`up` 需要引擎 Running |
| Postgres | InsForge 映射在 `127.0.0.1:5433`，不要动别人的 `5432` / `6379` |

CLI **不会**代替 `init.sh` 克隆 `insforge/` 或写前端 `.env`。没有 `insforge/` 时仍可 `link` 和 `--dry-run` 生成文件，但不能 `apply` / `up`。

---

## 3. 怎么调用

三种入口等价：

```bash
npx --yes ./packages/gravityd-cli <命令> [参数]
node packages/gravityd-cli/bin/gravityd.mjs <命令> [参数]
bash scripts/gravityd <命令> [参数]
```

下文统一写成 `gravityd`。在子目录执行也可以，会向上找到仓库根。也可以设 `GRAVITYD_ROOT=/绝对路径`（人工/CI 更可信，Agent 参数次之）。

查看帮助：

```bash
gravityd --help
gravityd schema
gravityd schema module.add
```

---

## 4. 推荐工作流

以「CRM / 客户」为例。域 `crm`，资源 `customer`，页面名「客户」。

```bash
# 1. 绑定仓库（每个 clone 做一次；可带后端选型）
gravityd link --project-id local --provider=insforge -y
# 或: gravityd init --provider=firebase --dry-run
# 正式初始化: bash scripts/init.sh --provider=insforge|firebase

# 2. 看环境是否可用
gravityd status

# 3. 先预览，不写文件
gravityd module add --domain crm --resource customer --title 客户 --fields mobile:text --dry-run

# 4. 写入 SQL / API / Vue
gravityd module add --domain crm --resource customer --title 客户 --fields mobile:text

# 5. 套迁移（不要跑 002）
gravityd migrate apply --file 007_crm_customer.sql

# 6. 前端（不要用仓库根 pnpm run dev）
cd frontend/web
./node_modules/.bin/vite --mode development
```

浏览器：

1. 打开 http://127.0.0.1:5180/web
2. `localStorage.clear()` 后用 `admin@local.dev` / `123456` 登录（菜单是登录时拉的）
3. 侧栏应出现 **CRM → 客户**，地址形如 `http://127.0.0.1:5180/web/#/crm/customer`
4. 走一遍列表、新增、编辑、删除

生成器对照岗位模块：`frontend/web/src/api/module_system/position.ts` 与对应页面。生成后按业务改列和表单即可，不要再手写 `/api/v1`。

---

## 5. 命令手册

### 5.1 `link` — 绑定当前仓库

```bash
gravityd link --project-id local -y
gravityd link --project-id local --provider=firebase -y
gravityd link --project-id my-app --url http://127.0.0.1:7130 --name GravityD -y
gravityd link --project-id local --dry-run
```

| 参数 | 说明 |
|---|---|
| `--project-id` | 本地标识，字母数字、点、下划线、短横线，最长 64。省略时默认 `local` |
| `--provider` | `insforge`（默认）或 `firebase`。写入 `.gravityd/project.json` 和 `frontend/web/.env.development` 的 `VITE_BACKEND_PROVIDER`，不写密钥 |
| `--url` | InsForge 网关。省略则读 `insforge/.env` 的 `API_BASE_URL`，再退回 `http://127.0.0.1:7130` |
| `--name` | 显示名，默认 `GravityD` |
| `-y` | 覆盖已绑定的**另一个** project-id 时必加 |

写入示例（不含密钥）：

```json
{
  "schema_version": "1.0.0",
  "project_id": "local",
  "name": "GravityD",
  "root": "/path/to/base_server",
  "insforge_url": "http://127.0.0.1:7130",
  "provider": "insforge",
  "linked_at": "2026-09-15T05:59:02.162Z",
  "paths": {
    "insforge": "insforge",
    "migrations": "insforge-app/migrations",
    "web": "frontend/web"
  }
}
```

换绑定：`gravityd link --project-id other -y`。取消：`gravityd unlink -y`。

### 5.1.1 `init` — 按提供商初始化仓库

```bash
gravityd init --provider=insforge
gravityd init --provider=firebase --dry-run
```

实际调用 `bash scripts/init.sh --provider=...`。InsForge 会拉 Docker 并跑迁移；Firebase 只写环境模板，随后用 `node scripts/seed-firebase.mjs` 播种 Firestore。`--dry-run` 只预览，不改环境。

### 5.2 `current` — 查看绑定

```bash
gravityd current
```

未 link 时退出码 `2`，提示先执行 `link`。

### 5.3 `status` / `doctor` — 健康检查

```bash
gravityd status
```

检查项：是否已 link、7130 是否响应、Postgres `5433` 是否可连、anon key / 控制台密码**是否存在**（不打印值）、下一菜单段、下一迁移序号、Compose 项目名。

本机常见正常值：InsForge `HTTP 302`，Postgres `127.0.0.1:5433` 通，下一菜单 `100`，下一迁移 `007_*.sql`。

`doctor` 是 `status` 的别名。

### 5.4 `up` — 拉起 InsForge

```bash
gravityd up
```

等价于 `bash scripts/insforge-up.sh`。需要已 `link`，且 `insforge/` 已由 `init.sh` 克隆。

日常连前端一起开，仍推荐 `bash scripts/dev.sh`。

### 5.5 `module add` — 生成业务模块

```bash
gravityd module add --domain crm --resource customer --title 客户
gravityd module add --domain crm --resource customer --title 客户 \
  --dir-title CRM --fields mobile:text,email:text --menu-id 100 --dry-run
gravityd module add --domain crm --resource customer --title 客户 --apply
```

| 参数 | 必填 | 说明 |
|---|---|---|
| `--domain` | 是 | 域，小写字母开头，仅小写字母和数字，如 `crm` |
| `--resource` | 是 | 资源，规则同 domain，如 `customer` |
| `--title` | 是 | 页面中文名，如 `客户` |
| `--dir-title` | 否 | 侧栏目录名，默认 domain 大写（`CRM`） |
| `--menu-id` | 否 | 目录 id，必须 ≥ 100 且为 10 的倍数。省略则扫描已有迁移自动取下一段 |
| `--fields` | 否 | 额外列，`name:type` 逗号分隔。类型：`text` / `int` / `uuid` / `timestamptz` |
| `--dir-icon` / `--page-icon` | 否 | 默认 `ri:briefcase-line` / `ri:file-list-line` |
| `--dir-order` | 否 | 目录排序，默认 `10` |
| `--apply` | 否 | 写完后立刻 `psql` 这条 SQL |
| `--dry-run` | 否 | 只打印将生成的路径和菜单段，不写盘 |
| `--force` | 否 | 覆盖已有文件，或强行占用已出现在 SQL 里的菜单段 |

默认表字段（不必写进 `--fields`）：`id`、`name`、`owner_id`（→ `profiles.id`）、`"order"`、`status`、`description`、`created_time`、`updated_time`。

生成三个文件（以 CRM 客户、当前仓库下一序号 007、菜单 100 为例）：

| 文件 | 作用 |
|---|---|
| `insforge-app/migrations/007_crm_customer.sql` | 表 + 索引 + RLS + 菜单 100–109 + `SUPER_ADMIN` 授权 + `NOTIFY pgrst` |
| `frontend/web/src/api/module_crm/customer.ts` | InsForge SDK：`ok` / `unwrap` / `pageOf` / `rangeOf`，内存排序分页 |
| `frontend/web/src/views/module_crm/customer/index.vue` | `FaSearchBar` + `FaTable` + `useTable` 列表 CRUD |

派生命名：

| 用途 | 值 |
|---|---|
| 表名 | `crm_customer` |
| 权限前缀 | `module_crm:customer` |
| 路由 name | `CrmCustomer`（须等于页面 `defineOptions({ name })`） |
| `component_path` | `module_crm/customer/index` |
| 后台地址 | `/#/crm/customer` |

菜单一段预留 10 个 id：

| id | 类型 | 含义 |
|---|---|---|
| 100 | 目录 | `/crm` → `/crm/customer` |
| 101 | 页面 | `customer` |
| 102–108 | 按钮 | query / create / update / delete / patch / detail / export |
| 109 | 空闲 | 同段预留 |

已占用：`1–49` 一期系统，`50–89` 扩展，`90–99` InsForge。新业务从 **100** 起。下一段是 110、120……

默认只写文件。确认 SQL 无误后再 `migrate apply`。`--apply` 适合本地一次性套上。

导出按钮仍会 `throw new Error("未迁移导出")`，与岗位模块一致，不要改成打 FastAPI。

### 5.6 `migrate apply` — 应用一条 SQL

```bash
gravityd migrate apply --file 007_crm_customer.sql
gravityd migrate apply --file insforge-app/migrations/007_crm_customer.sql
gravityd migrate apply --latest
gravityd migrate apply --file 006_brand_gravityd.sql --dry-run
```

在 `insforge/` 目录执行：

```bash
docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1
```

**禁止** `002_seed_system.sql`（会 `TRUNCATE … CASCADE` 清掉 profiles）。文件名以 `002_` 开头一律拒绝，退出码 `3`。

`--latest` 取 `insforge-app/migrations/` 里编号最大、且不是 002 的那条。001–006 语义不要改；新业务从 **007** 起。003–006 日常也可用 `bash insforge-app/scripts/apply-extra.sh`。

不要把新文件写进会跑 002 的 `apply.sh`。

### 5.7 `schema` — 自描述

```bash
gravityd schema              # 命令列表
gravityd schema link
gravityd schema module.add
gravityd schema migrate.apply
```

Agent 应先 `schema` 再调写操作，不要把整份 README 每次都塞进上下文。

---

## 6. 全局参数

所有命令都可用：

| 参数 | 说明 |
|---|---|
| `--json` | 强制 stdout JSON 信封 |
| `--format json\|text` | 覆盖自动检测。非 TTY 默认 json，TTY 默认 text |
| `-y` / `--yes` | 非交互确认（`unlink`、换 `project-id`） |
| `--dry-run` | 只预览 |
| `-f` / `--force` | 覆盖文件或菜单段 |
| `--idempotency-key <k>` | 相同 key 的成功结果写入 `.gravityd/idempotency.json`，重试直接回放 |
| `-h` / `--help` | 帮助 |

环境变量：`GRAVITYD_FORMAT=json|text`，`GRAVITYD_ROOT` 指定仓库根。

### 输出与退出码

成功：

```json
{ "ok": true, "data": {}, "meta": { "schema_version": "1.0.0", "command": "link" } }
```

失败：

```json
{
  "ok": false,
  "error": { "code": "not_linked", "message": "尚未 link 到 GravityD 项目", "retryable": false },
  "meta": { "schema_version": "1.0.0", "command": "module.add" }
}
```

| 退出码 | 含义 | 典型 `error.code` |
|---|---|---|
| 0 | 成功 | — |
| 1 | 运行时（Docker / psql / 网络） | `runtime_error` |
| 2 | 未 link | `not_linked` |
| 3 | 参数或仓库不对 | `validation_error`、`not_gravityd`、`forbidden_migration`、`already_exists`、`conflict` |

脚本里请判断 `ok` 和退出码，不要解析人类可读的 stderr 文案。

---

## 7. 生成代码必须遵守的约定

脚手架已经按这些写好。手改时不要改回去：

- 列表：`select('*')` 后内存过滤 / 排序 / 分页。禁止 `{ count: 'exact' } + range`。
- 列名 `"order"` 禁止 `.order('order')`。
- 包装走 `ok()` / `unwrap()` / `pageOf()` / `rangeOf()`。`ok()` 的 `code` 必须是 `0`。
- 客户端只用 `frontend/web/src/utils/insforge.ts`。
- 用户关联用 UUID → `profiles.id`，不要自建密码字段。
- 业务路由由菜单驱动，不要手写 `addRoute`。
- 新迁移末尾保留 `NOTIFY pgrst, 'reload schema';`。
- 菜单 `DELETE` 必须带 id 范围（生成器已写成 `>= N AND id < N+10`）。

不要迁进侧栏、不要接 InsForge：代码生成、工作流、定时任务、AI、内部聊天、服务器/缓存监控。

---

## 8. 测试 CLI 本身

零依赖，不需要 Docker：

```bash
node --test packages/gravityd-cli/test/cli.test.mjs
```

改生成模板或参数解析后应先跑这组测试。

---

## 9. 常见问题

| 现象 | 处理 |
|---|---|
| `not_gravityd` | 不在本仓库内，或缺少三个标记目录。到仓库根执行，或设 `GRAVITYD_ROOT` |
| `not_linked`（退出 2） | 先 `gravityd link --project-id local -y` |
| `already_exists` | 文件已在。确认后加 `--force`，或换 `--domain` / `--resource` |
| 菜单段冲突 | `status` 看 `next_menu_id`，或显式 `--menu-id 110` |
| `forbidden_migration` | 不要 apply `002_seed_system.sql` |
| `psql` / Docker 失败 | Docker 是否 Running；`insforge/` 是否存在；`gravityd status` 看 7130 / 5433 |
| 侧栏没有新模块 | 迁移是否 apply；是否重新登录；当前角色是否 `SUPER_ADMIN` |
| `[路由警告] 找不到组件` | `component_path` 是否等于 `src/views/module_<域>/<资源>/index.vue` |
| 生成后列表报错 | 是否手改成了 `count: 'exact'` 或 `.order('order')` |
| 想提交 `.gravityd/project.json` | 不要。和 `.insforge/project.json` 一样是本机绑定 |

---

## 10. 和其它文档的分工

| 文档 | 看什么 |
|---|---|
| 本文件 | CLI 怎么用 |
| [开发指南.md](./开发指南.md) | 环境、端口、账号、迁移语义、前端约定、验收 |
| [base-server-app skill](../.cursor/skills/base-server-app/SKILL.md) | Agent 加模块时的硬约束 |
| [new-module.md](../.cursor/skills/base-server-app/new-module.md) | 手工对照清单（CLI 生成后仍可按它改字段） |
| [packages/gravityd-cli/README.md](../packages/gravityd-cli/README.md) | 包内短说明 |
