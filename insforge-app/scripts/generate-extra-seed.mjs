import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const extraSystem = new Set(["岗位管理", "日志管理", "公告管理", "工单管理", "版本管理"]);
const startId = 50;

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
const monitor = allMenus.find((m) => m.route_path === "/monitor");
const extraChildren = (system.children || []).filter((c) => extraSystem.has(c.name));
const monitorSlim = {
  ...monitor,
  children: (monitor.children || []).filter((c) => c.name === "在线用户"),
};

const systemRows = flattenMenus(extraChildren, "系统管理");
const monitorRows = flattenMenus([monitorSlim]);
const rows = [...systemRows, ...monitorRows];
rows.forEach((row, i) => {
  row._id = startId + i;
});

function parentIdOf(row) {
  if (row.parentKey === "系统管理") return 1;
  const parent = rows.find((r) => r.key === row.parentKey);
  return parent ? parent._id : null;
}

const versions = JSON.parse(readFileSync(resolve(root, "backend/sql/sys_version.json"), "utf8"));

const lines = [];
lines.push("-- Incremental menus + leftover system seeds (do not truncate)");
lines.push("DELETE FROM public.sys_role_menus WHERE menu_id >= 50 AND menu_id < 90;");
lines.push("DELETE FROM public.sys_menu WHERE id >= 50 AND id < 90;");
lines.push("");
lines.push(
  "INSERT INTO public.sys_menu (id, name, type, icon, \"order\", permission, route_name, route_path, component_path, redirect, parent_id, keep_alive, hidden, always_show, title, params, affix, link, is_iframe, is_hide_tab, active_path, show_badge, show_text_badge, scope, status, description) VALUES"
);
const values = rows.map((row) => {
  const parentId = parentIdOf(row);
  return `  (${row._id}, ${sqlStr(row.name)}, ${sqlStr(row.type ?? 2)}, ${sqlStr(row.icon)}, ${sqlStr(row.order ?? 999)}, ${sqlStr(row.permission)}, ${sqlStr(row.route_name)}, ${sqlStr(row.route_path)}, ${sqlStr(row.component_path)}, ${sqlStr(row.redirect)}, ${parentId ?? "NULL"}, ${sqlStr(row.keep_alive ?? true)}, ${sqlStr(row.hidden ?? false)}, ${sqlStr(row.always_show ?? false)}, ${sqlStr(row.title || row.name)}, ${sqlStr(row.params)}, ${sqlStr(row.affix ?? false)}, ${sqlStr(row.link)}, ${sqlStr(row.is_iframe ?? false)}, ${sqlStr(row.is_hide_tab ?? false)}, ${sqlStr(row.active_path)}, ${sqlStr(row.show_badge ?? false)}, ${sqlStr(row.show_text_badge)}, ${sqlStr(row.scope || "web")}, ${sqlStr(row.status ?? 0)}, ${sqlStr(row.description)})`;
});
lines.push(`${values.join(",\n")};`);
lines.push(`SELECT setval(pg_get_serial_sequence('public.sys_menu', 'id'), (SELECT MAX(id) FROM public.sys_menu));`);
lines.push("");
lines.push("INSERT INTO public.sys_role_menus (role_id, menu_id)");
lines.push("SELECT r.id, m.id FROM public.sys_role r CROSS JOIN public.sys_menu m");
lines.push("WHERE r.code = 'SUPER_ADMIN' AND m.id >= 50");
lines.push("ON CONFLICT DO NOTHING;");
lines.push("");
lines.push("INSERT INTO public.sys_position (name, code, \"order\", status, description)");
lines.push("VALUES ('默认岗位', 'DEFAULT', 1, 0, '系统默认岗位')");
lines.push("ON CONFLICT (code) DO NOTHING;");
lines.push("");
lines.push("INSERT INTO public.sys_notice (notice_title, notice_type, notice_content, status, description)");
lines.push("SELECT '欢迎使用 InsForge 后台', '1', '系统管理已切换到自托管 InsForge。岗位、通知、日志、工单、版本与在线用户已接入。', 1, '种子公告'");
lines.push("WHERE NOT EXISTS (SELECT 1 FROM public.sys_notice);");
lines.push("");
lines.push("INSERT INTO public.sys_version (version, title, date, content, sort, status, description, require_re_login)");
lines.push(
  versions
    .map(
      (v) =>
        `SELECT ${sqlStr(v.version)}, ${sqlStr(v.title)}, ${sqlStr(v.date)}, ${sqlStr(v.content)}, ${sqlStr(v.sort ?? 0)}, ${sqlStr(v.status ?? 1)}, ${sqlStr(v.description)}, ${sqlStr(!!v.require_re_login)} WHERE NOT EXISTS (SELECT 1 FROM public.sys_version WHERE version = ${sqlStr(v.version)})`
    )
    .join("\nUNION ALL\n") + ";"
);
lines.push("");
lines.push("NOTIFY pgrst, 'reload schema';");

writeFileSync(resolve(root, "insforge-app/migrations/004_seed_extra.sql"), `${lines.join("\n")}\n`);
console.log(`wrote 004_seed_extra.sql extraMenus=${rows.length} versions=${versions.length}`);
