import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";

const NoticeAPI = {
  async listNotice(query: NoticePageQuery) {
    let builder = insforge.database.from("sys_notice").select("*", { count: "exact" });
    if (query.notice_title) builder = builder.ilike("notice_title", `%${query.notice_title}%`);
    if (query.notice_type) builder = builder.eq("notice_type", query.notice_type);
    if (query.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    return serverPageOf<NoticeTable>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "id",
      ascending: false,
    });
  },

  async listNoticeAvailable() {
    const rows =
      (unwrap(await insforge.database.from("sys_notice").select("*").eq("status", 1)) as NoticeTable[]) || [];
    return ok(rows);
  },

  async detailNotice(id: number) {
    const rows = unwrap(await insforge.database.from("sys_notice").select("*").eq("id", id)) as NoticeTable[];
    if (!rows?.[0]) throw new Error("公告不存在");
    return ok(rows[0]);
  },

  async createNotice(body: NoticeForm) {
    unwrap(
      await insforge.database.from("sys_notice").insert([
        {
          notice_title: body.notice_title,
          notice_type: body.notice_type || "1",
          notice_content: body.notice_content,
          status: body.status ?? 0,
          description: body.description,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateNotice(id: number, body: NoticeForm) {
    unwrap(
      await insforge.database
        .from("sys_notice")
        .update({
          notice_title: body.notice_title,
          notice_type: body.notice_type,
          notice_content: body.notice_content,
          status: body.status,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteNotice(body: number[]) {
    unwrap(await insforge.database.from("sys_notice").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async batchNotice(body: BatchType) {
    unwrap(await insforge.database.from("sys_notice").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },
};

export default NoticeAPI;

export interface NoticePageQuery extends PageQuery, UserByQueryParams {
  notice_title?: string;
  notice_type?: string;
  status?: number;
}

export interface NoticeTable extends BaseType {
  notice_title?: string;
  notice_type?: string;
  notice_content?: string;
  status?: number;
  description?: string;
}

export interface NoticeForm extends BaseFormType {
  notice_title?: string;
  notice_type?: string;
  notice_content?: string;
  status?: number;
  description?: string;
}
