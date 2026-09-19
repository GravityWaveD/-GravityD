# 阶段1: ALIGN (对齐阶段) - 项目架构审核与多Agent设计

> 文档路径: `docs/项目架构审核与多Agent设计/ALIGNMENT_项目架构审核与多Agent设计.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段1: Align)  
> 责任团队: 软件架构委员会 (多 Agent 协同体系)  

---

## 1. 任务背景与目标

### 1.1 原始需求
> “设计多个Agent帮我仔细审核一下这个项目，从代码架构等角度，并且给出修改意见”

### 1.2 任务目标
1. **多 Agent 审核矩阵设计**：构建 4 个面向不同专业维度的专职审查智能体（系统架构演进 Agent、数据与安全防线 Agent、前端与交互体验 Agent、工程化与 CLI 脚手架 Agent），形成专业分工的架构审查专家团。
2. **多视角深度代码与架构审核**：针对从原 FastAPI 全栈转型为 GravityD (Vue3 + 自托管 InsForge BaaS) 过程中的现实状态，全面排查代码缺陷、架构隐患、安全风险、性能瓶颈和死代码。
3. **输出多 Agent 维度的审查结论与修改意见**：产出架构整改方案、代码优化示例和演进路线图。

---

## 2. 审查范围与边界划分 (Scope & Boundary)

### 2.1 纳入审查范围 (In Scope)
- **后端架构与基础设施**：
  - `insforge/` 编排、端口隔离机制、PostgreSQL 配置、PostgREST 接口暴露。
  - `scripts/` 生命周期脚本（`init.sh`, `dev.sh`, `deploy.sh`, `lib.sh`）。
  - `insforge-app/migrations/`（001–006 迁移脚本、表结构、RLS 策略与种子数据）。
- **前端 Web 架构 (`frontend/web`)**：
  - Vue3 + Vite + TypeScript 架构分层。
  - 动态路由加载机制（`MenuProcessor`, `RouteRegistry`, `guards.ts`）。
  - 数据流与 API 封装层（`insforge.ts`, `insforge-api.ts`, 各业务模块 API）。
  - 内存分页策略及其性能边界。
  - 遗留死代码与未迁移模块（AI 聊天、代码生成、存储传输等）。
- **工具链与脚手架 (`packages/gravityd-cli`)**：
  - CLI 命令设计、代码生成模板（SQL / API / Vue）、幂等性机制、参数校验。
- **移动端与附属资产 (`frontend/app`, `frontend/docs`)**：
  - UniApp 与当前后端体系的脱节状态。
  - 官方文档对旧 FastAPI 的认知偏差。

### 2.2 排除范围 (Out of Scope)
- 不尝试复活已下线的 FastAPI 8001 主后端，顺应团队 BaaS 化架构决策。
- 不直接批量重写生产数据库中的已有用户数据。

---

## 3. 多 Agent 审核专家团架构定义

为了保证审核的专业性、深度与覆盖度，设计以下 4 个专属审查 Agent：

| Agent 标识 | 角色名称 | 职责领域与审查切角 | 核心关切指标 |
| :--- | :--- | :--- | :--- |
| **Agent A** | **系统架构与演进专家**<br>*(System Architecture Agent)* | 审查整体架构范式转型、BaaS 服务依赖、系统分层完整性、复杂业务逻辑（事务/计算/异步任务）的承载方案 | 架构一致性、无单点故障、可扩展性 |
| **Agent B** | **数据层与安全卫士**<br>*(Data & Security Agent)* | 审查 PostgreSQL DDL 规范、Row Level Security (RLS) 策略真实防护能力、RBAC 越权漏洞、API 攻击暴露面、凭证与密钥生命周期 | 零信任安全、数据隔离、RLS 防越权 |
| **Agent C** | **前端架构与性能专家**<br>*(Frontend & Performance Agent)* | 审查 Vue3 代码组织、内存分页性能瓶颈、动态路由守卫健全性、状态管理、错误降级与旧后端残留死代码 | 浏览器性能、内存泄漏、路由健壮性 |
| **Agent D** | **工程化与脚手架工具专家**<br>*(Tooling & DevOps Agent)* | 审查 `@gravityd/cli` 命令设计、代码模板规范性、Docker Compose 脚本健壮性、二次开发 DX（开发者体验） | 自动化程度、脚手架一致性、环境幂等 |

---

## 4. 关键现状与认知对齐

1. **架构模式已彻底转向 BaaS**：
   - 传统 FastAPI 目录已被删除，前端改为直连 InsForge (PostgREST + PostgreSQL)。
   - **核心矛盾**：前端不仅负责 UI，还承担了“伪后端”的角色（如拉全表后在浏览器做权限过滤、内存排序与切片分页），架构职责严重错位。
2. **RLS 策略形同虚设**：
   - 当前所有业务表及系统表的 RLS 策略统一使用 `USING (true) WITH CHECK (true)`。任何已登录用户均可绕过前端 UI 直接通过 REST 接口越权篡改全库数据。
3. **开发脚手架模板存在性能隐患**：
   - 脚手架 CLI（`packages/gravityd-cli`）生成的所有业务代码模板均固化了“内存全量分页”，随业务数据增加将必然引发前端卡顿或 OOM。
4. **历史包袱尚未清算**：
   - 前端仍有多个页面和文档硬编码 `/api/v1` 及 8001 端口，移动端 `frontend/app` 仍停留在旧体系，处于不可用状态。

---
EOF
