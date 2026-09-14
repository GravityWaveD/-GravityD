import { insforge } from "@/utils/insforge";
import { ok, pageOf, rangeOf, unwrap } from "@/utils/insforge-api";

const RoleAPI = {
  async listRole(query?: TablePageQuery) {
    const { pageNo, pageSize } = rangeOf(query?.page_no, query?.page_size);
    let builder = insforge.database.from("sys_role").select("*");
    if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query?.code) builder = builder.ilike("code", `%${query.code}%`);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    const rows = ((unwrap(await builder) as RoleTable[]) || []).slice();
    const items = rows.slice((pageNo - 1) * pageSize, pageNo * pageSize);
    return ok(pageOf(items, rows.length, pageNo, pageSize));
  },

  async detailRole(id: number) {
    const rows = unwrap(await insforge.database.from("sys_role").select("*").eq("id", id)) as RoleTable[];
    if (!rows?.[0]) throw new Error("角色不存在");
    const links = unwrap(
      await insforge.database.from("sys_role_menus").select("menu_id").eq("role_id", id)
    ) as { menu_id: number }[];
    const menuIds = links.map((item) => item.menu_id);
    const menus = menuIds.length
      ? ((unwrap(await insforge.database.from("sys_menu").select("*").in("id", menuIds)) as permissionMenuType[]) || [])
      : [];
    return ok({ ...rows[0], menus });
  },

  async createRole(body: RoleForm) {
    unwrap(
      await insforge.database
        .from("sys_role")
        .insert([
          {
            name: body.name,
            code: body.code,
            order: body.order ?? 999,
            data_scope: body.data_scope ?? 1,
            status: body.status ?? 0,
            description: body.description,
          },
        ])
        .select()
    );
    return ok(null, "创建成功", true);
  },

  async updateRole(id: number, body: RoleForm) {
    unwrap(
      await insforge.database
        .from("sys_role")
        .update({
          name: body.name,
          code: body.code,
          order: body.order,
          data_scope: body.data_scope,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteRole(body: number[]) {
    unwrap(await insforge.database.from("sys_role").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchRole(body: BatchType) {
    unwrap(await insforge.database.from("sys_role").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async setPermission(body: permissionDataType) {
    for (const roleId of body.role_ids) {
      await insforge.database.from("sys_role_menus").delete().eq("role_id", roleId);
      if (body.menu_ids?.length) {
        unwrap(
          await insforge.database
            .from("sys_role_menus")
            .insert(body.menu_ids.map((menuId) => ({ role_id: roleId, menu_id: menuId })))
        );
      }
      if (body.data_scope !== undefined) {
        await insforge.database.from("sys_role").update({ data_scope: body.data_scope }).eq("id", roleId);
      }
    }
    return ok(null, "权限已更新", true);
  },

  async exportRole(_query: TablePageQuery) {
    throw new Error("第一期未迁移导出");
  },

  async getRoleOptions() {
    const rows = (unwrap(await insforge.database.from("sys_role").select("id,name,code,status")) as RoleTable[]) || [];
    return ok(rows.map((row) => ({ value: row.id!, label: row.name })));
  },
};

export default RoleAPI;

export interface TablePageQuery extends PageQuery, UserByQueryParams {
  name?: string;
  code?: string;
  status?: number;
}

export interface RoleTable extends BaseType {
  name: string;
  order?: number;
  code: string;
  data_scope?: number;
  menus?: permissionMenuType[];
  depts?: permissionDeptType[];
  status?: number;
  description?: string;
}

export interface RoleForm extends BaseFormType {
  name?: string;
  order?: number;
  code: string;
  data_scope?: number;
  status?: number;
  description?: string;
}

export interface permissionDataType {
  data_scope: number;
  role_ids: RoleTable["id"][];
  menu_ids: permissionMenuType["id"][];
  dept_ids: permissionDeptType["id"][];
}

export interface permissionDeptType {
  id: number;
  name: string;
  parent_id: number;
  children: permissionDeptType[];
}

export interface permissionMenuType {
  id: number;
  name: string;
  type: number;
  permission: string;
  parent_id?: number;
  status: number;
  description?: string;
  children?: permissionMenuType[];
}
