import { baas } from "@/utils/baas";
import { buildTree, ok, unwrap } from "@/utils/baas/api-helper";

function sortMenus(rows: MenuTable[]) {
  return [...rows].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

const MenuAPI = {
  async listMenu(query?: MenuPageQuery) {
    let builder = baas.database.from("sys_menu").select("*");
    if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query?.status !== undefined && query.status !== null) builder = builder.eq("status", query.status);
    if (query?.type !== undefined && query.type !== null) builder = builder.eq("type", query.type);
    if (query?.permission) builder = builder.ilike("permission", `%${query.permission}%`);
    const rows = sortMenus((unwrap(await builder) as MenuTable[]) || []);
    return ok(buildTree(rows));
  },

  async detailMenu(id: number) {
    const rows = unwrap(await baas.database.from("sys_menu").select("*").eq("id", id)) as MenuTable[];
    if (!rows?.[0]) throw new Error("菜单不存在");
    return ok(rows[0]);
  },

  async createMenu(body: MenuForm) {
    unwrap(await baas.database.from("sys_menu").insert([sanitizeMenu(body)]));
    return ok(null, "创建成功", true);
  },

  async updateMenu(id: number, body: MenuForm) {
    unwrap(await baas.database.from("sys_menu").update(sanitizeMenu(body)).eq("id", id));
    return ok(null, "更新成功", true);
  },

  async deleteMenu(body: number[]) {
    unwrap(await baas.database.from("sys_menu").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchMenu(body: BatchType) {
    unwrap(await baas.database.from("sys_menu").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },
};

function sanitizeMenu(body: MenuForm) {
  return {
    name: body.name,
    type: body.type,
    icon: body.icon,
    order: body.order,
    permission: body.permission,
    route_name: body.route_name,
    route_path: body.route_path,
    component_path: body.component_path,
    redirect: body.redirect,
    parent_id: body.parent_id ?? null,
    keep_alive: body.keep_alive,
    hidden: body.hidden,
    always_show: body.always_show,
    title: body.title,
    params: body.params ?? null,
    affix: body.affix,
    link: body.link,
    is_iframe: body.is_iframe,
    is_hide_tab: body.is_hide_tab,
    active_path: body.active_path,
    show_badge: body.show_badge,
    show_text_badge: body.show_text_badge,
    scope: body.scope || "web",
    status: body.status ?? 0,
    description: body.description,
  };
}

export default MenuAPI;

export interface MenuPageQuery extends BaseQueryParams {
  name?: string;
  status?: number;
  type?: number;
  permission?: string;
  route_path?: string;
  component_path?: string;
  description?: string;
  scope?: "web" | "app";
}

export interface MenuTable extends BaseType {
  name?: string;
  type?: number;
  icon?: string;
  order?: number;
  permission?: string;
  route_name?: string;
  route_path?: string;
  component_path?: string;
  redirect?: string;
  parent_id?: number;
  parent_name?: string;
  keep_alive?: boolean;
  hidden?: boolean;
  always_show?: boolean;
  title?: string;
  params?: { key: string; value: string }[];
  affix?: boolean;
  children?: MenuTable[];
  link?: string;
  is_iframe?: boolean;
  is_hide_tab?: boolean;
  active_path?: string;
  show_badge?: boolean;
  show_text_badge?: string;
  scope?: "web" | "app";
  status?: number;
  description?: string;
}

export interface MenuForm extends BaseFormType {
  name?: string;
  type?: number;
  icon?: string;
  order?: number;
  permission?: string;
  route_name?: string;
  route_path?: string;
  component_path?: string;
  redirect?: string;
  parent_id?: number;
  keep_alive?: boolean;
  hidden?: boolean;
  always_show?: boolean;
  title?: string;
  params?: KeyValue[];
  affix?: boolean;
  link?: string;
  is_iframe?: boolean;
  is_hide_tab?: boolean;
  active_path?: string;
  show_badge?: boolean;
  show_text_badge?: string;
  scope?: "web" | "app";
  status?: number;
  description?: string;
}

export interface KeyValue {
  key: string;
  value: string;
}
