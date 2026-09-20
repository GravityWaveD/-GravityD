import { baas } from "@/utils/baas";
import { Auth } from "@/utils/auth";
import { ok, serverPageOf, unwrap } from "@/utils/baas/api-helper";

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

const OnlineAPI = {
  async listOnline(query: OnlineUserPageQuery) {
    let builder = baas.database.from("sys_online").select("*", { count: "exact" });
    if (query.name) builder = builder.ilike("name", `%${query.name}%`);
    if (query.ipaddr) builder = builder.ilike("ipaddr", `%${query.ipaddr}%`);
    if (query.login_location) builder = builder.ilike("login_location", `%${query.login_location}%`);
    return serverPageOf<OnlineUserTable>(builder, {
      pageNo: query.page_no,
      pageSize: query.page_size,
      sortField: "login_time",
      ascending: false,
    });
  },

  async deleteOnline(sessionId: string) {
    unwrap(await baas.database.from("sys_online").delete().eq("session_id", sessionId));
    return ok(null, "已强制下线", true);
  },

  async listCurrentOnline() {
    const userId = jwtSub();
    if (!userId) return ok([]);
    const rows = (unwrap(await baas.database.from("sys_online").select("*").eq("user_id", userId)) as OnlineUserTable[]) || [];
    return ok(rows);
  },

  async clearOnline() {
    const rows = (unwrap(await baas.database.from("sys_online").select("session_id")) as { session_id: string }[]) || [];
    if (rows.length) {
      unwrap(await baas.database.from("sys_online").delete().in("session_id", rows.map((item) => item.session_id)));
    }
    return ok(null, "已清空", true);
  },
};

export default OnlineAPI;

export interface OnlineUserPageQuery extends PageQuery, UserByQueryParams {
  ipaddr?: string;
  name?: string;
  login_location?: string;
}

export interface OnlineUserTable {
  session_id: string;
  user_id: string | number;
  is_superuser?: boolean;
  name: string;
  user_name: string;
  ipaddr?: string;
  login_location?: string;
  os?: string;
  browser?: string;
  login_time?: string;
  login_type?: string;
}
