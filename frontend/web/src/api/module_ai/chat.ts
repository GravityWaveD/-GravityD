import { insforge } from "@/utils/insforge";
import { ok, serverPageOf, unwrap } from "@/utils/insforge-api";
import { runGravitydAgent } from "@/utils/gravityd-agents";
import { Auth } from "@/utils/auth";

function jwtSub(): string | null {
  try {
    const token = Auth.getAccessToken();
    if (!token) return null;
    const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
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
    let builder = insforge.database.from("agent_session").select("*", { count: "exact" });
    if (userId) builder = builder.eq("user_id", userId);
    if (query.title) builder = builder.ilike("title", `%${query.title}%`);
    return serverPageOf<ChatSession>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "updated_time",
      ascending: false,
      mapItems: (items) => (items as SessionRow[]).map((row) => toSession(row)),
    });
  },

  async createSession(body: { title: string }) {
    const userId = jwtSub();
    if (!userId) throw new Error("未登录");
    const rows = unwrap(
      await insforge.database
        .from("agent_session")
        .insert([{ user_id: userId, title: body.title }])
        .select()
    ) as SessionRow[];
    if (!rows?.[0]) throw new Error("创建会话失败");
    return ok(toSession(rows[0]));
  },

  async updateSession(id: string, body: { title: string }) {
    unwrap(await insforge.database.from("agent_session").update({ title: body.title }).eq("id", Number(id)));
    return ok(null, "更新成功", true);
  },

  async deleteSession(body: string[]) {
    unwrap(await insforge.database.from("agent_session").delete().in("id", body.map((id) => Number(id))));
    return ok(null, "删除成功", true);
  },

  async chat(body: { message: string; session_id?: string | null }) {
    const userId = jwtSub();
    if (!userId) throw new Error("未登录");
    let sessionId = body.session_id ? Number(body.session_id) : 0;
    if (!sessionId) {
      const created = unwrap(
        await insforge.database
          .from("agent_session")
          .insert([{ user_id: userId, title: body.message.slice(0, 20) }])
          .select()
      ) as SessionRow[];
      sessionId = created?.[0]?.id || 0;
    }
    unwrap(
      await insforge.database.from("agent_message").insert([
        { session_id: sessionId, role: "user", content: body.message },
      ])
    );
    const reply = await runGravitydAgent(body.message);
    unwrap(
      await insforge.database.from("agent_message").insert([
        { session_id: sessionId, role: "assistant", content: reply.response, agent_name: reply.agent },
      ])
    );
    unwrap(
      await insforge.database
        .from("agent_session")
        .update({ updated_time: new Date().toISOString() })
        .eq("id", sessionId)
    );
    return ok<AiChatResponse>({
      response: reply.response,
      session_id: String(sessionId),
      function_calls: [{ name: reply.agent, arguments: {} }],
      action: { agent: reply.agent },
    });
  },

  async getSessionDetail(sessionId: string) {
    const sessions = unwrap(
      await insforge.database.from("agent_session").select("*").eq("id", Number(sessionId))
    ) as SessionRow[];
    if (!sessions?.[0]) throw new Error("会话不存在");
    const messages = ((unwrap(
      await insforge.database.from("agent_message").select("*").eq("session_id", Number(sessionId))
    ) as MessageRow[]) || []).sort((a, b) => String(a.created_time || "").localeCompare(String(b.created_time || "")));
    const mapped = messages.map((item) => ({
      id: String(item.id),
      role: item.role,
      content: item.content,
      created_at: item.created_time ? Date.parse(item.created_time) : null,
    }));
    return ok<ChatSessionDetail>(toSession(sessions[0], mapped, mapped.length));
  },

  async getModelConfig() {
    return ok<AiModelConfigList>({ items: [], active_id: null });
  },

  async createModelConfig(_body: AiModelConfigInput) {
    throw new Error("外部模型配置未接入，当前使用本地 Multi-Agent");
  },

  async updateModelConfig(_id: string, _body: AiModelConfigInput) {
    throw new Error("外部模型配置未接入，当前使用本地 Multi-Agent");
  },

  async deleteModelConfig(_id: string) {
    throw new Error("外部模型配置未接入，当前使用本地 Multi-Agent");
  },

  async activateModelConfig(_id: string) {
    throw new Error("外部模型配置未接入，当前使用本地 Multi-Agent");
  },
};

export default AiChatAPI;

export interface ChatSessionListQuery extends PageQuery {
  title?: string;
  created_at?: string[];
  updated_at?: string[];
}

export interface AiModelConfigInput {
  name: string;
  base_url: string;
  api_key: string;
  model_id: string;
  temperature: number;
}

export interface AiModelConfigItem extends AiModelConfigInput {
  id: string;
  created_time: string | null;
}

export interface AiModelConfigList {
  items: AiModelConfigItem[];
  active_id: string | null;
}

export interface ChatSessionMessage {
  id: string;
  role: string;
  content: string;
  created_at: number | null;
}

export interface ChatSession {
  session_id: string;
  agent_id: string | null;
  team_id: string | null;
  team_name: string | null;
  workflow_id: string | null;
  user_id: string | null;
  session_data: Record<string, any> | null;
  agent_data: Record<string, any> | null;
  team_data: Record<string, any> | null;
  workflow_data: Record<string, any> | null;
  metadata: Record<string, any> | null;
  runs: Array<Record<string, any>> | null;
  summary: Record<string, any> | null;
  created_at: number | null;
  updated_at: number | null;
  id: string;
  title: string | null;
  created_time: string | null;
  updated_time: string | null;
  message_count: number;
  messages: ChatSessionMessage[];
}

export interface SessionGroup {
  id: string;
  title: string;
  sessions: ChatSession[];
}

export interface AiChatResponse {
  response: string;
  session_id: string;
  function_calls: Array<{
    name: string;
    arguments: Record<string, any>;
  }> | null;
  action: Record<string, any> | null;
}

export interface ChatSessionDetail extends ChatSession {}
