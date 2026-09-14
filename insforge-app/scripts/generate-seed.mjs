import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const allowMenus = new Set(["菜单管理", "字典管理", "参数管理", "部门管理", "角色管理", "用户管理"]);

function sqlStr(v) {
  if (v === null || v === undefined) return "NULL";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
}

function flattenMenus(nodes, parentKey = null, acc = []) {
  for (const node of nodes) {
    const key = `${parentKey || "root"}/${node.name}`;
    acc.push({ ...node, parentKey, key });
    if (node.children?.length) flattenMenus(node.children, key, acc);
  }
  return acc;
}

const allMenus = JSON.parse(readFileSync(resolve(root, "backend/sql/sys_menu.json"), "utf8"));
const system = allMenus.find((m) => m.route_path === "/system");
const filtered = {
  ...system,
  children: (system.children || []).filter((c) => allowMenus.has(c.name)),
};
const rows = flattenMenus([filtered]);

const params = JSON.parse(readFileSync(resolve(root, "backend/sql/sys_param.json"), "utf8"));
const dictTypes = JSON.parse(readFileSync(resolve(root, "backend/sql/sys_dict_type.json"), "utf8"));
const dictData = JSON.parse(readFileSync(resolve(root, "backend/sql/sys_dict_data.json"), "utf8"));

const lines = [];
lines.push("-- Generated phase-1 seed (dept / role / menu / dict / param)");
lines.push("TRUNCATE public.sys_role_menus, public.sys_user_roles, public.sys_dict_data, public.sys_dict_type, public.sys_param, public.sys_menu, public.sys_role, public.sys_dept RESTART IDENTITY CASCADE;");
lines.push("");
lines.push("INSERT INTO public.sys_dept (name, code, parent_id, \"order\", status, description)");
lines.push("VALUES ('系统部门', 'DEFAULT', NULL, 1, 0, '系统默认部门');");
lines.push("");
lines.push("INSERT INTO public.sys_role (name, code, \"order\", data_scope, status, description) VALUES");
lines.push("  ('超级管理员', 'SUPER_ADMIN', 1, 3, 0, '拥有系统最高权限'),");
lines.push("  ('管理员', 'ADMIN', 2, 3, 0, '管理系统内所有资源'),");
lines.push("  ('普通用户', 'USER', 3, 1, 0, '仅能查看和操作自己的数据');");
lines.push("");
lines.push("INSERT INTO public.sys_menu (id, name, type, icon, \"order\", permission, route_name, route_path, component_path, redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link, is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description) VALUES");

const values = rows.map((row, i) => {
  const id = i + 1;
  row._id = id;
  const parent = rows.find((r) => r.key === row.parentKey);
  const parentId = parent ? parent._id : null;
  return `  (${id}, ${sqlStr(row.name)}, ${sqlStr(row.type ?? 2)}, ${sqlStr(row.icon)}, ${sqlStr(row.order ?? 999)}, ${sqlStr(row.permission)}, ${sqlStr(row.route_name)}, ${sqlStr(row.route_path)}, ${sqlStr(row.component_path)}, ${sqlStr(row.redirect)}, ${parentId ?? "NULL"}, ${sqlStr(row.keep_alive ?? true)}, ${sqlStr(row.hidden ?? false)}, ${sqlStr(row.always_show ?? false)}, ${sqlStr(row.title || row.name)}, ${sqlStr(row.params)}, ${sqlStr(row.affix ?? false)}, ${sqlStr(row.link)}, ${sqlStr(row.is_iframe ?? false)}, ${sqlStr(row.is_hide_tab ?? false)}, ${sqlStr(row.active_path)}, ${sqlStr(row.show_badge ?? false)}, ${sqlStr(row.show_text_badge)}, ${sqlStr(row.scope || "web")}, ${sqlStr(row.status ?? 0)}, ${sqlStr(row.description)})`;
});
lines.push(`${values.join(",\n")};`);
lines.push(`SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), ${rows.length});`);
lines.push("");
lines.push("INSERT INTO public.sys_role_menus (role_id, menu_id)");
lines.push("SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m WHERE r.code = 'SUPER_ADMIN';");
lines.push("");

lines.push("INSERT INTO public.sys_dict_type (dict_name, dict_type, status, description) VALUES");
lines.push(
  dictTypes
    .map((d) => `  (${sqlStr(d.dict_name)}, ${sqlStr(d.dict_type)}, ${sqlStr(d.status ?? 0)}, ${sqlStr(d.description)})`)
    .join(",\n") + ";"
);
lines.push("");
lines.push("INSERT INTO public.sys_dict_data (dict_sort, dict_label, dict_value, dict_type_id, dict_type, css_class, list_class, is_default, status, description)");
lines.push("SELECT d.dict_sort, d.dict_label, d.dict_value, t.id, d.dict_type, d.css_class, d.list_class, d.is_default, d.status, d.description");
lines.push("FROM (VALUES");
lines.push(
  dictData
    .map(
      (d) =>
        `  (${sqlStr(d.dict_sort)}, ${sqlStr(d.dict_label)}, ${sqlStr(d.dict_value)}, ${sqlStr(d.dict_type)}, ${sqlStr(d.css_class)}, ${sqlStr(d.list_class)}, ${sqlStr(!!d.is_default)}, ${sqlStr(d.status ?? 0)}, ${sqlStr(d.description)})`
    )
    .join(",\n")
);
lines.push(") AS d(dict_sort, dict_label, dict_value, dict_type, css_class, list_class, is_default, status, description)");
lines.push("JOIN public.sys_dict_type t ON t.dict_type = d.dict_type;");
lines.push("");
lines.push("INSERT INTO public.sys_param (config_name, config_key, config_value, config_type, status, description) VALUES");
lines.push(
  params
    .map(
      (p) =>
        `  (${sqlStr(p.config_name)}, ${sqlStr(p.config_key)}, ${sqlStr(p.config_value)}, ${sqlStr(!!p.config_type)}, ${sqlStr(p.status ?? 0)}, ${sqlStr(p.description)})`
    )
    .join(",\n") + ";"
);
lines.push("");
lines.push("NOTIFY pgrst, 'reload schema';");

writeFileSync(resolve(root, "insforge-app/migrations/002_seed_system.sql"), `${lines.join("\n")}\n`);
console.log(`wrote 002_seed_system.sql menus=${rows.length}`);
