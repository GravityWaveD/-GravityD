import { baas } from "@/utils/baas";
import { buildTree, ok, unwrap } from "@/utils/baas/api-helper";

const DeptAPI = {
  async listDept(query?: DeptPageQuery) {
    let builder = baas.database.from("sys_dept").select("*");
    if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query?.status !== undefined && query.status !== null) builder = builder.eq("status", query.status);
    const rows = ((unwrap(await builder) as DeptTable[]) || []).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return ok(buildTree(rows));
  },

  async detailDept(id: number) {
    const rows = unwrap(await baas.database.from("sys_dept").select("*").eq("id", id)) as DeptTable[];
    if (!rows?.[0]) throw new Error("部门不存在");
    return ok(rows[0]);
  },

  async createDept(body: DeptForm) {
    unwrap(
      await baas.database.from("sys_dept").insert([
        {
          name: body.name,
          code: body.code,
          parent_id: body.parent_id ?? null,
          order: body.order ?? 999,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateDept(id: number, body: DeptForm) {
    unwrap(
      await baas.database
        .from("sys_dept")
        .update({
          name: body.name,
          code: body.code,
          parent_id: body.parent_id ?? null,
          order: body.order,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteDept(body: number[]) {
    unwrap(await baas.database.from("sys_dept").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchDept(body: BatchType) {
    unwrap(await baas.database.from("sys_dept").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },
};

export default DeptAPI;

export interface DeptPageQuery extends UserByQueryParams {
  name?: string;
  status?: number;
}

export interface DeptTable extends BaseType {
  name?: string;
  order?: number;
  code: string;
  parent_id?: number;
  parent_name?: string;
  children?: DeptTable[];
  status?: number;
  description?: string;
}

export interface DeptForm extends BaseFormType {
  name?: string;
  code: string;
  parent_id?: number;
  order?: number;
  status?: number;
  description?: string;
}
