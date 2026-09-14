import { insforge } from "@/utils/insforge";
import { ok, pageOf, rangeOf, unwrap } from "@/utils/insforge-api";

const OperationLogAPI = {
  async list(query?: OperationLogPageQuery) {
    const { pageNo, pageSize } = rangeOf(query?.page_no, query?.page_size);
    let builder = insforge.database.from("sys_operation_log").select("*");
    if (query?.username) builder = builder.ilike("username", `%${query.username}%`);
    if (query?.request_path) builder = builder.ilike("request_path", `%${query.request_path}%`);
    if (query?.request_method) builder = builder.eq("request_method", query.request_method);
    if (query?.request_ip) builder = builder.ilike("request_ip", `%${query.request_ip}%`);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    const rows = ((unwrap(await builder) as OperationLogTable[]) || []).sort(
      (a, b) => String(b.created_time || "").localeCompare(String(a.created_time || ""))
    );
    return ok(pageOf(rows.slice((pageNo - 1) * pageSize, pageNo * pageSize), rows.length, pageNo, pageSize));
  },

  async detail(id: number) {
    const rows = unwrap(await insforge.database.from("sys_operation_log").select("*").eq("id", id)) as OperationLogTable[];
    if (!rows?.[0]) throw new Error("日志不存在");
    return ok(rows[0]);
  },

  async delete(body: number[]) {
    unwrap(await insforge.database.from("sys_operation_log").delete().in("id", body));
    return ok(null, "删除成功", true);
  },

  async export(_query?: OperationLogPageQuery) {
    throw new Error("未迁移导出");
  },
};

export default OperationLogAPI;

export interface OperationLogPageQuery extends PageQuery, UserByQueryParams {
  request_path?: string;
  request_method?: string;
  username?: string;
  status?: number;
  request_ip?: string;
}

export interface OperationLogTable {
  id: number;
  username: string;
  status?: number;
  description?: string;
  request_path: string;
  request_method: string;
  request_payload?: Record<string, unknown> | string;
  response_code: number;
  response_json?: Record<string, unknown> | string;
  process_time?: string;
  created_time?: string;
  request_ip?: string;
}

export const LoginLogAPI = {
  async list(query?: LoginLogPageQuery) {
    const { pageNo, pageSize } = rangeOf(query?.page_no, query?.page_size);
    let builder = insforge.database.from("sys_login_log").select("*");
    if (query?.username) builder = builder.ilike("username", `%${query.username}%`);
    if (query?.status !== undefined && query.status !== null && query.status !== ("" as unknown as number)) {
      builder = builder.eq("status", query.status);
    }
    const rows = ((unwrap(await builder) as LoginLogTable[]) || []).sort(
      (a, b) => String(b.created_time || "").localeCompare(String(a.created_time || ""))
    );
    return ok(pageOf(rows.slice((pageNo - 1) * pageSize, pageNo * pageSize), rows.length, pageNo, pageSize));
  },

  async detail(id: number) {
    const rows = unwrap(await insforge.database.from("sys_login_log").select("*").eq("id", id)) as LoginLogTable[];
    if (!rows?.[0]) throw new Error("日志不存在");
    return ok(rows[0]);
  },

  async delete(body: number[]) {
    unwrap(await insforge.database.from("sys_login_log").delete().in("id", body));
    return ok(null, "删除成功", true);
  },
};

export interface LoginLogPageQuery extends PageQuery, UserByQueryParams {
  username?: string;
  status?: number;
}

export interface LoginLogTable {
  id: number;
  username: string;
  status: number;
  login_ip?: string;
  login_location?: string;
  request_os?: string;
  request_browser?: string;
  msg?: string;
  created_time?: string;
}
