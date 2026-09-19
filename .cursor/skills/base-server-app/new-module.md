# 新业务模块清单

以「客户 CRM」为例：域 `crm`，资源 `customer`，菜单 id 从 `100` 起。

推荐先生成再改字段（完整 CLI 说明见 [docs/gravityd-cli.md](../../../docs/gravityd-cli.md)）：

```bash
npx --yes ./packages/gravityd-cli link --project-id local -y
npx --yes ./packages/gravityd-cli module add --domain crm --resource customer --title 客户 --fields mobile:text --dry-run
npx --yes ./packages/gravityd-cli module add --domain crm --resource customer --title 客户 --fields mobile:text
npx --yes ./packages/gravityd-cli migrate apply --file 009_crm_customer.sql
```

## 1. SQL

新建 `insforge-app/migrations/009_crm_customer.sql`（数字取当前最大 + 1；`007`/`008` 已被安全和 Agent 占用）。

```sql
CREATE TABLE IF NOT EXISTS public.crm_customer (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  mobile TEXT,
  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 999,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_crm_customer_owner ON public.crm_customer(owner_id);

ALTER TABLE public.crm_customer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS crm_customer_owner_or_admin ON public.crm_customer;
CREATE POLICY crm_customer_owner_or_admin ON public.crm_customer
  FOR ALL TO authenticated
  USING (owner_id = public.current_user_id() OR owner_id IS NULL OR public.is_superuser())
  WITH CHECK (owner_id = public.current_user_id() OR owner_id IS NULL OR public.is_superuser());

-- 菜单：100 目录 / 101 页面 / 102+ 按钮
DELETE FROM public.sys_role_menus WHERE menu_id >= 100 AND menu_id < 110;
DELETE FROM public.sys_menu WHERE id >= 100 AND id < 110;

INSERT INTO public.sys_menu (
  id, name, type, icon, "order", permission, route_name, route_path, component_path,
  redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link,
  is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description
) VALUES
  (100, 'CRM', 1, 'ri:briefcase-line', 10, NULL, 'Crm', '/crm', NULL, '/crm/customer',
   NULL, true, false, false, 'CRM', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '业务'),
  (101, '客户', 2, 'ri:user-star-line', 1, 'module_crm:customer:query', 'CrmCustomer',
   'customer', 'module_crm/customer/index', NULL, 100, true, false, false, '客户',
   NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (102, '查询', 3, NULL, 1, 'module_crm:customer:query', NULL, NULL, NULL, NULL, 101,
   true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (103, '新增', 3, NULL, 2, 'module_crm:customer:create', NULL, NULL, NULL, NULL, 101,
   true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (104, '编辑', 3, NULL, 3, 'module_crm:customer:update', NULL, NULL, NULL, NULL, 101,
   true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (105, '删除', 3, NULL, 4, 'module_crm:customer:delete', NULL, NULL, NULL, NULL, 101,
   true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL);

SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), (SELECT MAX(id) FROM public.sys_menu));

INSERT INTO public.sys_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m
WHERE r.code = 'SUPER_ADMIN' AND m.id >= 100 AND m.id < 110
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
```

字段惯例：`status` 0 正常；`sort_order` 越小越前；审计用 `created_time` / `updated_time`。关联用户一律 UUID → `profiles(id)`。

## 2. 应用迁移

```bash
cd insforge
docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 \
  < ../insforge-app/migrations/009_crm_customer.sql
```

不要跑 `insforge-app/scripts/apply.sh`。

## 3. API

新建 `frontend/web/src/api/module_crm/customer.ts`，整页对照 `module_system/position.ts`：

```ts
import { insforge } from "@/utils/insforge";
import { ok, pageOf, rangeOf, unwrap } from "@/utils/insforge-api";

const CustomerAPI = {
  async listCustomer(query?: CustomerPageQuery) {
    const { pageNo, pageSize } = rangeOf(query?.page_no, query?.page_size);
    let builder = insforge.database.from("crm_customer").select("*");
    if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query?.status !== undefined && query.status !== null) builder = builder.eq("status", query.status);
    const rows = ((unwrap(await builder) as CustomerTable[]) || []).slice();
    rows.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return ok(pageOf(rows.slice((pageNo - 1) * pageSize, pageNo * pageSize), rows.length, pageNo, pageSize));
  },
  // detail / create / update / delete / batch 同样 unwrap + ok(..., true)
};

export default CustomerAPI;
```

树形数据用 `buildTree`。选项下拉 `select` 必要列即可。

## 4. 页面

复制 `frontend/web/src/views/module_system/position/index.vue` → `frontend/web/src/views/module_crm/customer/index.vue`。

替换：API 导入、`perm-*` 权限码、列定义、表单字段、`useTable({ apiFn })`。不要手写 axios / `/api/v1`。

## 5. 菜单字段对齐

| 库字段 | 含义 |
|---|---|
| `type=1` | 目录。`route_path` 绝对，如 `/crm`；`redirect` 绝对，如 `/crm/customer` |
| `type=2` | 页面。`route_path` 相对，如 `customer`；`component_path` 如 `module_crm/customer/index` |
| `type=3` | 按钮。`permission` 必填，path/component 空 |
| `route_name` | Vue 路由 name，全局唯一（`CrmCustomer`） |
| `scope` | 后台用 `web` |
| `hidden` | true 则侧栏不显示 |

改菜单后重新登录或调现有 `refreshPermissions`，动态路由才会更新。

## 6. 浏览器验收

1. 退出或 `localStorage.clear()` 后登录。
2. 侧栏出现目录，点标题应进入第一个叶子。
3. 列表有数据或空表，不要「请求失败」/ `[路由警告] 找不到组件`。
4. 走一遍新增 → 编辑 → 删除。
5. 子项多时确认侧栏能滚到新目录，没有叠在旧菜单上。
