# 阶段1: CONSENSUS (共识阶段) - 后端多 BaaS 配置与适配 (InsForge / Firebase)

> 文档路径: `docs/后端多BaaS配置_InsForge与Firebase/CONSENSUS_后端多BaaS配置_InsForge与Firebase.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段1: Align → Consensus)  
> 责任角色: 资深软件架构师 & 系统工程专家 (Gemini)  
> 状态: 已达成明确共识  

---

## 1. 明确的需求描述与验收标准

### 1.1 核心需求
1. **项目初始化后端选型与环境配置**：
   - `scripts/init.sh` 在执行时支持交互式提问（或接收参数 `--provider=insforge|firebase`）。
   - **选择 InsForge 时**：拉起 Docker 容器、执行 SQL 迁移（001~006）、创建初始超管、写入 `.env.development` 中 `VITE_BACKEND_PROVIDER=insforge` 及 InsForge 端口配置。
   - **选择 Firebase 时**：引导或自动生成 Firebase 环境变量模板（`VITE_BACKEND_PROVIDER=firebase` 及 `VITE_FIREBASE_*` 配置项），跳过本地 Postgres 容器启动，提供 `npm run seed:firebase` 或内置命令行工具为 Firestore 注入初始系统数据。
2. **多 BaaS 统一抽象与可配置体系**：
   - 默认通过环境变量（`VITE_BACKEND_PROVIDER=insforge|firebase`）指定默认后端。
   - **支持运行时动态切换**：在前端设置或登录界面支持查看与切换当前生效的 BaaS 提供商（持久化到本地缓存），切换后能够即时重载 BaaS 客户端实例与对应认证状态。
3. **统一 BaaS 适配器层 (Adapter Pattern)**：
   - 建立统一的客户端接口 `IBaasClient`，封装 `auth`（认证与 Token 维护）、`db`（统一的数据集 CRUD、筛选、排序、服务端分页 `serverPageOf`）、`storage`（文件上传与下载）、`presence`（登录日志与在线状态）。
   - **InsForge 适配器 (`InsforgeAdapter`)**：封装 `@insforge/sdk` 和 PostgREST API，实现原有能力 100% 兼容。
   - **Firebase 适配器 (`FirebaseAdapter`)**：引入 `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`，实现同等功能。
4. **Firestore 顶级集合 1:1 数据对齐**：
   - Firestore 采用扁平化顶级集合（如 `profiles`, `sys_menu`, `sys_role`, `sys_dept`, `sys_dict_type`, `sys_dict_data`, `sys_notice`, `sys_position`, `sys_version`, `sys_ticket`, `sys_operation_log`, `sys_login_log`, `sys_online`）。
   - 提供初始种子数据（Seed Data）脚本/工具，支持一键在 Firebase 中生成基础菜单与超级管理员账户。
5. **全量系统模块无缝适配**：
   - 覆盖系统管理全量模块：用户管理、角色与权限、菜单管理、部门管理、字典管理、公告通知、岗位管理、版本管理、工单系统、日志管理、在线用户监控。

### 1.2 验收标准 (Acceptance Criteria)
1. **[AC-01] 初始化与配置**：
   - 执行 `bash scripts/init.sh` 支持选择 InsForge 或 Firebase，分别正确生成前端环境变量与运行依赖。
   - 当配置/切换为 `insforge` 时，系统全功能与当前行为完全一致，无任何回归错误。
   - 当配置/切换为 `firebase` 时，系统能够正常使用 Firebase Auth 完成登录，并从 Firestore 拉取菜单、角色、部门及业务数据。
   - 运行时切换 BaaS 提供商后，客户端状态平滑迁移并清空上一提供商的鉴权缓存。
2. **[AC-02] CRUD 与分页一致性**：
   - 两种 BaaS 驱动下的 `serverPageOf` 均输出统一的 `ApiResponse<PageResult<T>>` 格式，支持精准总数统计、字段排序和过滤条件。
3. **[AC-03] 类型安全与代码质量**：
   - `pnpm vue-tsc --noEmit` 类型检查 100% 通过。
   - `pnpm vitest run` 自动化测试 100% 通过（包含 BaaS 适配器与驱动单测）。
4. **[AC-04] 文档与种子工具**：
   - 产出清晰的 Firebase 配置说明与 Firestore 种子数据初始化说明，包含 CLI 与脚本操作。

---

## 2. 技术方案与约束

### 2.1 架构设计
- **设计模式**：工厂模式 (Factory) + 策略模式 (Strategy) + 适配器模式 (Adapter) + 单例模式 (Singleton)。
- **核心模块划分**：
  - `src/utils/baas/types.ts`：定义统一接口契约 (`IBaasClient`, `IBaasAuth`, `IBaasDatabase`, `IBaasStorage`, `BaaSQueryBuilder`)。
  - `src/utils/baas/adapters/insforge.adapter.ts`：InsForge 驱动实现。
  - `src/utils/baas/adapters/firebase.adapter.ts`：Firebase 驱动实现。
  - `src/utils/baas/index.ts`：门面导出 `baas` 实例及 `getBaaSProvider()` / `setBaaSProvider()` 动态切换函数。
  - `src/utils/baas/firebase-config.ts`：Firebase 初始化与配置载入。
  - `src/utils/baas/seed-firebase.ts`：Firestore 初始种子数据生成器（供初次部署一键播种）。

### 2.2 技术约束
1. **依赖库规范**：引入官方 `firebase`（v10+ 模块化 API）到 `frontend/web/package.json`，使用按需导入（Tree-shaking 友好）。
2. **敏感配置规范**：Firebase API Key 等连接参数通过 `.env` 管理（例如 `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_PROJECT_ID` 等），绝不硬编码提交。
3. **API 接口签名向后兼容**：`src/api/*` 现有的导出函数签名与返回类型保持不变，内部统一通过 `baas` 门面进行数据操作。

---

## 3. 任务边界限制

| 模块 | InsForge 模式 | Firebase 模式 | 边界说明 |
|---|---|---|---|
| 用户认证 (Auth) | InsForge JWT Session | Firebase Auth (Email/Pass & Token) | 均统一映射为 `LoginResult` |
| 数据库 (Database) | PostgREST SQL | Cloud Firestore NoSQL | 顶级集合名与 SQL 表名 1:1 对齐 |
| 文件存储 (Storage) | InsForge Storage | Firebase Storage | 统一 Upload / Download 接口 |
| 在线监控 & 日志 | `sys_online` / `sys_login_log` | `sys_online` / `sys_login_log` (Firestore Doc) | 字段命名与格式保持完全一致 |

---

## 4. 质量门控核对

- [x] 需求边界清晰无歧义
- [x] 技术方案与现有 Vue 3 / Vite 架构深度对齐
- [x] 验收标准明确、可量化、可自动化测试
- [x] 4 项关键决策已获用户确认（运行时动态切换、顶级集合映射、全量系统管理覆盖、Web 端主力落地）
