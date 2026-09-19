import { createClient } from "@insforge/sdk";
import { Auth } from "@/utils/auth";

const baseUrl = String(import.meta.env.VITE_INSFORGE_URL || "http://127.0.0.1:7130").replace(/\/$/, "");
const anonKey = String(import.meta.env.VITE_INSFORGE_ANON_KEY || "");

export function toLoginEmail(username: string): string {
  const value = username.trim();
  return value.includes("@") ? value.toLowerCase() : `${value}@local.dev`;
}

export const insforge = createClient({
  baseUrl,
  anonKey,
  isServerMode: true,
});

export function syncInsforgeToken(token?: string | null) {
  const value = token === undefined ? Auth.getAccessToken() : token;
  insforge.setAccessToken(value || null);
}

syncInsforgeToken();

export async function insforgeRequest<T>(
  path: string,
  init: RequestInit & { json?: unknown; skipAccessToken?: boolean } = {}
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const token = init.skipAccessToken ? "" : Auth.getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);
  else if (anonKey) headers.set("Authorization", `Bearer ${anonKey}`);

  const { skipAccessToken: _skip, json, ...rest } = init;
  const response = await fetch(`${baseUrl}${path}`, {
    ...rest,
    headers,
    credentials: "omit",
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });
  const payload = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  if (!response.ok) {
    const message =
      (payload.message as string) ||
      (payload.error as string) ||
      `InsForge 请求失败 (${response.status})`;
    throw new Error(message);
  }
  return payload as T;
}

export { baseUrl as insforgeBaseUrl, anonKey as insforgeAnonKey };
