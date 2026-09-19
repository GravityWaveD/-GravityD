import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";

const DictAPI = {
  async listDictType(query: DictPageQuery) {
    let builder = insforge.database.from("sys_dict_type").select("*", { count: "exact" });
    if (query.dict_name) builder = builder.ilike("dict_name", `%${query.dict_name}%`);
    if (query.dict_type) builder = builder.ilike("dict_type", `%${query.dict_type}%`);
    if (query.status !== undefined && query.status !== null) builder = builder.eq("status", query.status);
    return serverPageOf<DictTable>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "id",
      ascending: true,
    });
  },

  async optionDictType() {
    const rows = (unwrap(await insforge.database.from("sys_dict_type").select("*")) as DictTable[]) || [];
    return ok(rows);
  },

  async detailDictType(id: number) {
    const rows = unwrap(await insforge.database.from("sys_dict_type").select("*").eq("id", id)) as DictTable[];
    if (!rows?.[0]) throw new Error("字典类型不存在");
    return ok(rows[0]);
  },

  async createDictType(body: DictForm) {
    unwrap(
      await insforge.database.from("sys_dict_type").insert([
        {
          dict_name: body.dict_name,
          dict_type: body.dict_type,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateDictType(id: number, body: DictForm) {
    unwrap(
      await insforge.database
        .from("sys_dict_type")
        .update({
          dict_name: body.dict_name,
          dict_type: body.dict_type,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteDictType(body: number[]) {
    unwrap(await insforge.database.from("sys_dict_type").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchDictType(body: BatchType) {
    unwrap(await insforge.database.from("sys_dict_type").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async exportDictType(_body: DictPageQuery) {
    throw new Error("第一期未迁移导出");
  },

  async listDictData(query: DictDataPageQuery) {
    let builder = insforge.database.from("sys_dict_data").select("*", { count: "exact" });
    if (query.dict_label) builder = builder.ilike("dict_label", `%${query.dict_label}%`);
    if (query.dict_type) builder = builder.eq("dict_type", query.dict_type);
    if (query.dict_type_id) builder = builder.eq("dict_type_id", query.dict_type_id);
    if (query.status !== undefined && query.status !== null) builder = builder.eq("status", query.status);
    return serverPageOf<DictDataTable>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "dict_sort",
      ascending: true,
    });
  },

  async detailDictData(id: number) {
    const rows = unwrap(await insforge.database.from("sys_dict_data").select("*").eq("id", id)) as DictDataTable[];
    if (!rows?.[0]) throw new Error("字典数据不存在");
    return ok(rows[0]);
  },

  async createDictData(body: DictDataForm) {
    unwrap(
      await insforge.database.from("sys_dict_data").insert([
        {
          dict_sort: body.dict_sort ?? 0,
          dict_label: body.dict_label,
          dict_value: body.dict_value,
          dict_type_id: body.dict_type_id,
          dict_type: body.dict_type,
          css_class: body.css_class,
          list_class: body.list_class,
          is_default: !!body.is_default,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateDictData(id: number, body: DictDataForm) {
    unwrap(
      await insforge.database
        .from("sys_dict_data")
        .update({
          dict_sort: body.dict_sort,
          dict_label: body.dict_label,
          dict_value: body.dict_value,
          dict_type_id: body.dict_type_id,
          dict_type: body.dict_type,
          css_class: body.css_class,
          list_class: body.list_class,
          is_default: body.is_default,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteDictData(body: number[]) {
    unwrap(await insforge.database.from("sys_dict_data").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchDictData(body: BatchType) {
    unwrap(await insforge.database.from("sys_dict_data").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },

  async exportDictData(_query: DictDataPageQuery) {
    throw new Error("第一期未迁移导出");
  },

  async getInitDict(dict_type: string) {
    const rows =
      (unwrap(
        await insforge.database.from("sys_dict_data").select("*").eq("dict_type", dict_type).eq("status", 0)
      ) as DictDataTable[]) || [];
    return ok(rows.sort((a, b) => (a.dict_sort ?? 0) - (b.dict_sort ?? 0)));
  },
};

export default DictAPI;

export interface DictPageQuery extends PageQuery {
  dict_name?: string;
  dict_type?: string;
  status?: number;
}

export interface DictDataPageQuery extends PageQuery {
  dict_label?: string;
  dict_type?: string;
  dict_type_id?: number;
  status?: number;
}

export interface DictTable extends BaseType {
  dict_name?: string;
  dict_type?: string;
  status?: number;
  description?: string;
}

export interface DictForm extends BaseFormType {
  dict_name?: string;
  dict_type?: string;
  status?: number;
  description?: string;
}

export interface DictDataTable extends BaseType {
  dict_sort?: number;
  dict_label?: string;
  dict_value?: string;
  dict_type_id?: number;
  dict_type?: string;
  css_class?: string;
  list_class?: string;
  is_default?: boolean;
  status?: number;
  description?: string;
}

export interface DictDataForm extends BaseFormType {
  dict_sort?: number;
  dict_label?: string;
  dict_value?: string;
  dict_type_id?: number;
  dict_type?: string;
  css_class?: string;
  list_class?: string;
  is_default?: boolean;
  status?: number;
  description?: string;
}
