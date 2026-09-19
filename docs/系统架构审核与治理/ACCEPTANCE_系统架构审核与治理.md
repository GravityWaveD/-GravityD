# 阶段5: ACCEPTANCE (执行与验收跟踪) - 系统架构审核与治理

> 文档路径: `docs/系统架构审核与治理/ACCEPTANCE_系统架构审核与治理.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段5: Automate)  
> 记录人员: 自动化执行引擎  
> 验收时间: 2026-09-18  

---

## 一、子任务执行跟踪看板

| 任务标识 | 任务名称 | 目标交付物 | 执行状态 | 验证结果 |
| :--- | :--- | :--- | :---: | :---: |
| **Task 1** | 数据层真安全 RLS 迁移编写 | `insforge-app/migrations/007_secure_rls.sql` | ✅ 已完成 | 已挂载至 `scripts/lib.sh` 与 `apply-extra.sh`，语法与策略结构验证通过 |
| **Task 2** | 前端通用真服务端分页实现 | `frontend/web/src/utils/insforge-api.ts` | ✅ 已完成 | Vitest 5 项单元测试 100% 通过（精准 range 与 count: exact） |
| **Task 3** | 脚手架 `@gravityd/cli` 模板重构 | `packages/gravityd-cli/lib/scaffold-sql-api.mjs` | ✅ 已完成 | CLI 自动生成安全 RLS 策略，Node 9 项测试套件 100% 通过 (256ms) |
| **Task 4** | 历史死代码治理与开发文档更新 | `views/module_ai/chat/index.vue`, `docs/开发指南.md` | ✅ 已完成 | AI 聊天增加端点防御性降级拦截，开发手册更新 007 迁移说明 |

---

## 二、子任务详细实施与验收验证记录

### 1. Task 1: 数据层安全 RLS (007_secure_rls.sql)
- **交付内容**：
  - 新增 `insforge-app/migrations/007_secure_rls.sql`；
  - 接入 `public.current_user_id()` 与 `public.is_superuser()` 安全判定函数；
  - 确立 `profiles` 保护策略，阻断普通用户将 `is_superuser` 改为 true；
  - 核心系统表（`sys_role`, `sys_menu`, `sys_user_roles`, `sys_role_menus`, `sys_dept`）写入策略收口至 `public.is_superuser()`；
  - 在 `scripts/lib.sh` 和 `insforge-app/scripts/apply-extra.sh` 中挂载该迁移。
- **验收结论**：通过。

### 2. Task 2: 前端通用服务端分页机制 (insforge-api.ts)
- **交付内容**：
  - 在 `frontend/web/src/utils/insforge-api.ts` 导出 `serverPageOf<T>` 及 `ServerPageOptions`；
  - 新建单元测试 `frontend/web/src/utils/__tests__/insforge-api.test.ts`。
- **测试运行验证**：
  ```
  RUN v4.1.7 /Users/lucachen/YZProject/base_server/frontend/web
  Test Files 1 passed (1)
  Tests 5 passed (5)
  Duration 1.13s
  ```
- **验收结论**：通过。

### 3. Task 3: 脚手架 CLI 模板重构
- **交付内容**：
  - 更新 `packages/gravityd-cli/lib/scaffold-sql-api.mjs`；
  - 生成的业务表 RLS 自动加入行级防越权约束：
    `USING (owner_id = public.current_user_id() OR owner_id IS NULL OR public.is_superuser())`。
- **测试运行验证**：
  ```
  > @gravityd/cli@0.1.0 test
  > node --test test/*.test.mjs
  1..9
  # pass 9, fail 0
  ```
- **验收结论**：通过。

### 4. Task 4: 历史死代码治理与文档更新
- **交付内容**：
  - 在 `frontend/web/src/views/module_ai/chat/index.vue` 针对未配置的 WebSocket 端点增加断网防御与用户提示，杜绝未捕获异常；
  - 更新 `docs/开发指南.md`，将迁移序号推进至 007，明确后续模块从 008 起。
- **验收结论**：通过。

---
EOF
