import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";

const PositionAPI = {
  async listPosition(query?: PositionPageQuery) {
    let builder = insforge.database.from("sys_position").select("*", { count: "exact" });
    if (query?.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    return serverPageOf<PositionTable>(builder, {
      pageNo: query?.page_no,
      pageSize: query?.page_size,
      sortField: "order",
      ascending: true,
    });
  },

  async detailPosition(id: number) {
    const rows = unwrap(await insforge.database.from("sys_position").select("*").eq("id", id)) as PositionTable[];
    if (!rows?.[0]) throw new Error("岗位不存在");
    return ok(rows[0]);
  },

  async createPosition(body: PositionForm) {
    unwrap(
      await insforge.database.from("sys_position").insert([
        {
          name: body.name,
          code: body.code,
          order: body.order ?? 1,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updatePosition(id: number, body: PositionForm) {
    unwrap(
      await insforge.database
        .from("sys_position")
        .update({
          name: body.name,
          code: body.code,
          order: body.order,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deletePosition(body: number[]) {
    unwrap(await insforge.database.from("sys_position").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchPosition(body: BatchType) {
    unwrap(await insforge.database.from("sys_position").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async exportPosition(_query: PositionPageQuery) {
    throw new Error("未迁移导出");
  },

  async getPositionOptions() {
    const rows =
      (unwrap(await insforge.database.from("sys_position").select("id,name,code,status").eq("status", 0)) as PositionTable[]) ||
      [];
    return ok(rows.map((row) => ({ value: row.id!, label: row.name || row.code || String(row.id) })));
  },
};

export default PositionAPI;

export interface PositionPageQuery extends PageQuery, UserByQueryParams {
  name?: string;
  status?: number;
}

export interface PositionTable extends BaseType {
  name?: string;
  code?: string;
  order?: number;
  status?: number;
  description?: string;
}

export interface PositionForm extends BaseFormType {
  name?: string;
  code?: string;
  order?: number;
  status?: number;
  description?: string;
}
