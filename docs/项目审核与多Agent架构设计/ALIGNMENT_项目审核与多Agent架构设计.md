# 阶段1: ALIGN (对齐规范与项目审核) - 项目审核与多Agent架构设计

> 文档版本: v1.0.0  
> 责任角色: 资深软件架构师 & 系统工程专家  
> 依据规范: 团队 6A 工作流程规范 (阶段1: Align)  
> 任务名称: 项目审核与多Agent架构设计  

---

## 一、原始需求与边界确认

### 1.1 原始需求
用户需求陈述：
> “帮我仔细审核一下这个项目，设计多个Agent，从代码架构等角度，并且给出修改意见”

### 1.2 边界确认 (Scope & Boundary)
- **纳入范围 (In Scope)**：
  1. **现有系统全貌深度审计**：包括从原 FastAPI 全栈中后台向 GravityD (Vue3 + InsForge BaaS) 转型过程中的代码架构、数据流、安全性、依赖链与遗留资产审计。
  2. **多 Agent (Multi-Agent) 体系架构设计**：
     - **维度 A【研发效能体系】**：面向该中后台脚手架的研发全生命周期（对齐 6A 规范），设计专业分工的协同智能体（需求与规范 Agent、数据库与安全迁移 Agent、全栈脚手架生成 Agent、代码与安全审计 Agent）。
     - **维度 B【业务运行时体系】**：在当前“无 Python 主后端”的新型 BaaS 架构下，设计承载智能对话、Text-to-SQL 报表、业务自动化流转的运行时 Multi-Agent 系统架构。
  3. **架构整改与优化意见**：针对 RLS 假权限、前端全量内存分页、死代码残留、脚手架 CLI 与移动端脱节等关键技术债提出落地整改路线图。
- **排除范围 (Out of Scope)**：
  - 本阶段不直接暴力恢复已被删除的 FastAPI 后端，严格遵循项目禁令。
  - 本阶段不直接批量修改生产业务库中的现有业务数据。

---

## 二、项目上下文与架构深度审计分析

### 2.1 架构演进与当前现状
1. **历史背景**：
   - 仓库原为 `fastapiadmin`，基于 Python FastAPI (8001端口) + MySQL/PostgreSQL + Vue3 + UniApp。
   - 近期团队做出了重大技术转型决策（Git Commit `b46ab75a` 及后续变更）：**全面弃用并移除 FastAPI 后端，转向以自托管 InsForge (Auth + PostgreSQL + PostgREST + 7130 控制台) 为核心的 BaaS 架构**，重构为面向团队快速二次开发的后台脚手架 **GravityD**。
2. **当前仓库核心拓扑**：
   - `frontend/web/`：Vue3 + TypeScript + Element Plus + Vite + `@insforge/sdk`（管理后台前端，主交付载体）。
   - `insforge-app/`：PostgreSQL 表结构、RLS 策略与菜单/角色的增量迁移文件（`migrations/`）与初始化脚本。
   - `packages/gravityd-cli/`：自研的轻量二次开发 CLI 工具（对标 InsForge CLI，支持 `link`, `module add`, `migrate apply`, `status` 等自动化脚手架命令）。
   - `scripts/`：环境生命周期脚本（`init.sh`, `dev.sh`, `deploy.sh`, `insforge-up.sh`），负责 Docker Compose 编排、端口隔离（5433 映射）与超管种子化。
   - `.cursor/skills/base-server-app/`：AI Agent 二次开发规范指南。

### 2.2 核心代码架构缺陷与风险审计

| 序号 | 模块 / 领域 | 现状描述 | 严重级别 | 潜在隐患与技术债 |
| :--- | :--- | :--- | :---: | :--- |
| **1** | **安全与权限 (RLS)** | `001_system_schema.sql` 及 CLI 生成的业务表 RLS 策略统一使用 `FOR ALL TO authenticated USING (true) WITH CHECK (true)` | **P0 (致命)** | **权限完全虚设**：前端的 `v-hasPermi` 和菜单权限只是 UI 掩耳盗铃。任何注册/登录用户通过 PostgREST REST API 均可增删改查全库数据，缺少基于 `owner_id`、租户隔离、角色行级过滤的真实策略。 |
| **2** | **前端分页与性能** | CLI 模板和 `.cursor/skills` 明确要求：`select('*')` 全表拉取后由前端浏览器进行**内存过滤、排序和分页** | **P1 (高危)** | 数据规模超过数百条后，前端内存占用暴涨、网络带宽浪费巨大。根因是 PostgREST 对保留字 `"order"` 和 `{ count: 'exact' }` 存在处理顾虑，缺乏标准的服务端分页与 count 解决方案。 |
| **3** | **遗留资产与死代码** | `frontend/web/src/views/module_ai/chat/index.vue`、`module_storage/transfer.ts`、`module_generator/gencode` 中仍存在大量指向 `/api/v1` 和 `ws://8001` 的请求；`frontend/docs` 仍以 FastAPI 为核心 | **P1 (高危)** | 用户点击相关页面直接报 404/网络异常；新开发者和 AI Agent 读取旧文档后产生严重的架构认知偏差。 |
| **4** | **移动端 (UniApp) 脱节** | `frontend/app` 仍采用 Alova 请求旧 FastAPI 8001 接口，完全未接入 `@insforge/sdk` 与新认证体系 | **P2 (中危)** | 移动端当前处于完全不可用、架构断层状态。 |
| **5** | **复杂业务逻辑承载缺失** | 纯 PostgREST 架构无法原生处理异步复杂任务（如 Excel 批量解析导入/导出、文件切片分发、复杂多表事务审计），CLI 生成的导出统一为 `throw new Error("未迁移导出")` | **P2 (中危)** | BaaS 模式下缺乏标准的无服务器函数（Edge Functions）或轻量 Worker 机制来承载中重度业务。 |

---

## 三、多 Agent (Multi-Agent) 体系顶层设计方案

为使 GravityD 既成为团队极其高效的脚手架，又具备强大的业务智能化能力，我们提出两个维度的多 Agent 设计：

### 体系 A：【研发与脚手架 Multi-Agent 体系 (DevOps & Scaffolding Multi-Agent)】
深度结合团队已有的 `6A 工作流程规范`，在代码库与 Cursor 开发环境中固化以下 4 个专属智能体：

```
                      [ 用户 / 开发者需求输入 ]
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │  Agent 1: 需求对齐专家   │ ── 生成 ALIGNMENT & CONSENSUS
                     │ (Align & Spec Agent)  │    边界确认、字段契约、数据模型
                     └───────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Agent 2: 数据库与安全架构 │ ── 生成 0xx_*.sql 增量脚本
                     │ (DB & Security Agent) │    严格 RLS 行级权限、不冲突 Menu ID
                     └───────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Agent 3: 全栈代码生成专家 │ ── 驱动 @gravityd/cli
                     │  (CodeGen Agent)      │    生成 Vue3 页面 + TypeScript API
                     └───────────────────────┘
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Agent 4: 质量与安全审查员 │ ── 验证架构禁令(无8001)、
                     │  (QA & Audit Agent)   │    前端性能、类型检查、路由验证
                     └───────────────────────┘
```

1. **Agent 1: 需求对齐与契约定义 Agent (Align & Spec Agent)**
   - **核心职责**：解析模糊业务需求，基于项目现有模块进行上下文比对，生成字段类型、数据字典、页面交互契约与权限标识（`module_<域>:<资源>:<动作>`）。
2. **Agent 2: 数据库架构与 RLS 安全 Agent (DB & Security Migration Agent)**
   - **核心职责**：依据数据契约生成标准 PostgreSQL DDL，严格计算菜单 ID 区间（从 100 起），设计**带行级隔离的 RLS 策略**（支持超级管理员豁免、部门或 `owner_id` 过滤），产出 `0xx_*.sql` 增量迁移脚本。
3. **Agent 3: 全栈代码与脚手架集成 Agent (CodeGen & Scaffold Agent)**
   - **核心职责**：调用并扩展 `packages/gravityd-cli`，编写 Vue3 页面（集成 FaSearchBar、FaTable、useTable）、TypeScript 强类型接口，对齐 InsForge API 规范（`ok()`, `unwrap()`），配置动态路由元数据。
4. **Agent 4: 架构遵从与质量把关 Agent (QA & Code Audit Agent)**
   - **核心职责**：全自动代码审查，检查是否触碰禁止事项（例如向 8001 发请求、重跑 002 迁移、内存暴力全量加载、SQL 注入、未做异常捕获），确保编译通过与路由可达。

---

### 体系 B：【业务运行时 Multi-Agent 体系 (Runtime Business Multi-Agent)】
在 GravityD 去除 FastAPI 后，如何为中后台系统注入业务智能体能力？

```
                          [ 前端 Web / App 交互界面 ]
                                      │
                        HTTP / SSE    │ (带 JWT Token)
                                      ▼
                      ┌───────────────────────────────┐
                      │    AI 网关 / 调度编排中心      │ (InsForge Edge Function /
                      │   (Supervisor / Router Agent) │  轻量 Node/Python Agent Worker)
                      └───────────────────────────────┘
                                      │
                 ┌────────────────────┼────────────────────┐
                 ▼                    ▼                    ▼
     ┌───────────────────────┐ ┌──────────────────┐ ┌───────────────────────┐
     │ Agent 1: 业务数据分析  │ │ Agent 2: 知识库问答 │ │ Agent 3: 自动化工作流 │
     │ (Text2SQL / BI Agent) │ │   (RAG Agent)    │ │   (Workflow Agent)  │
     └───────────────────────┘ └──────────────────┘ └───────────────────────┘
                 │                    │                    │
                 └────────────────────┼────────────────────┘
                                      ▼
                     ┌────────────────────────────────┐
                     │   InsForge PostgreSQL 数据底座  │
                     │  (pgvector + 业务表 + 审计日志) │
                     └────────────────────────────────┘
```

1. **调度编排 Agent (Supervisor / Intent Router Agent)**：
   - 接收用户自然语言指令，结合上下文进行意图分流，将指令分发至具体专家 Agent，聚合多 Agent 结论并通过 SSE 流式响应前端。
2. **Text-to-SQL 与智能 BI 分析 Agent (Data Analytics Agent)**：
   - 基于系统数据字典（`sys_dict_data`）与数据库元数据，将自然语言转换为安全的只读 PostgreSQL 查询，生成可视化图表。
3. **企业知识库与系统引导 Agent (RAG & Guidance Agent)**：
   - 利用 PostgreSQL `pgvector` 插件存储业务文档、操作手册与配置项，支持快速语义检索与问答。
4. **流程审批与工单自动处理 Agent (Workflow & Task Automation Agent)**：
   - 联动工单系统（`sys_ticket`）与通知系统（`sys_notice`），自动根据规则分配任务、汇总告警、执行定时调度。

---

## 四、疑问澄清与智能决策清单 (待用户确认)

在推进到阶段 2 (Architect) 前，需要确认以下关键决策点，以确保设计方案与团队技术演进高度对齐：

1. **【决策点 1：多 Agent 体系的聚焦点】**：
   - 选项 A：**开发工作流为主**——聚焦为 GravityD 打造 4 个研发辅助 Agent，强化 CLI 与 6A 自动化研发体验。
   - 选项 B：**业务运行时为主**——重点设计后台系统内的业务 Multi-Agent（智能客服、数据分析、审批流助手），搭建运行时基础设施。
   - 选项 C：**双轮驱动 (推荐)**——同时落地“研发效能 Multi-Agent（规范/CLI/审查）”与“业务运行时 Multi-Agent（轻量架构/数据互通）”。

2. **【决策点 2：业务运行时的计算载体】**：
   - 在已移除 FastAPI 8001 的前提下，若需要运行多 Agent、文件导出、异步任务等复杂逻辑：
   - 选项 A：**InsForge Edge Functions (Serverless/Deno/Node)**（推荐，完全保持 BaaS 无服务器形态）。
   - 选项 B：**独立轻量级 AI/Worker 容器 (Python/FastAPI 或 Node.js)**（与 InsForge 并列运行，专用于 AI 和重量级后台任务）。

3. **【决策点 3：技术债清理策略】**：
   - 针对当前前端中残留的旧 FastAPI 模块（`module_ai/chat`、`module_task/storage`、`module_generator/gencode`）以及移动端 `frontend/app`：
   - 选项 A：**彻底隔离与清理 (推荐)**——从侧栏和打包中剔除失效代码，文档全面更新，避免误导。
   - 选项 B：**保留占位待迁移**——保留旧界面结构，逐步由新的 Agent 架构替代。

---
EOF
