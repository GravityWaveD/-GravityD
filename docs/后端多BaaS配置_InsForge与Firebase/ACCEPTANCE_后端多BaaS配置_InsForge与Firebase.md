# 阶段5 & 阶段6: ACCEPTANCE (执行与验收记录) - 后端多 BaaS 配置与适配 (InsForge / Firebase)

> 文档路径: `docs/后端多BaaS配置_InsForge与Firebase/ACCEPTANCE_后端多BaaS配置_InsForge与Firebase.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段5: Automate & 阶段6: Assess)  
> 责任角色: 执行专家 (Grok) 收集证据 ｜ 资深架构师 (Gemini) 审查达标  
> 状态: **达标验收已完成 (PASSED)**，交付物已归档  

---

## 1. 子任务执行状态表

| 任务编号 | 任务名称 | 目标模块/路径 | 状态 | 实施说明 / 证据 |
|---|---|---|---|---|
| **TASK-0** | 项目初始化脚本与 CLI 选型升级 | `scripts/init.sh`<br>`scripts/lib.sh`<br>`packages/gravityd-cli` | **已完成** | `bash scripts/init.sh --provider=insforge\|firebase [--dry-run]`；交互菜单 `[1] InsForge / [2] Firebase`；`gravityd link --provider` 写入 `.gravityd/project.json` 与 `VITE_BACKEND_PROVIDER`；`gravityd init --provider` 转调 `init.sh`。CLI 13 项测试通过；`--dry-run` 不改本机 env / 不拉 Docker |
| **TASK-1** | 依赖安装与统一 BaaS 契约定义 | `src/utils/baas/types.ts`<br>`src/utils/baas/error.ts` | **已完成** | 成功安装 `firebase` 依赖，定义 `IBaasClient`, `IBaasAuth`, `IBaasDatabase`, `IBaaSTableQuery`, `IBaasStorage` 等全套 TypeScript 接口契约，实现统一 `BaaSError` 和错误识别机制 |
| **TASK-2** | InsForge 适配器封装 | `src/utils/baas/adapters/insforge.adapter.ts` | **已完成** | 封装 `@insforge/sdk`，实现 `InsforgeAdapter` 及 `InsforgeTableQuery` 链式查询构建器 (支持 `select`, `eq`, `in`, `ilike`, `order`, `range`, `insert`, `update`, `delete`, `single`) 与认证/存储方法 |
| **TASK-3** | Firebase 适配器与 Firestore 查询构建器 | `src/utils/baas/adapters/firebase.adapter.ts`<br>`src/utils/baas/firebase-config.ts` | **已完成** | 基于 Firebase v10+ 模块化 SDK (`firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/storage`) 实现 `FirebaseAdapter` 与内存+服务端综合过滤查询构建器 `FirestoreQueryBuilder` |
| **TASK-4** | BaaS 门面与运行时动态切换管理 | `src/utils/baas/index.ts`<br>`src/utils/baas/api-helper.ts`<br>`src/utils/insforge.ts`<br>`src/utils/insforge-api.ts` | **已完成** | 提供单例与运行时动态切换 `getBaaSProvider()` / `setBaaSProvider()`，实现 `ok()`, `unwrap()`, `serverPageOf()`, `pageOf()`, `buildTree()`, `rangeOf()`，平滑兼容旧 `insforge.ts` 与 `insforge-api.ts` 别名 |
| **TASK-5** | Firebase 初始数据种子生成器 | `src/utils/baas/seed-firebase.ts` | **已完成** | 提取系统初始全部菜单数据 (15+ 项)、初始字典类型与字典数据、初始超管部门、系统角色和全局参数，提供 `seedFirebaseData()` 一键导入 Firestore |
| **TASK-6** | 业务 API 层与 Store 解耦重构 | `src/api/module_system/*`<br>`src/api/module_monitor/*`<br>`src/store/modules/user.store.ts`<br>`src/router/guards.ts`<br>`src/App.vue` | **已完成** | 全量重构 `auth.ts`, `user.ts`, `menu.ts`, `role.ts`, `dept.ts`, `dict.ts`, `notice.ts`, `position.ts`, `version.ts`, `ticket.ts`, `log.ts`, `online.ts`, `dashboard.ts` 等业务模块，统一接入 `baas` 适配层与 `isBaaSAuthError` / `syncBaaSToken` |
| **TASK-7** | UI 动态切换组件与系统设置接入 | `src/layouts/fa-settings-panel/widgets/FaBaaSSettings.vue`<br>`src/layouts/fa-settings-panel/index.vue` | **已完成** | 在系统设置右侧抽屉中新增 BaaS 引擎配置卡片，支持实时切换 InsForge / Firebase，切换后提示并刷新页面，并提供「一键初始化 Firebase 基础数据」按钮 |
| **TASK-8** | 自动化测试套件与双引擎验证 | `tests/baas.test.ts` | **已完成** | 编写单元测试套件覆盖供应商状态切换、BaaSError 错误捕获、通用数据处理助手 (unwrap/buildTree/rangeOf/serverPageOf)、FirestoreQueryBuilder 内存过滤与分页、Firebase 种子播种逻辑等 |

---

## 2. 详细执行日志与代码变更记录

1. **依赖升级**:
   - 在 `frontend/web/package.json` 中安装 `firebase` 模块。
2. **统一 BaaS 核心契约**:
   - `src/utils/baas/types.ts`: 定义 BaaSProviderType, IBaasClient, IBaasAuth, IBaasDatabase, IBaaSTableQuery, IBaasStorage 等抽象类型。
   - `src/utils/baas/error.ts`: 定义统一 BaaSError 类，封装认证错误判定函数 isBaaSAuthError, isBaaSAuthMessage（同时支持 InsForge JWT 与 Firebase Auth 错误代码）。
3. **适配器实现**:
   - `src/utils/baas/adapters/insforge.adapter.ts`: 封装 `@insforge/sdk` 的客户端、认证、PostgREST 数据表与 Storage 存储桶。
   - `src/utils/baas/firebase-config.ts`: 封装 Firebase 初始化与环境变量读取。
   - `src/utils/baas/adapters/firebase.adapter.ts`: 封装 Firebase Authentication, Cloud Firestore (带内存排序与过滤回退能力的 FirestoreQueryBuilder), Firebase Storage。
4. **门面与兼容助手**:
   - `src/utils/baas/index.ts`: 导出 `baas` 动态代理、`getBaaSProvider()`, `setBaaSProvider()`, `syncBaaSToken()` 等 API。
   - `src/utils/baas/api-helper.ts`: 导出 `ok()`, `unwrap()`, `serverPageOf()`, `pageOf()`, `buildTree()`, `rangeOf()` 等工具。
   - `src/utils/insforge.ts` & `src/utils/insforge-api.ts`: 保留向后兼容别名导出并自动转发至 BaaS 统一层。
5. **Firebase 初始数据种子**:
   - `src/utils/baas/seed-firebase.ts`: 内置菜单 (INITIAL_MENUS)、部门 (INITIAL_DEPTS)、角色 (INITIAL_ROLES)、字典类型 (INITIAL_DICT_TYPES)、字典项 (INITIAL_DICT_DATAS)、参数 (INITIAL_PARAMS) 及其写入 Firestore 的批量迁移逻辑。
6. **业务系统与监控模块重构**:
   - `src/api/module_system/auth.ts`: 改造为使用 `baas.auth` 进行登入登出。
   - `src/api/module_system/user.ts`: 改造为通过 `baas.database` 进行 profiles、角色关联与部门关联检索与修改。
   - `src/api/module_system/menu.ts`, `role.ts`, `dept.ts`, `dict.ts`, `notice.ts`, `position.ts`, `version.ts`, `ticket.ts`, `log.ts`: 全部切换至 `baas.database` 与 `api-helper`。
   - `src/api/module_monitor/online.ts`, `dashboard.ts`: 适配 `baas.database`。
   - `src/store/modules/user.store.ts`, `src/router/guards.ts`, `src/App.vue`: 统一使用 `isBaaSAuthError` 和 `syncBaaSToken`。
7. **前端交互与设置面板集成**:
   - 新增组件 `src/layouts/fa-settings-panel/widgets/FaBaaSSettings.vue` 并在 `src/layouts/fa-settings-panel/index.vue` 中挂载，支持选择 InsForge / Firebase，并支持调用数据播种功能。
8. **自动化测试与全量类型校验**:
   - 新建 `frontend/web/tests/baas.test.ts`。
   - 修复了业务系统全部类型兼容性。

---

## 3. 验证事实与自动化测试证据

### 3.1 前端单元测试 (`node node_modules/vitest/dist/cli.js run`，2026-09-20 15:35)

```text
Test Files  3 passed (3)
     Tests  24 passed (24)
```

覆盖 `src/__tests__/smoke.spec.ts`、`src/utils/__tests__/insforge-api.test.ts`、`tests/baas.test.ts`（提供商切换、BaaSError、分页、FirestoreQueryBuilder、种子）。

### 3.2 CLI 单元测试 (`node --test test/*.test.mjs` in `packages/gravityd-cli`)

```text
# tests 13
# pass 13
# fail 0
```

含 `--provider=firebase` 写 env、`init --dry-run`、`normalizeProvider`。

### 3.3 `init.sh` dry-run

```text
bash scripts/init.sh --provider=firebase --dry-run   # 退出码 0，不写 env
bash scripts/init.sh --provider=insforge --dry-run   # 退出码 0，不拉 Docker
```

### 3.4 TypeScript 类型检查 (`vue-tsc --noEmit --skipLibCheck`)

退出码 0，全量类型检查 0 error。

---

## 4. 结论与交付物事实（Grok Assess，待 Gemini 判定）

- TASK-0～TASK-8 代码与文档已落地；初始化可选 InsForge / Firebase。
- 构建期：`VITE_BACKEND_PROVIDER=insforge|firebase`。运行时：`localStorage.gravityd_baas_provider` + 设置抽屉切换。
- 自动化测试与 `vue-tsc` 已通过。
- **未在本会话验证**：真实 Firebase 项目登录、往本机 `.env.development` 写入 firebase 并浏览器走通（避免覆盖现有 InsForge 开发环境）。
- **仍需人工**：Firebase 控制台凭据、Firebase Auth 超管账号 `admin@local.dev` / `123456`、Firestore 规则。

环境变量名以 `VITE_BACKEND_PROVIDER` 为准（不是 `VITE_BAAS_PROVIDER`）。
