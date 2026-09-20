/** 旧 FastAPI 8001 已移除。未迁模块统一走这里，避免页面假装打通后端。 */
export function request<T = any>(..._args: unknown[]): Promise<{ data: T; headers?: any } & T> {
  return Promise.reject(new Error("未迁移（旧 FastAPI 8001 已移除）")) as any;
}

export interface SSEClient {
  disconnect: () => void;
  connected: boolean;
}

export function createSSEClient(..._args: any[]): SSEClient {
  throw new Error("未迁移 SSE（旧 FastAPI 8001 已移除）");
}

export function httpEndpoint(..._args: unknown[]): string {
  throw new Error("未迁移 HTTP 端点（旧 FastAPI 8001 已移除）");
}
