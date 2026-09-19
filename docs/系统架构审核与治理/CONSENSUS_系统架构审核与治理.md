# 阶段1: CONSENSUS (共识阶段) - 系统架构审核与治理

> 文档路径: `docs/系统架构审核与治理/CONSENSUS_系统架构审核与治理.md`  
> 规范依据: 团队 6A 工作流程规范 (阶段1: 共识达成)  
> 责任团队: 架构评审委员会  

---

## 1. 核心技术共识

### 1.1 RLS 安全设计共识
- 废止全量 `USING (true) WITH CHECK (true)` 策略。
- 在 `public` Schema 建立安全定义函数：
  - `public.current_user_id()`：解析 JWT Claim 中的 `sub`，获取当前登录者 UUID。
  - `public.is_superuser()`：以 `SECURITY DEFINER` 检查当前用户在 `profiles` 中是否 `is_superuser = true`。
- `profiles` 表策略：普通用户仅可更新自身非敏感字段（禁止非超管变更 `is_superuser`）。
- 系统表（`sys_role`, `sys_menu`, `sys_user_roles`, `sys_role_menus`, `sys_dept`）：仅超管有写权限，已认证用户只读。

### 1.2 前端分页机制共识
- 坚决废除全量拉取后用 JS 内存 `sort` + `slice` 的做法。
- 在 `frontend/web/src/utils/insforge-api.ts` 中提供统一的标准工具函数 `serverPageOf<T>(queryBuilder, pageNo, pageSize, sortField, ascending)`。
- 通过 PostgREST 原生响应头提取 `count`（总条数），并通过 `.range(from, to)` 精准切片，彻底消除 1000 行静默截断隐患与前端内存暴涨。

### 1.3 CLI 脚手架模板共识
- `packages/gravityd-cli/lib/scaffold-sql-api.mjs` 中：
  - 新建业务表字段命名由 `"order"` 改为 `sort_order`，避免 SQL 保留字冲突；
  - 自动生成符合上述安全规范的 RLS 策略（超管全权，普通用户 `owner_id = current_user_id()`）；
  - 自动生成调用 `serverPageOf` 的生产级 API 代码。

---

## 2. 验收标准契约

| 检查项 | 验证手段 | 预期结果 |
| :--- | :--- | :--- |
| **RLS 防越权提权** | 普通用户 Token 发起 PATCH `is_superuser: true` | PostgREST 返回 403 或无记录更新（0 rows affected） |
| **RLS 防清库** | 普通用户 Token 发起 DELETE `sys_role` | PostgREST 返回 403 或 0 行影响 |
| **真服务端分页** | 页面列表请求 | 实际传输数据量严格等于 `pageSize`，total 来源于真实 count |
| **CLI 自动化生成** | 执行 `gravityd module add --domain test --resource item --title 测试` | 生成合规 SQL/API/Vue，不含 `"order"`，RLS 具备行级保护 |
| **脚手架测试用例** | 执行 `npm test`（`packages/gravityd-cli`） | 测试用例全部通过 |

---
EOF
