import { sqlType } from "./names.mjs";

const DEFAULT_FIELD_NAMES = new Set(["name", "order", "sort_order", "status", "description", "owner_id"]);

export function extraColumns(fields) {
  return (fields || []).filter((f) => !DEFAULT_FIELD_NAMES.has(f.name) && f.name !== "id");
}

export function generateSql(ctx) {
  const extras = extraColumns(ctx.fields);
  const extraSql = extras.length
    ? extras.map((f) => `  ${f.name} ${sqlType(f)},`).join("\n") + "\n"
    : "";
  const extraIdx = extras
    .filter((f) => f.name.endsWith("_id") || f.type === "uuid")
    .map((f) => `CREATE INDEX IF NOT EXISTS idx_${ctx.table}_${f.name} ON public.${ctx.table}(${f.name});`)
    .join("\n");
  const extraIdxBlock = extraIdx ? `${extraIdx}\n` : "";

  const dirId = ctx.menuId;
  const pageId = ctx.menuId + 1;
  const q = ctx.menuId + 2;
  const c = ctx.menuId + 3;
  const u = ctx.menuId + 4;
  const d = ctx.menuId + 5;
  const p = ctx.menuId + 6;
  const det = ctx.menuId + 7;
  const exp = ctx.menuId + 8;
  const { start, end } = ctx.range;

  return `-- GravityD module: ${ctx.domain} / ${ctx.resource}
-- Menu ids ${start}-${end - 1} reserved. Do not reuse. Do not re-run 002_seed_system.sql.

CREATE TABLE IF NOT EXISTS public.${ctx.table} (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
${extraSql}  owner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 999,
  status INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  created_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_time TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_${ctx.table}_owner ON public.${ctx.table}(owner_id);
CREATE INDEX IF NOT EXISTS idx_${ctx.table}_status ON public.${ctx.table}(status);
${extraIdxBlock}

ALTER TABLE public.${ctx.table} ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS authenticated_all ON public.${ctx.table};
DROP POLICY IF EXISTS ${ctx.table}_owner_or_admin ON public.${ctx.table};
CREATE POLICY ${ctx.table}_owner_or_admin ON public.${ctx.table}
  FOR ALL TO authenticated
  USING (owner_id = public.current_user_id() OR owner_id IS NULL OR public.is_superuser())
  WITH CHECK (owner_id = public.current_user_id() OR owner_id IS NULL OR public.is_superuser());

DELETE FROM public.sys_role_menus WHERE menu_id >= ${start} AND menu_id < ${end};
DELETE FROM public.sys_menu WHERE id >= ${start} AND id < ${end};

INSERT INTO public.sys_menu (
  id, name, type, icon, "order", permission, route_name, route_path, component_path,
  redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link,
  is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description
) VALUES
  (${dirId}, '${escapeSql(ctx.dirTitle)}', 1, '${ctx.dirIcon}', ${ctx.dirOrder}, NULL, '${ctx.dirRouteName}', '/${ctx.domain}', NULL, '/${ctx.domain}/${ctx.resource}',
   NULL, true, false, false, '${escapeSql(ctx.dirTitle)}', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, '业务'),
  (${pageId}, '${escapeSql(ctx.title)}', 2, '${ctx.pageIcon}', 1, '${ctx.permPrefix}:query', '${ctx.routeName}',
   '${ctx.resource}', '${ctx.componentPath}', NULL, ${dirId}, true, false, false, '${escapeSql(ctx.title)}',
   NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${q}, '查询', 3, NULL, 1, '${ctx.permPrefix}:query', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '查询', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${c}, '新增', 3, NULL, 2, '${ctx.permPrefix}:create', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '新增', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${u}, '编辑', 3, NULL, 3, '${ctx.permPrefix}:update', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '编辑', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${d}, '删除', 3, NULL, 4, '${ctx.permPrefix}:delete', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '删除', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${p}, '启停', 3, NULL, 5, '${ctx.permPrefix}:patch', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '启停', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${det}, '详情', 3, NULL, 6, '${ctx.permPrefix}:detail', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '详情', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL),
  (${exp}, '导出', 3, NULL, 7, '${ctx.permPrefix}:export', NULL, NULL, NULL, NULL, ${pageId},
   true, false, false, '导出', NULL, false, NULL, false, false, NULL, false, NULL, 'web', 0, NULL);

SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), (SELECT MAX(id) FROM public.sys_menu));

INSERT INTO public.sys_role_menus (role_id, menu_id)
SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m
WHERE r.code = 'SUPER_ADMIN' AND m.id >= ${start} AND m.id < ${end}
ON CONFLICT DO NOTHING;

NOTIFY pgrst, 'reload schema';
`;
}

function escapeSql(s) {
  return String(s).replace(/'/g, "''");
}

export function generateApi(ctx) {
  const T = ctx.typePrefix;
  const API = ctx.apiExport;
  const extras = extraColumns(ctx.fields);
  const extraIfaces = extras.length ? extras.map((f) => `  ${f.name}?: ${tsType(f)};`).join("\n") + "\n" : "";
  const extraInsert = extras.length
    ? extras.map((f) => `          ${f.name}: body.${f.name},`).join("\n") + "\n"
    : "";
  const extraUpdate = extras.length
    ? extras.map((f) => `          ${f.name}: body.${f.name},`).join("\n") + "\n"
    : "";

  return `import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";

const ${API} = {
  async list${T}(query?: ${T}PageQuery) {
    let builder = insforge.database.from("${ctx.table}").select("*", { count: "exact" });
    if (query?.name) builder = builder.ilike("name", \`%\${query.name}%\`);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    return serverPageOf<${T}Table>(builder, {
      pageNo: query?.page_no,
      pageSize: query?.page_size,
      sortField: "sort_order",
      ascending: true,
    });
  },

  async detail${T}(id: number) {
    const rows = unwrap(await insforge.database.from("${ctx.table}").select("*").eq("id", id)) as ${T}Table[];
    if (!rows?.[0]) throw new Error("${ctx.title}不存在");
    return ok(rows[0]);
  },

  async create${T}(body: ${T}Form) {
    unwrap(
      await insforge.database.from("${ctx.table}").insert([
        {
          name: body.name,
${extraInsert}
          sort_order: body.sort_order ?? 1,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async update${T}(id: number, body: ${T}Form) {
    unwrap(
      await insforge.database
        .from("${ctx.table}")
        .update({
          name: body.name,
${extraUpdate}
          sort_order: body.sort_order,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async delete${T}(body: number[]) {
    unwrap(await insforge.database.from("${ctx.table}").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batch${T}(body: BatchType) {
    unwrap(await insforge.database.from("${ctx.table}").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async export${T}(_query: ${T}PageQuery) {
    throw new Error("未迁移导出");
  },
};

export default ${API};

export interface ${T}PageQuery extends PageQuery, UserByQueryParams {
  name?: string;
  status?: number;
}

export interface ${T}Table extends BaseType {
  name?: string;
${extraIfaces}  sort_order?: number;
  status?: number;
  description?: string;
}

export interface ${T}Form extends BaseFormType {
  name?: string;
${extraIfaces}  sort_order?: number;
  status?: number;
  description?: string;
}
`;
}

function tsType(field) {
  if (field.type === "int") return "number";
  return "string";
}
