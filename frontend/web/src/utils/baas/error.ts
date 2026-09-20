/**
 * 统一 BaaS (Backend as a Service) 错误基类与认证状态检测
 */

export class BaaSError extends Error {
  readonly status?: number;
  readonly provider?: string;
  readonly code?: string;

  /**
   * 统一 BaaS 错误。兼容位置参数与选项对象两种构造方式。
   * @param message 错误信息
   * @param statusOrOptions HTTP 状态码，或 `{ status, provider, code }`
   * @param provider 可选提供商标识
   * @param code 可选错误码
   */
  constructor(
    message: string,
    statusOrOptions?: number | { status?: number; provider?: string; code?: string },
    provider?: string,
    code?: string
  ) {
    super(message);
    this.name = "BaaSError";
    if (typeof statusOrOptions === "object" && statusOrOptions !== null) {
      this.status = statusOrOptions.status;
      this.provider = statusOrOptions.provider;
      this.code = statusOrOptions.code;
    } else {
      this.status = statusOrOptions;
      this.provider = provider;
      this.code = code;
    }
  }
}

/**
 * 判断错误是否为认证过期/无效错误（401 / JWT 失效 / Firebase Token 过期）
 */
export function isBaaSAuthError(error: unknown): boolean {
  if (error instanceof BaaSError && error.status === 401) return true;
  if (error && typeof error === "object") {
    const err = error as { message?: string; code?: string; status?: number };
    if (err.status === 401) return true;
    const msg = String(err.message || "").toLowerCase();
    const code = String(err.code || "").toLowerCase();
    
    // InsForge / PostgREST 关键词
    const isInsforgeAuth = [
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
    ].some((needle) => msg.includes(needle));

    // Firebase Auth 关键词与错误码
    const isFirebaseAuth = [
      "auth/id-token-expired",
      "auth/id-token-revoked",
      "auth/user-token-expired",
      "auth/user-not-found",
      "auth/invalid-credential",
      "auth/user-disabled",
      "auth/invalid-auth-token",
    ].some((needle) => code.includes(needle) || msg.includes(needle));

    return isInsforgeAuth || isFirebaseAuth;
  }
  return false;
}
