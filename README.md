<div align="center">
  <img src="./frontend/web/public/logo.png" width="128" height="128" alt="GravityD" />
  <h1>GravityD</h1>
  <p><b>面向全项目的中后台开发脚手架</b></p>
  <p>Vue3 + TypeScript + 自托管 InsForge · 权限 / 菜单 / 业务模块开箱即用</p>
</div>

简体中文 | [English](./README.en.md)

## 这是什么

GravityD 是团队内部的 **后台开发脚手架**。新业务项目从本仓库拉起，而不是从零搭登录、RBAC 和 CRUD。

运行时后端是仓库内 **自托管 InsForge**（Auth + Postgres + RLS）。`backend/` 里的 FastAPI 源码保留作参考，**默认不再启动 8001**。

人读的开发手册：[docs/开发指南.md](docs/开发指南.md)（环境、迁移、菜单、加模块、验收）。

Agent 加模块时走 [`.cursor/skills/base-server-app`](.cursor/skills/base-server-app/SKILL.md)。

## 本地 5 分钟

依赖：Docker Desktop（引擎 Running）、Node.js ≥ 20。本机若已有别人的 Postgres `5432` / Redis `6379`，**不要停它们**。InsForge 数据库映射在 `5433`。

```bash
bash scripts/init.sh    # 拉 InsForge、建表、种子超管、写前端 env
bash scripts/dev.sh     # 启动 Vite
```

| 入口 | 地址 | 账号 |
|------|------|------|
| 管理后台 | http://127.0.0.1:5180/web | `admin@local.dev` / `123456` |
| InsForge 控制台 | http://127.0.0.1:7130 | `admin` / `insforge/.env` 的 `ROOT_ADMIN_PASSWORD` |

登录若还显示旧名称，清一次浏览器 `localStorage` 再进。

前端依赖若未装：

```bash
cd frontend/web
# 优先
./node_modules/.bin/vite --mode development
# 没有 node_modules 时再安装（不要在仓库根 pnpm add）
```

## 部署

服务器上同样先有 Docker，然后：

```bash
bash scripts/init.sh      # 首次
bash scripts/deploy.sh    # 增量迁移 + 构建 frontend/web/dist
```

把 `frontend/web/dist` 交给 Nginx，并把 `frontend/web/.env.production` 里的 `VITE_INSFORGE_URL`、`VITE_INSFORGE_ANON_KEY` 改成公网地址后重新 `deploy`。

根目录 `deploy.sh` 已指向上述脚本。`docker/` 下旧的 FastAPI + MySQL compose **不是** 当前默认路径。

## 脚本

| 脚本 | 作用 |
|------|------|
| `scripts/init.sh` | 克隆/补齐 `insforge/`、端口避让、启栈、001–006 迁移、超管、前端 `.env.development` |
| `scripts/dev.sh` | 确保 InsForge 起来后启动 Vite |
| `scripts/deploy.sh` | 启栈、套增量 SQL（**不重跑 002**）、生产构建 |
| `scripts/insforge-up.sh` | 只拉起已有 InsForge compose |

**禁止**重跑 `insforge-app/migrations/002_seed_system.sql`（会 TRUNCATE 业务表）。**禁止**在仓库根执行官方 InsForge `setup.sh`。

## 工程结构

```
GravityD/
├─ frontend/web/                 # Vue3 管理端（主交付）
├─ frontend/app/                 # UniApp 移动端壳（可选）
├─ insforge/                     # 自托管 InsForge（gitignore，init 时克隆）
├─ insforge-app/migrations/      # 业务表 / RLS / 菜单种子
├─ scripts/                      # init / dev / deploy
├─ .cursor/skills/base-server-app/
└─ backend/                      # 旧 FastAPI，默认不启动
```

## 加一个业务模块

对照 `frontend/web/src/api/module_system/position.ts` 与岗位页。菜单 id **从 100 起**。清单见 [new-module.md](.cursor/skills/base-server-app/new-module.md)。

不要迁进侧栏：代码生成、工作流、定时任务、AI、内部聊天、服务器/缓存监控。

## 鸣谢

界面与组件骨架来自开源 FastapiAdmin；运行时与脚手架约定由 GravityD 维护。
