/**
 * 统一 BaaS 核心契约与接口定义
 * 支持 InsForge (PostgreSQL/PostgREST) 与 Firebase (Auth/Firestore/Storage)
 */

export type BaaSProviderType = "insforge" | "firebase";

export interface BaaSConfig {
  provider: BaaSProviderType;
  insforge?: {
    baseUrl: string;
    anonKey: string;
  };
  firebase?: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId?: string;
    appId: string;
    measurementId?: string;
  };
}

export interface BaaSAuthUser {
  id: string;
  email?: string | null;
  name?: string | null;
  username?: string | null;
  avatar?: string | null;
  is_superuser?: boolean;
}

export interface BaaSLoginParams {
  username?: string;
  email?: string;
  password?: string;
}

export interface BaaSLoginResult {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: BaaSAuthUser;
}

export interface QueryFilter {
  field: string;
  operator: "eq" | "neq" | "in" | "like" | "ilike" | "gt" | "gte" | "lt" | "lte" | "is";
  value: unknown;
}

export interface QueryOrder {
  column: string;
  ascending?: boolean;
}

export interface QueryRange {
  from: number;
  to: number;
}

export interface QueryOptions {
  head?: boolean;
  count?: "exact" | "planned" | "estimated";
}

/**
 * 统一数据库查询构建器 (Fluent API)
 */
export interface IBaaSTableQuery<T = any> {
  select(columns?: string, options?: QueryOptions): this;
  eq(column: string, value: unknown): this;
  neq(column: string, value: unknown): this;
  in(column: string, values: unknown[]): this;
  like(column: string, pattern: string): this;
  ilike(column: string, pattern: string): this;
  gt(column: string, value: unknown): this;
  gte(column: string, value: unknown): this;
  lt(column: string, value: unknown): this;
  lte(column: string, value: unknown): this;
  order(column: string, options?: { ascending?: boolean }): this;
  range(from: number, to: number): this;
  limit(count: number): this;
  single(): Promise<{ data: T | null; error: { message: string } | null }>;
  insert(values: Partial<T> | Partial<T>[]): Promise<{ data: T[] | null; error: { message: string } | null }>;
  update(values: Partial<T>): this;
  delete(): this;
  then<TResult1 = { data: T[] | null; count?: number | null; error: { message: string } | null }>(
    onfulfilled?: (value: { data: T[] | null; count?: number | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>,
    onrejected?: (reason: unknown) => unknown
  ): Promise<TResult1>;
}

export interface IBaasDatabase {
  from<T = any>(tableName: string): IBaaSTableQuery<T>;
  rpc<T = unknown>(functionName: string, params?: Record<string, unknown>): Promise<{ data: T | null; error: { message: string } | null }>;
}

export interface IBaasAuth {
  signIn(params: BaaSLoginParams): Promise<BaaSLoginResult>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<BaaSAuthUser | null>;
  refreshToken(token?: string): Promise<{ access_token: string; refresh_token?: string }>;
  setAccessToken(token: string | null): void;
  getAccessToken(): string | null;
  createUser?(params: { email: string; password?: string; name?: string }): Promise<{ id: string }>;
}

export interface IBaasStorage {
  upload(bucket: string, path: string, file: File | Blob): Promise<{ path: string; url?: string }>;
  getPublicUrl(bucket: string, path: string): string;
  remove(bucket: string, paths: string[]): Promise<void>;
}

export interface IBaasClient {
  readonly provider: BaaSProviderType;
  readonly auth: IBaasAuth;
  readonly database: IBaasDatabase;
  readonly storage: IBaasStorage;
}
