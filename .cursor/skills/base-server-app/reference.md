# 环境与禁令

## 栈

- 壳：GravityD / Vue3（`frontend/web`，Vite，hash 路由，`BASE_URL=/web`）
- 后端：仓库内自托管 InsForge（`insforge/`，gitignore），Compose 项目名 `gravityd-insforge`
- 业务库：InsForge Postgres（`public.*` + `auth.users`）
- FastAPI 源码留在 `backend/`，**8001 已停，新功能不要打 `/api/v1`**

## 端口（本机）

| 服务 | 地址 |
|---|---|
| 管理后台 | http://127.0.0.1:5180/web |
| InsForge API / 控制台 | http://127.0.0.1:7130 |
| InsForge Postgres | `127.0.0.1:5433`（映射容器 5432） |
| PostgREST | `127.0.0.1:5440` |
| 别人的 Postgres | `127.0.0.1:5432` — 不要动 |
| 别人的 Redis | `6379` — 不要动 |

启动：`bash scripts/insforge-up.sh`。不要把 InsForge 嵌进 `docker/docker-compose.yaml`。不要在仓库根跑官方 `setup.sh`（会破坏本仓库 git）。

## 账号

| 入口 | 账号 | 密码 |
|---|---|---|
| 管理后台 | `admin@local.dev` | `123456` |
| 控制台 7130 | `admin` | `insforge/.env` 的 `ROOT_ADMIN_PASSWORD` |

种子超管 `profiles.id`：`cc49c595-0764-4ff8-b4e5-f13f5e696905`（username `admin`）。登录邮箱映射：无 `@` 则拼 `@local.dev`（`toLoginEmail`）。

控制台与后台不是同一套登录。iframe 空白时用「新窗口打开」。

## 环境变量（勿提交）

`frontend/web/.env.development`：

- `VITE_INSFORGE_URL=http://127.0.0.1:7130`
- `VITE_INSFORGE_ANON_KEY`（与 `insforge/.env` 的 `ACCESS_ANON_KEY` / `ANON_KEY` 一致）

前端 SDK：`isServerMode: true`。刷新令牌走 `client_type=mobile`（或现有 `auth.ts` 的 sessions 接口）。JWT 约 15 分钟，跨域不要依赖 httpCookie。

## 前端启动

`~/Library/pnpm` 可能无写权限，不要用 `pnpm run dev`。用：

```bash
cd frontend/web
./node_modules/.bin/vite --mode development
```

依赖只在 `frontend/web` 安装。`@insforge/sdk` 已在该包内（`^1.5.2`）。

## 迁移

| 文件 | 作用 | 重跑 |
|---|---|---|
| `001_system_schema.sql` | 一期表 + RLS | 可（`IF NOT EXISTS`） |
| `002_seed_system.sql` | 一期种子 | **禁止**（TRUNCATE CASCADE） |
| `003_system_extend.sql` | 岗位/公告/日志/工单/版本/在线 | 可 |
| `004_seed_extra.sql` | 菜单 50–88 + 种子 | DELETE 已限制 `id >= 50 AND id < 90` |
| `005_insforge_menu.sql` | 菜单 90–94 | DELETE 已限制 `90–99` |
| `006_brand_gravityd.sql` | 品牌改 GravityD | 可 |

应用增量：`bash insforge-app/scripts/apply-extra.sh`（003–006）。新文件单独 `psql`，或把文件名追加进 `apply-extra.sh`（不要写进 `apply.sh`）。下一条业务迁移从 **007** 起。

```bash
cd insforge
docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 \
  < ../insforge-app/migrations/0xx_your.sql
```

## RLS 默认

业务表：`ENABLE ROW LEVEL SECURITY` + `authenticated` 全表 `FOR ALL USING (true) WITH CHECK (true)`。需要匿名读的配置/公告再加 `anon` SELECT。后续按角色收紧时再改 policy，不要一上来写复杂 RLS 挡住开发。

SDK 访问路径是 InsForge 网关 `/api/database/records/<table>`，不要手写 `/rest/v1`。

## 动态路由要点

- `MenuProcessor` 把相对 `route_path` 拼成绝对路径。
- 目录 `redirect` 优先用库里的绝对路径（如 `/insforge/overview`）。
- 壳层 `/home`、`/dashboard/*` 是静态演示，不要当业务后端。
- `RouteRegistry` 不会注册第一段为 `home|profile|changelog|dashboard` 的后端菜单。

## 侧栏已知行为

- 目录标题（图标/文字）点击 → 第一个叶子页；箭头只展开。
- 展开动画若卡住，已用 CSS 让 `.is-opened > .el-menu--inline` 按真实高度撑开，避免挡住下方入口。
- 工作标签校验会丢掉 `CatchAll404` / 403 / 500。

## 提交

不要主动 commit。用户要提交时再做。密钥、`insforge/`、sqlite wal/shm 不要进 git。
