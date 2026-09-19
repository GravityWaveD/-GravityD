/** 旧 FastAPI 8001 已移除。未迁模块统一走这里，避免页面假装打通后端。 */
export function request<T = unknown>(..._args: unknown[]): Promise<T> {
  return Promise.reject(new Error("未迁移（旧 FastAPI 8001 已移除）"));
}

export function createSSEClient(..._args: unknown[]): never {
  throw new Error("未迁移 SSE（旧 FastAPI 8001 已移除）");
}

export function httpEndpoint(..._args: unknown[]): string {
  throw new Error("未迁移 HTTP 端点（旧 FastAPI 8001 已移除）");
}

export type SSEClient = never;
