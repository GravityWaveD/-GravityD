import { baas } from "@/utils/baas";
import { ok, serverPageOf, unwrap } from "@/utils/baas/api-helper";
import { runGravitydAgent } from "@/utils/gravityd-agents";
import { Auth } from "@/utils/auth";
import type { UserInfo } from "@/api/module_system/user";

export type { UserInfo };

function jwtSub(): string | null {
  try {
    const token = Auth.getAccessToken();
    if (!token) return null;
    const parts = token.split(".");
    if (parts.length < 2 || !parts[1]) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

type SessionRow = {
  id: number;
  user_id?: string;
  title?: string | null;
  created_time?: string | null;
  updated_time?: string | null;
};

type MessageRow = {
  id: number;
  session_id: number;
  role: string;
  content: string;
  agent_name?: string | null;
  created_time?: string | null;
};

function toSession(row: SessionRow, messages: ChatSessionMessage[] = [], messageCount = 0): ChatSession {
  return {
    session_id: String(row.id),
    agent_id: null,
    team_id: null,
    team_name: null,
    workflow_id: null,
    user_id: row.user_id || null,
    session_data: null,
    agent_data: null,
    team_data: null,
    workflow_data: null,
    metadata: null,
    runs: messages.length ? [{ messages }] : [],
    summary: null,
    created_at: row.created_time ? Date.parse(row.created_time) : null,
    updated_at: row.updated_time ? Date.parse(row.updated_time) : null,
    id: String(row.id),
    title: row.title || null,
    created_time: row.created_time || null,
    updated_time: row.updated_time || null,
    message_count: messageCount,
    messages,
  };
}

export const AiChatAPI = {
  async getSessionList(query: ChatSessionListQuery) {
    const userId = jwtSub();
    let builder = baas.database.from("agent_session").select("*", { count: "exact" });
    if (userId) builder = builder.eq("user_id", userId);
    if (query.title) builder = builder.ilike("title", `%${query.title}%`);
    return serverPageOf<SessionRow>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "updated_time",
      ascending: false,
      mapItems: (items) => (items as SessionRow[]).map((row) => toSession(row)) as any,
    }) as unknown as Promise<{ data: ApiResponse<PageResult<ChatSession>> }>;
  },

  async createSession(body: { title: string }) {
    const userId = jwtSub();
    if (!userId) throw new Error("未登录");
    const rows = unwrap(
      await baas.database
        .from("agent_session")
        .insert([{ user_id: userId, title: body.title }])
    ) as SessionRow[];
    if (!rows?.[0]) throw new Error("创建会话失败");
    return ok(toSession(rows[0]));
  },

  async updateSession(id: string, body: { title: string }) {
    unwrap(await baas.database.from("agent_session").update({ title: body.title }).eq("id", Number(id)));
    return ok(null, "更新成功");
  },

  async deleteSession(body: string[]) {
    unwrap(await baas.database.from("agent_session").delete().in("id", body.map((id) => Number(id))));
    return ok(null, "删除成功");
  },

  async chat(body: { session_id?: string | null; message: string; stream?: boolean }) {
    const userId = jwtSub();
    if (!userId) throw new Error("未登录");
    let sessionId = body.session_id ? Number(body.session_id) : 0;

    if (!sessionId) {
      const rows = unwrap(
        await baas.database
          .from("agent_session")
          .insert([{ user_id: userId, title: body.message.slice(0, 20) || "新会话" }])
      ) as SessionRow[];
      if (rows?.[0]?.id) {
        sessionId = Number(rows[0].id);
      }
    }

    const userMessageRows = unwrap(
      await baas.database
        .from("agent_message")
        .insert([{ session_id: sessionId, role: "user", content: body.message }])
    ) as MessageRow[];
    const userMessage = userMessageRows?.[0];

    const reply = await runGravitydAgent(body.message);

    await baas.database.from("agent_message").insert([
      {
        session_id: sessionId,
        role: "assistant",
        content: reply.response,
        agent_name: reply.agent,
      },
    ]);
    await baas.database.from("agent_session").update({ updated_time: new Date().toISOString() }).eq("id", sessionId);

    return ok({
      session_id: String(sessionId),
      response: reply.response,
      agent_name: reply.agent,
      created_time: userMessage?.created_time || new Date().toISOString(),
    });
  },

  async getSessionDetail(sessionId: string) {
    const sessionRows = unwrap(
      await baas.database.from("agent_session").select("*").eq("id", Number(sessionId))
    ) as SessionRow[];
    const messageRows = (unwrap(
      await baas.database.from("agent_message").select("*").eq("session_id", Number(sessionId))
    ) as MessageRow[]) || [];
    messageRows.sort((a, b) => ((a.id ?? 0) - (b.id ?? 0)));

    const messages: ChatSessionMessage[] = messageRows.map((msg) => ({
      id: String(msg.id),
      role: msg.role as "user" | "assistant" | "system",
      content: msg.content,
      created_time: msg.created_time || undefined,
      agent_name: msg.agent_name || undefined,
    }));

    const session = sessionRows[0] ? toSession(sessionRows[0], messages, messages.length) : null;
    return ok(session);
  },

  async getAgents() {
    return ok([
      { id: "router", name: "路由 Agent", description: "意图分类与分发" },
      { id: "guidance", name: "引导 Agent", description: "架构与常用入口指引" },
      { id: "data", name: "数据 Agent", description: "只读统计 InsForge 核心表" },
      { id: "workflow", name: "工作流 Agent", description: "工单创建与轻流转" },
    ]);
  },

  async getModelConfig() {
    return ok<AiModelConfigList>({ items: [], active_id: null });
  },

  async createModelConfig(data: AiModelConfigInput) {
    return ok({ id: "custom", ...data }, "创建成功");
  },

  async updateModelConfig(id: string, data: AiModelConfigInput) {
    return ok({ id, ...data }, "更新成功");
  },

  async deleteModelConfig(_id: string) {
    return ok(null, "删除成功");
  },

  async activateModelConfig(_id: string) {
    return ok(null, "已激活模型配置");
  },
};

export default AiChatAPI;

export interface ChatSession {
  session_id: string;
  agent_id?: string | null;
  team_id?: string | null;
  team_name?: string | null;
  workflow_id?: string | null;
  user_id?: string | null;
  session_data?: Record<string, unknown> | null;
  agent_data?: Record<string, unknown> | null;
  team_data?: Record<string, unknown> | null;
  workflow_data?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  runs?: Array<{ messages: ChatSessionMessage[] }>;
  summary?: string | null;
  created_at?: number | null;
  updated_at?: number | null;
  id: string;
  title?: string | null;
  created_time?: string | null;
  updated_time?: string | null;
  message_count?: number;
  messages?: ChatSessionMessage[];
}

export type ChatSessionDetail = ChatSession;

export interface ChatSessionMessage {
  id?: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_time?: string;
  agent_name?: string;
}

export interface ChatSessionListQuery extends PageQuery {
  title?: string;
}

export interface SessionGroup {
  id?: string;
  title?: string;
  label?: string;
  sessions: ChatSession[];
}

export interface AiModelConfigInput {
  name: string;
  base_url: string;
  api_key: string;
  model_id: string;
  temperature?: number;
}

export interface AiModelConfigItem extends AiModelConfigInput {
  id: string;
  created_time?: string | null;
}

export interface AiModelConfigList {
  items: AiModelConfigItem[];
  active_id: string | null;
}
