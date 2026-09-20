import { ElMessage } from "element-plus";
import { ResultEnum } from "@/enums/api/result.enum";
import { BaaSError, isBaaSAuthError } from "./error";

export { BaaSError, isBaaSAuthError };

export function toLoginEmail(username: string): string {
  const value = username.trim();
  return value.includes("@") ? value.toLowerCase() : `${value}@local.dev`;
}

export function isBaaSAuthMessage(message?: string | null): boolean {
  return isBaaSAuthError({ message });
}

export function unwrap<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result?.error) {
    const message = result.error.message || "BaaS 请求失败";
    throw new BaaSError(message, isBaaSAuthError({ message }) ? 401 : undefined);
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

export interface ServerPageOptions<T = unknown, R = T> {
  pageNo?: number;
  pageSize?: number;
  sortField?: string;
  sortColumn?: string;
  ascending?: boolean;
  mapItems?: (items: T[]) => Promise<R[]> | R[];
}

type PageQueryResult<T> = { data: T[] | null; count?: number | null; error?: { message?: string } | null };

function isThenable(value: unknown): value is PromiseLike<PageQueryResult<unknown>> {
  return Boolean(value && typeof (value as { then?: unknown }).then === "function");
}

export async function serverPageOf<T = Record<string, unknown>, R = T>(
  builder: {
    order(column: string, options?: { ascending?: boolean }): unknown;
    range(from: number, to: number): unknown;
  },
  optionsOrPageNo?: number | ServerPageOptions<T, R>,
  pageSizeArg?: number,
  optionsArg?: ServerPageOptions<T, R>
): Promise<{ data: ApiResponse<PageResult<R>> }> {
  let curPage = 1;
  let curSize = 10;
  let sortField: string | undefined;
  let ascending = true;
  let mapItems: ((items: T[]) => Promise<R[]> | R[]) | undefined;

  if (typeof optionsOrPageNo === "object" && optionsOrPageNo !== null) {
    curPage = optionsOrPageNo.pageNo || 1;
    curSize = optionsOrPageNo.pageSize || 10;
    sortField = optionsOrPageNo.sortField || optionsOrPageNo.sortColumn;
    if (optionsOrPageNo.ascending !== undefined) {
      ascending = optionsOrPageNo.ascending;
    }
    mapItems = optionsOrPageNo.mapItems;
  } else {
    curPage = typeof optionsOrPageNo === "number" ? optionsOrPageNo : 1;
    curSize = typeof pageSizeArg === "number" ? pageSizeArg : 10;
    if (optionsArg) {
      sortField = optionsArg.sortField || optionsArg.sortColumn;
      if (optionsArg.ascending !== undefined) {
        ascending = optionsArg.ascending;
      }
      mapItems = optionsArg.mapItems;
    }
  }

  const { from, to } = rangeOf(curPage, curSize);

  if (sortField === "order") {
    sortField = "id";
  }

  if (sortField) {
    builder.order(sortField, { ascending });
  }

  const ranged = builder.range(from, to);
  const res = (await (isThenable(ranged) ? ranged : builder)) as PageQueryResult<T>;
  const list = (res.data || []) as T[];
  const total = typeof res.count === "number" ? res.count : list.length;

  let finalItems: R[] = list as unknown as R[];
  if (mapItems) {
    finalItems = await mapItems(list);
  }

  return ok(pageOf(finalItems, total, curPage, curSize));
}
