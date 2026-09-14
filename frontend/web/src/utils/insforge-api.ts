import { ElMessage } from "element-plus";
import { ResultEnum } from "@/enums/api/result.enum";

export class InsforgeApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsforgeApiError";
  }
}

export function unwrap<T>(result: { data: T | null; error: { message?: string } | null }): T {
  if (result?.error) {
    throw new InsforgeApiError(result.error.message || "InsForge 请求失败");
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
