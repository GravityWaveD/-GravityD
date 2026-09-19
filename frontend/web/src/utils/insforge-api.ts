import { ElMessage } from "element-plus";
import { ResultEnum } from "@/enums/api/result.enum";

export class InsforgeApiError extends Error {
  readonly status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "InsforgeApiError";
    this.status = status;
  }
}

/** InsForge / PostgREST 把过期或损坏的 JWT 打成这类文案，不是业务 500 */
export function isInsforgeAuthMessage(message?: string | null): boolean {
  const text = String(message || "").toLowerCase();
  if (!text) return false;
  return [
    "invalid token",
    "jwt expired",
    "jwt malformed",
    "token expired",
    "not authenticated",
    "unauthorized",
    "session has expired",
    "pgrst301",
    "jwserror",
    "no api key",
  ].some((needle) => text.includes(needle));
}

export function isInsforgeAuthError(error: unknown): boolean {
  if (error instanceof InsforgeApiError && error.status === 401) return true;
  if (error instanceof Error && isInsforgeAuthMessage(error.message)) return true;
  return false;
}

export function unwrap<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result?.error) {
    const message = result.error.message || "InsForge 请求失败";
    throw new InsforgeApiError(message, isInsforgeAuthMessage(message) ? 401 : undefined);
  }
  const payload = result?.data as T | { records?: T } | null;
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "records" in payload) {
    return (payload.records ?? null) as T;
  }
  return (payload ?? null) as T;
}

export function ok<T>(data: T, msg = "ok", notify = false) {
  if (notify) {
    ElMessage.success(msg);
  }
  return {
    data: {
      code: ResultEnum.SUCCESS,
      data,
      msg,
      status_code: 200,
      success: true,
    },
    status: 200,
    statusText: "OK",
    headers: {},
    config: {},
  } as unknown as { data: ApiResponse<T> };
}

export function pageOf<T>(items: T[], total: number, pageNo = 1, pageSize = 10): PageResult<T> {
  return {
    items,
    total,
    page_no: pageNo,
    page_size: pageSize,
    has_next: pageNo * pageSize < total,
  };
}

export function buildTree<T extends { id?: number | string; parent_id?: number | string | null; children?: T[] }>(
  rows: T[]
): T[] {
  const map = new Map<string, T>();
  const roots: T[] = [];
  rows.forEach((row) => {
    map.set(String(row.id), { ...row, children: [] });
  });
  map.forEach((row) => {
    const parentId = row.parent_id == null || row.parent_id === "" ? null : String(row.parent_id);
    const parent = parentId ? map.get(parentId) : undefined;
    if (parent) {
      parent.children = parent.children || [];
      parent.children.push(row);
    } else {
      roots.push(row);
    }
  });
  return roots;
}

export function rangeOf(pageNo?: number, pageSize?: number) {
  const no = Math.max(1, pageNo || 1);
  const size = Math.max(1, pageSize || 10);
  const from = (no - 1) * size;
  return { from, to: from + size - 1, pageNo: no, pageSize: size };
}

export interface ServerPageOptions<T = unknown> {
  pageNo?: number;
  pageSize?: number;
  sortField?: string;
  ascending?: boolean;
  mapItems?: (items: T[]) => Promise<T[]> | T[];
}

const RESERVED_SORT_FIELDS = new Set(["order"]);

function resolveSortField(field?: string) {
  if (!field || RESERVED_SORT_FIELDS.has(field)) return "id";
  return field;
}

/**
 * 生产级 PostgREST 服务端精准分页器
 * 利用 PostgREST 原生 range 与 count: 'exact' 响应，避免全量数据拉取与 1000 行限制 bug
 * 列名 "order" 是 SQL 保留字，自动回退到 id，避免 .order('order') 失败
 */
export async function serverPageOf<T>(
  queryBuilder: any,
  options: ServerPageOptions<T> = {}
) {
  const pageNo = Math.max(1, options.pageNo || 1);
  const pageSize = Math.max(1, options.pageSize || 10);
  const from = (pageNo - 1) * pageSize;
  const to = from + pageSize - 1;
  const sortField = resolveSortField(options.sortField);
  const ascending = options.ascending ?? true;

  let builder = queryBuilder;
  if (sortField) {
    builder = builder.order(sortField, { ascending });
  }

  const res = await builder.range(from, to);
  if (res?.error) {
    const message = res.error.message || "分页查询失败";
    throw new InsforgeApiError(message, isInsforgeAuthMessage(message) ? 401 : undefined);
  }

  const payload = res?.data as T[] | { records?: T[] } | null;
  let items: T[] = [];
  if (Array.isArray(payload)) {
    items = payload;
  } else if (payload && typeof payload === "object" && "records" in payload && Array.isArray((payload as any).records)) {
    items = (payload as any).records;
  }

  if (options.mapItems) {
    items = await options.mapItems(items);
  }

  const total = typeof res?.count === "number" ? res.count : items.length;
  return ok(pageOf(items, total, pageNo, pageSize));
}

