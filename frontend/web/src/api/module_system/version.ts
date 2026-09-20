import { baas } from "@/utils/baas";
import { ok, serverPageOf, unwrap } from "@/utils/baas/api-helper";

const VersionAPI = {
  async getVersionList(query: VersionPageQuery) {
    let builder = baas.database.from("sys_version").select("*", { count: "exact" });
    if (query.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    return serverPageOf<VersionTable>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "sort",
      ascending: true,
    });
  },

  async getPublishedVersions() {
    const rows =
      (unwrap(await baas.database.from("sys_version").select("*").eq("status", 1)) as VersionTable[]) || [];
    return ok(rows.sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0)));
  },

  async getVersionDetail(id: number) {
    const rows = unwrap(await baas.database.from("sys_version").select("*").eq("id", id)) as VersionTable[];
    if (!rows?.[0]) throw new Error("版本不存在");
    return ok(rows[0]);
  },

  async createVersion(body: VersionForm) {
    unwrap(
      await baas.database.from("sys_version").insert([
        {
          version: body.version,
          title: body.title,
          date: body.date,
          content: body.content,
          sort: body.sort ?? 0,
          status: body.status ?? 0,
          description: body.description,
          require_re_login: !!body.require_re_login,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateVersion(id: number, body: VersionForm) {
    unwrap(
      await baas.database
        .from("sys_version")
        .update({
          version: body.version,
          title: body.title,
          date: body.date,
          content: body.content,
          sort: body.sort,
          status: body.status,
          description: body.description,
          require_re_login: body.require_re_login,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteVersion(body: number[]) {
    unwrap(await baas.database.from("sys_version").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async setVersionStatus(id: number, body: { status: number }) {
    const rows = unwrap(
      await baas.database.from("sys_version").update({ status: body.status }).eq("id", id)
    ) as VersionTable[];
    return ok(rows?.[0] || null, "更新成功", true);
  },
};

export default VersionAPI;

export interface VersionPageQuery extends PageQuery {
  status?: number;
}

export interface VersionTable extends BaseType {
  version?: string;
  title?: string;
  date?: string;
  content?: string;
  description?: string;
  sort?: number;
  status?: number;
  require_re_login?: boolean;
}

export interface VersionForm extends BaseFormType {
  version?: string;
  title?: string;
  date?: string;
  content?: string;
  description?: string;
  sort?: number;
  status?: number;
  require_re_login?: boolean;
}
