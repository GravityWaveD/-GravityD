import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";

async function hydrateTicket(row: TicketTable): Promise<TicketTable> {
  if (!row.assigned_id) return row;
  const users = unwrap(
    await insforge.database.from("profiles").select("id,name").eq("id", row.assigned_id)
  ) as { id: string; name?: string }[];
  const user = users?.[0];
  return {
    ...row,
    assigned_by: user ? { id: user.id as unknown as number, name: user.name } : undefined,
  };
}

const TicketAPI = {
  async listTicket(query?: TicketPageQuery) {
    let builder = insforge.database.from("sys_ticket").select("*", { count: "exact" });
    if (query?.title) builder = builder.ilike("title", `%${query.title}%`);
    if (query?.ticket_type) builder = builder.eq("ticket_type", query.ticket_type);
    if (query?.assigned_id) builder = builder.eq("assigned_id", query.assigned_id);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    return serverPageOf<TicketTable>(builder, {
      pageNo: query?.page_no,
      pageSize: query?.page_size,
      sortField: "created_time",
      ascending: false,
      mapItems: (items) => Promise.all(items.map((row) => hydrateTicket(row))),
    });
  },

  async detailTicket(id: number) {
    const rows = unwrap(await insforge.database.from("sys_ticket").select("*").eq("id", id)) as TicketTable[];
    if (!rows?.[0]) throw new Error("工单不存在");
    return ok(await hydrateTicket(rows[0]));
  },

  async createTicket(body: TicketCreateForm) {
    unwrap(
      await insforge.database.from("sys_ticket").insert([
        {
          title: body.title,
          ticket_content: body.ticket_content,
          summary: body.summary,
          ticket_type: body.ticket_type || "suggestion",
          images: body.images,
          description: body.description,
          status: 0,
        },
      ])
    );
    return ok(null, "创建成功", true);
  },

  async updateTicket(id: number, body: TicketUpdateForm) {
    unwrap(
      await insforge.database
        .from("sys_ticket")
        .update({
          title: body.title,
          ticket_content: body.ticket_content,
          summary: body.summary,
          ticket_type: body.ticket_type,
          status: body.status,
          reply: body.reply,
          assigned_id: body.assigned_id ?? null,
          description: body.description,
        })
        .eq("id", id)
    );
    return ok(null, "更新成功", true);
  },

  async deleteTicket(body: number[]) {
    unwrap(await insforge.database.from("sys_ticket").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async exportTicket(_query?: TicketPageQuery) {
    throw new Error("未迁移导出");
  },

  async batchTicket(body: { ids: number[]; status: number }) {
    unwrap(await insforge.database.from("sys_ticket").update({ status: body.status }).in("id", body.ids));
    return ok(null, "更新成功", true);
  },
};

export async function getTicketComments(ticketId: number, params?: PageQuery) {
  const builder = insforge.database.from("sys_ticket_comment").select("*", { count: "exact" }).eq("ticket_id", ticketId);
  return serverPageOf<TicketCommentTable>(builder, {
    pageNo: params?.page_no,
    pageSize: params?.page_size,
    sortField: "created_time",
    ascending: true,
  });
}

export async function createTicketComment(ticketId: number, data: TicketCommentCreateForm) {
  const inserted = unwrap(
    await insforge.database
      .from("sys_ticket_comment")
      .insert([{ ticket_id: ticketId, content: data.content }])
      .select()
  ) as TicketCommentTable[];
  return ok(inserted?.[0] || null, "评论成功", true);
}

export default TicketAPI;

export interface TicketPageQuery extends PageQuery, UserByQueryParams {
  title?: string;
  ticket_type?: string;
  assigned_id?: string | number;
  status?: number;
}

export interface TicketTable extends BaseType {
  title: string;
  ticket_content?: string;
  summary?: string;
  ticket_type: string;
  images?: string;
  reply?: string;
  assigned_id?: string | number;
  assigned_by?: CommonType;
  status?: number;
  description?: string;
}

export interface TicketCreateForm {
  title: string;
  ticket_content?: string;
  summary?: string;
  ticket_type: string;
  images?: string;
  description?: string;
}

export interface TicketUpdateForm {
  title?: string;
  ticket_content?: string;
  summary?: string;
  ticket_type?: string;
  status?: number;
  reply?: string;
  assigned_id?: string | number;
  description?: string;
}

export interface TicketForm extends BaseFormType {
  title: string;
  ticket_content?: string;
  summary?: string;
  ticket_type: string;
  images?: string;
  reply?: string;
  assigned_id?: string | number;
  status?: number;
  description?: string;
}

export interface TicketCommentTable extends BaseType {
  ticket_id: number;
  content: string;
  created_by_name?: string;
}

export interface TicketCommentPageQuery extends PageQuery {
  ticket_id: number;
}

export interface TicketCommentCreateForm {
  content: string;
}
