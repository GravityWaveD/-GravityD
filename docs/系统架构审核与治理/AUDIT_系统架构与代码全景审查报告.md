# GravityD 系统架构与代码全景审查报告

> **报告版本**：v1.0.0 (Release)  
> **审查对象**：GravityD 基础脚手架及关联工程体系（`base_server`）  
> **审查团队**：联合架构委员会（Agent A 系统架构 / Agent B 数据安全 / Agent C 前端性能 / Agent D 工程化）  
> **报告日期**：2026-09-18  

---

## 一、审查综述与系统现状

GravityD 近期经历了一次重大战略架构演进：从原有的 Python FastAPI（8001端口）+ MySQL/PostgreSQL 经典三层单体模式，切换为以 **Vue3 + 自托管 InsForge (PostgreSQL + PostgREST + GoTrue Auth) + `@gravityd/cli` 二次开发脚手架** 为核心的现代 BaaS (Backend-as-a-Service) 架构。

本次多 Agent 联合审查从**架构演进契合度**、**数据库与行级安全 (RLS)**、**前端工程与渲染吞吐**、**脚手架工具链与运维部署**四个核心维度切入，对当前仓库进行了无死角穿透审计。

### 核心审查指标评级摘要

| 审查维度 | 责任 Agent | 现状评级 | 核心发现与风险等级 |
| :--- | :--- | :---: | :--- |
| **系统架构与演进** | Agent A (系统架构专家) | ⚠️ **需治理 (B-)** | FastAPI 剥离后复杂事务无宿主，前后端职责倒挂，缺乏标准异步/批处理承载层 |
| **数据层与行级安全** | Agent B (数据安全卫士) | 🛑 **严重风险 (D)** | **P0 致命级**：所有核心表 RLS 为 `USING(true) WITH CHECK(true)`，可直连 REST 随意提权超管与篡改全库 |
| **前端架构与性能** | Agent C (前端性能专家) | ⚠️ **需治理 (C+)** | **P1 高危级**：全表拉取并在内存分页；PostgREST 默认 1000 行截断 bug；残留 8001 死代码 |
| **工程化与脚手架** | Agent D (工程化专家) | ⚡ **良好 (B+)** | `@gravityd/cli` 流程顺畅且有端口避让设计，但代码生成模板固化了不安全 RLS 与低效内存分页 |

---

## 二、维度一（Agent A）：系统架构演进与边界划分审计

### 1.1 核心架构现状
系统剥离了原有的 FastAPI 后端，前端直接通过 `@insforge/sdk`（基于 PostgREST 协议）直接对 PostgreSQL 数据库中的业务表进行 CRUD 操作。

### 1.2 架构缺陷与隐患深度剖析

#### 缺陷 1.1：复杂业务事务缺乏原子性保证（分布式脏数据风险）
- **现象描述**：由于去除了传统的后端业务层，在处理需要多表协同的逻辑（如：创建用户并同时绑定部门、角色、岗位）时，业务逻辑被分散在前端：
  ```ts
  // 伪代码：frontend/web/src/api/module_system/user.ts
  const userId = await createUserProfile();
  await insertUserRoles(userId, roleIds);
  await insertUserPositions(userId, positionIds);
  ```
- **影响分析**：若用户网络在第 2 步与第 3 步之间断开，或者数据库在写入岗位时抛出约束错误，前面已创建的 Profile 和 Role 将不会回滚，导致数据库中产生**孤儿数据与状态撕裂**。
- **架构建议**：对于复合业务流程，必须在 PostgreSQL 层面建立 `SECURITY DEFINER` 的存储过程（Database Functions），或者在 InsForge 中规范化声明轻量级 Edge Function 进行原子封装。

#### 缺陷 1.2：重度计算与异步任务处于空白悬空状态
- **现象描述**：所有列表的“导出”功能在脚手架模板和现有代码中均统一处理为：
  ```ts
  async exportCustomer(_query: CustomerPageQuery) {
    throw new Error("未迁移导出");
  }
  ```
- **影响分析**：纯 PostgREST 适合轻量交互，但在生成大型 Excel、数据清洗、多模态处理（如 AI 对话、工作流）时天然无能为力。系统缺乏统一的 Worker / Edge 计算层标准规范。

---

## 三、维度二（Agent B）：数据层架构与安全穿透审计

### 2.1 【P0 致命级漏洞】虚假 RLS 策略导致任意已登录用户越权提权

#### 漏洞代码定位
在 `insforge-app/migrations/001_system_schema.sql`、`003_system_extend.sql` 以及 `@gravityd/cli` 生成的所有业务迁移中：
```sql
CREATE POLICY authenticated_all ON public.sys_dept FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_role FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_menu FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.profiles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY authenticated_all ON public.sys_role_menus FOR ALL TO authenticated USING (true) WITH CHECK (true);
```

#### 漏洞验证 (PoC - Proof of Concept)
虽然前端在 UI 层面做了 `v-hasPermi` 和菜单过滤，但 PostgREST 的 REST API 规则由 RLS 直接决定：
1. **任意登录用户提权为系统超级管理员**：
   任意普通权限账号使用其合法 Bearer Token，向 PostgREST 发起 HTTP 请求：
   ```http
   PATCH /rest/v1/profiles?id=eq.<当前用户UUID> HTTP/1.1
   Host: 127.0.0.1:7130
   Authorization: Bearer <当前用户JWT>
   Content-Type: application/json

   {
     "is_superuser": true
   }
   ```
   **执行结果**：HTTP 204 No Content，数据库中的 `is_superuser` 字段被成功修改为 `true`。刷新前端页面后，该普通用户即刻成为系统超管，掌握所有权限！
2. **恶意清空核心权限表**：
   ```http
   DELETE /rest/v1/sys_role HTTP/1.1
   Host: 127.0.0.1:7130
   Authorization: Bearer <当前用户JWT>
   ```
   **执行结果**：整张 `sys_role` 被瞬间清空，导致全系统权限彻底瘫痪。

### 2.2 【P2 架构设计缺陷】SQL 保留字列名 `"order"` 冲突
- **现象描述**：`public.sys_menu`、`public.sys_dept`、`public.sys_role` 及 CLI 生成的业务表中，排序列均命名为双引号转义的 `"order"`。
- **影响分析**：PostgREST 客户端发起 `.order('order')` 时极易触发 SQL 解析冲突或驱动报错，迫使前端开发团队放弃 SQL 级排序，退化为前端全量拉取后用 JavaScript 排序。
- **整改建议**：新业务表统一规范命名为 `sort_order` 或 `list_order`。

---

## 四、维度三（Agent C）：前端架构、性能与代码质量审计

### 3.1 【P1 高危级】全表拉取并在内存分页的反模式（Memory Pagination）

#### 代码定位
查看 `frontend/web/src/api/module_system/position.ts`、`notice.ts`、`dict.ts` 以及 CLI 生成的模板：
```ts
const { pageNo, pageSize } = rangeOf(query?.page_no, query?.page_size);
let builder = insforge.database.from("sys_position").select("*");
if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
// ...
const rows = ((unwrap(await builder) as PositionTable[]) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
return ok(pageOf(rows.slice((pageNo - 1) * pageSize, pageNo * pageSize), rows.length, pageNo, pageSize));
```

#### 危害深度推演
1. **网络与浏览器性能劣化**：每一次分页点击，前端都把整个数据库表的所有行（包含大文本、描述字段）全量传输到客户端，随着数据累积，网络包膨胀至数兆，页面发生严重卡顿；
2. **PostgREST 1000 行静默截断 Bug**：PostgREST 官方默认配置了 `max-rows = 1000`。当数据超过 1000 条时，`builder.select('*')` 永远只能拿到前 1000 条。前端算出的 `total` 永远被死死卡在 1000，第 1001 条之后的数据在系统界面中**永久消失**！

### 3.2 【P2 稳定性隐患】死代码与僵尸服务残留
1. `frontend/web/src/views/module_ai/chat/index.vue`（第 99 行）：仍然硬编码 `new URL("/api/v1/ai/chat/ws", WS_URL)`，访问直接触发网络故障；
2. `frontend/web/src/api/module_storage/transfer.ts`（第 155 行）：依赖 `/api/v1/task/storage/transfer/stream`；
3. `frontend/docs` 整个文档站仍在指导使用者配置并启动 `http://127.0.0.1:8001` FastAPI 后端，严重误导新手与维护人员。

---

## 五、维度四（Agent D）：工程化、脚手架工具与运维审计

### 4.1 `@gravityd/cli` 工具链现状与痛点
- **优势亮点**：
  1. `packages/gravityd-cli` 实现了 `link`、`status`、`module add`、`migrate apply` 等命令，具备命令幂等控制和非 TTY JSON 输出，架构设计精巧；
  2. 端口隔离周密：默认将 InsForge 数据库映射为 `5433`，严禁占用开发者本机已有的 `5432` / `6379`。
- **痛点与缺陷**：
  `packages/gravityd-cli/lib/scaffold-sql-api.mjs` 中的代码生成模板，硬编码了上述 **不安全 RLS**、**`"order"` 保留字** 和 **全量内存分页**。开发者每创建一个新模块，系统就自动在代码库中播撒一次安全与性能隐患。

### 4.2 移动端 `frontend/app` 脱节
- `frontend/app` 仍停留在基于 Alova 请求原 FastAPI 的状态，未接入 `@insforge/sdk`，目前处于废弃未同步状态。

---

## 六、整改实施行动路线图

根据 6A 规范，本次审查将直接产出可执行的工程治理规划：

| 阶段 | 治理模块 | 核心工作事项 | 验收标准 |
| :---: | :--- | :--- | :--- |
| **Phase 1** | **数据层安全加固 (P0)** | 编写并应用 `007_secure_rls.sql`，建立真正的 RLS 隔离策略 | 任意普通用户调用 PostgREST 无法修改自身 `is_superuser`，无法越权修改系统表 |
| **Phase 2** | **前端真服务端分页 (P1)** | 在 `insforge-api.ts` 中封装 `serverPageOf`，原生利用 `range` 与 `Prefer: count=exact` | 单次分页仅拉取对应 10 条数据，超 1000 条数据正常统计与显示 |
| **Phase 3** | **脚手架模板修正 (P1)** | 修改 `packages/gravityd-cli/lib/scaffold-sql-api.mjs`，消除 `"order"`，接入安全 RLS 和真分页 | 新生成的模块开箱即具备安全 RLS 与高效分页，CLI 单元测试 100% 通过 |
| **Phase 4** | **死代码治理与文档更新** | 规范化降级旧模块（AI聊天/存储），同步更新脚手架说明文档 | 控制台无 404/WebSocket 报错，文档与 BaaS 现状完全一致 |

---
EOF
