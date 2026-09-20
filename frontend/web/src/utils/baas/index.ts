import type { IBaasClient, BaaSProviderType } from "./types";
import { InsforgeAdapter } from "./adapters/insforge.adapter";
import { FirebaseAdapter } from "./adapters/firebase.adapter";

const ACCESS_TOKEN_KEY = "access_token";
const REFRESH_TOKEN_KEY = "refresh_token";
const REMEMBER_ME_KEY = "remember_me";

function readAccessToken(): string | null {
  if (typeof localStorage === "undefined") return null;
  const remember = localStorage.getItem(REMEMBER_ME_KEY) === "true";
  const store = remember ? localStorage : sessionStorage;
  return store.getItem(ACCESS_TOKEN_KEY);
}

function clearAccessTokens(): void {
  if (typeof localStorage === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
}

/** 运行时 BaaS 提供商缓存键（构建期默认仍读 VITE_BACKEND_PROVIDER）。 */
export const BAAS_PROVIDER_STORAGE_KEY = "gravityd_baas_provider";
const LEGACY_PROVIDER_STORAGE_KEY = "GRAVITYD_BAAS_PROVIDER";

/**
 * 解析当前生效的 BaaS 提供商。
 * 优先本地缓存，其次构建期环境变量，默认 insforge。
 * @returns 当前提供商
 */
export function getBaaSProvider(): BaaSProviderType {
  const cached =
    localStorage.getItem(BAAS_PROVIDER_STORAGE_KEY) || localStorage.getItem(LEGACY_PROVIDER_STORAGE_KEY);
  if (cached === "firebase" || cached === "insforge") {
    return cached;
  }
  const envProvider = String(import.meta.env.VITE_BACKEND_PROVIDER || "insforge").toLowerCase();
  return envProvider === "firebase" ? "firebase" : "insforge";
}

let activeClient: IBaasClient | null = null;
let currentProvider: BaaSProviderType = getBaaSProvider();

function createActiveClient(provider: BaaSProviderType): IBaasClient {
  if (provider === "firebase") {
    return new FirebaseAdapter();
  }
  const baseUrl = String(import.meta.env.VITE_INSFORGE_URL || "http://127.0.0.1:7130").replace(/\/$/, "");
  const anonKey = String(import.meta.env.VITE_INSFORGE_ANON_KEY || "");
  return new InsforgeAdapter({ baseUrl, anonKey });
}

/**
 * 切换运行时 BaaS 提供商，清空旧鉴权并可选刷新页面。
 * @param provider 目标提供商
 * @param reload 是否刷新页面；单测环境不会真正 reload
 */
export function setBaaSProvider(provider: BaaSProviderType, reload = true): void {
  localStorage.setItem(BAAS_PROVIDER_STORAGE_KEY, provider);
  localStorage.removeItem(LEGACY_PROVIDER_STORAGE_KEY);
  currentProvider = provider;
  activeClient = createActiveClient(provider);
  clearAccessTokens();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("baas-provider-changed", { detail: { provider } }));
  }
  const inTest = Boolean(import.meta.env?.MODE === "test" || import.meta.env?.VITEST);
  if (reload && typeof window !== "undefined" && !inTest) {
    window.location.reload();
  }
}

export function getBaaSClient(): IBaasClient {
  if (!activeClient) {
    activeClient = createActiveClient(currentProvider);
    const token = readAccessToken();
    if (token) {
      activeClient.auth.setAccessToken(token);
    }
  }
  return activeClient;
}

export const baas = new Proxy({} as IBaasClient, {
  get(_target, prop: keyof IBaasClient) {
    const client = getBaaSClient();
    return client[prop];
  },
});

export function syncBaaSToken(token?: string | null) {
  const value = token === undefined ? readAccessToken() : token;
  getBaaSClient().auth.setAccessToken(value || null);
}

syncBaaSToken();

export * from "./types";
export * from "./error";
export * from "./api-helper";
export { InsforgeAdapter } from "./adapters/insforge.adapter";
export { FirebaseAdapter, FirestoreQueryBuilder } from "./adapters/firebase.adapter";
