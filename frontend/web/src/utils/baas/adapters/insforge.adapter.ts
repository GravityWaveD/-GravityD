import { createClient } from "@insforge/sdk";
import type {
  IBaasClient,
  IBaasAuth,
  IBaasDatabase,
  IBaasStorage,
  IBaaSTableQuery,
  BaaSProviderType,
  BaaSLoginParams,
  BaaSLoginResult,
  BaaSAuthUser,
  QueryOptions,
} from "../types";
import { BaaSError } from "../error";

export class InsforgeQueryWrapper<T = Record<string, unknown>> implements IBaaSTableQuery<T> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private nativeBuilder: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(nativeBuilder: any) {
    this.nativeBuilder = nativeBuilder;
  }

  select(columns?: string, options?: QueryOptions): this {
    this.nativeBuilder = this.nativeBuilder.select(columns || "*", options);
    return this;
  }

  eq(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.eq(column, value);
    return this;
  }

  neq(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.neq(column, value);
    return this;
  }

  in(column: string, values: unknown[]): this {
    this.nativeBuilder = this.nativeBuilder.in(column, values);
    return this;
  }

  like(column: string, pattern: string): this {
    this.nativeBuilder = this.nativeBuilder.like(column, pattern);
    return this;
  }

  ilike(column: string, pattern: string): this {
    this.nativeBuilder = this.nativeBuilder.ilike(column, pattern);
    return this;
  }

  gt(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.gt(column, value);
    return this;
  }

  gte(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.gte(column, value);
    return this;
  }

  lt(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.lt(column, value);
    return this;
  }

  lte(column: string, value: unknown): this {
    this.nativeBuilder = this.nativeBuilder.lte(column, value);
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.nativeBuilder = this.nativeBuilder.order(column, options);
    return this;
  }

  range(from: number, to: number): this {
    this.nativeBuilder = this.nativeBuilder.range(from, to);
    return this;
  }

  limit(count: number): this {
    this.nativeBuilder = this.nativeBuilder.limit(count);
    return this;
  }

  async single(): Promise<{ data: T | null; error: { message: string } | null }> {
    const res = await this.nativeBuilder.single();
    return {
      data: (res.data ?? null) as T | null,
      error: res.error ? { message: res.error.message || "Query failed" } : null,
    };
  }

  async insert(values: Partial<T> | Partial<T>[]): Promise<{ data: T[] | null; error: { message: string } | null }> {
    const res = await this.nativeBuilder.insert(Array.isArray(values) ? values : [values]);
    return {
      data: (res.data ?? null) as T[] | null,
      error: res.error ? { message: res.error.message || "Insert failed" } : null,
    };
  }

  update(values: Partial<T>): this {
    this.nativeBuilder = this.nativeBuilder.update(values);
    return this;
  }

  delete(): this {
    this.nativeBuilder = this.nativeBuilder.delete();
    return this;
  }

  then<TResult1 = { data: T[] | null; count?: number | null; error: { message: string } | null }>(
    onfulfilled?: (value: { data: T[] | null; count?: number | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => unknown
  ): Promise<TResult1> {
    return this.nativeBuilder.then((res: { data: unknown; count?: number; error?: { message?: string } }) => {
      const wrapped = {
        data: (res.data ?? null) as T[] | null,
        count: res.count ?? null,
        error: res.error ? { message: res.error.message || "Query failed" } : null,
      };
      return onfulfilled ? onfulfilled(wrapped) : (wrapped as unknown as TResult1);
    }, onrejected);
  }
}

export class InsforgeAdapter implements IBaasClient {
  readonly provider: BaaSProviderType = "insforge";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public readonly client: any;
  public readonly auth: IBaasAuth;
  public readonly database: IBaasDatabase;
  public readonly storage: IBaasStorage;
  private currentToken: string | null = null;
  private baseUrl: string;

  constructor(config: { baseUrl: string; anonKey: string }) {
    this.baseUrl = config.baseUrl.replace(/\/$/, "");
    this.client = createClient({
      baseUrl: this.baseUrl,
      anonKey: config.anonKey,
      isServerMode: true,
    });

    const self = this;

    this.auth = {
      async signIn(params: BaaSLoginParams): Promise<BaaSLoginResult> {
        const username = (params.username || params.email || "").trim();
        const email = username.includes("@") ? username.toLowerCase() : `${username}@local.dev`;
        const { data, error } = await self.client.auth.signInWithPassword({
          email,
          password: params.password || "",
        });
        if (error || !data?.accessToken) {
          throw new BaaSError(error?.message || "登录失败，请检查账号密码", 401, "insforge");
        }
        self.auth.setAccessToken(data.accessToken);

        const authUser: BaaSAuthUser = {
          id: data.user?.id || "",
          email: data.user?.email || email,
          name: data.user?.name || username,
          username,
        };

        return {
          access_token: data.accessToken,
          refresh_token: data.refreshToken || "",
          token_type: "Bearer",
          expires_in: 3600,
          user: authUser,
        };
      },

      async signOut(): Promise<void> {
        await self.client.auth.signOut().catch(() => {});
        self.auth.setAccessToken(null);
      },

      async getCurrentUser(): Promise<BaaSAuthUser | null> {
        const { data } = await self.client.auth.getCurrentUser();
        if (data?.user) {
          return {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            username: data.user.email?.split("@")[0] || data.user.name,
          };
        }
        return null;
      },

      async refreshToken(token?: string): Promise<{ access_token: string; refresh_token?: string }> {
        const response = await fetch(`${self.baseUrl}/api/auth/refresh?client_type=server`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refreshToken: token }),
        });
        const payload = await response.json();
        if (!response.ok) throw new BaaSError(payload.message || "刷新令牌失败", 401, "insforge");
        return {
          access_token: payload.accessToken,
          refresh_token: payload.refreshToken || token,
        };
      },

      setAccessToken(token: string | null): void {
        self.currentToken = token;
        self.client.setAccessToken(token || null);
      },

      getAccessToken(): string | null {
        return self.currentToken;
      },

      async createUser(params: { email: string; password?: string; name?: string }): Promise<{ id: string }> {
        const response = await fetch(`${self.baseUrl}/api/auth/users?client_type=server`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(self.currentToken ? { Authorization: `Bearer ${self.currentToken}` } : {}),
          },
          body: JSON.stringify({
            email: params.email,
            password: params.password || "123456",
            name: params.name || params.email,
          }),
        });
        const payload = await response.json();
        if (!response.ok || !payload.user?.id) {
          throw new BaaSError(payload.message || "创建登录账号失败", 400, "insforge");
        }
        return { id: payload.user.id };
      },
    };

    this.database = {
      from<T = Record<string, unknown>>(tableName: string): IBaaSTableQuery<T> {
        return new InsforgeQueryWrapper<T>(self.client.database.from(tableName));
      },

      async rpc<T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<{ data: T | null; error: { message: string } | null }> {
        const res = await self.client.database.rpc(functionName, params);
        return {
          data: (res.data ?? null) as T | null,
          error: res.error ? { message: res.error.message || "RPC failed" } : null,
        };
      },
    };

    this.storage = {
      async upload(bucket: string, path: string, file: File | Blob): Promise<{ path: string; url?: string }> {
        const { data, error } = await self.client.storage.from(bucket).upload(path, file);
        if (error) throw new BaaSError(error.message || "文件上传失败", 500, "insforge");
        return { path: data?.path || path, url: `${self.baseUrl}/storage/v1/object/public/${bucket}/${path}` };
      },

      getPublicUrl(bucket: string, path: string): string {
        return `${self.baseUrl}/storage/v1/object/public/${bucket}/${path}`;
      },

      async remove(bucket: string, paths: string[]): Promise<void> {
        await self.client.storage.from(bucket).remove(paths);
      },
    };
  }
}
