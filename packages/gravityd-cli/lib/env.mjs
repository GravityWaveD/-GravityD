import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { DEFAULT_INSFORGE_URL, DEFAULT_POSTGRES_PORT } from "./constants.mjs";
import { fail } from "./io.mjs";

export const BAAS_PROVIDERS = ["insforge", "firebase"];

/**
 * 规范化并校验 BaaS 提供商标识。
 * @param {unknown} value 原始参数
 * @param {string} [fallback="insforge"] 缺省值
 * @returns {"insforge"|"firebase"}
 */
export function normalizeProvider(value, fallback = "insforge") {
  const raw = value == null || value === "" ? fallback : value;
  const provider = String(raw).trim().toLowerCase();
  if (!BAAS_PROVIDERS.includes(provider)) {
    throw fail("validation_error", `不支持的 BaaS 提供商: ${raw}（可选: insforge, firebase）`, {
      field: "provider",
    });
  }
  return provider;
}

/**
 * 写入或更新 .env 中的单个键。
 * @param {string} file 目标文件
 * @param {string} key 环境变量名
 * @param {string} value 值
 * @param {{ onlyIfMissing?: boolean }} [options] onlyIfMissing 为真时不覆盖已有键
 */
export function upsertEnvFile(file, key, value, options = {}) {
  mkdirSync(dirname(file), { recursive: true });
  const current = existsSync(file) ? readFileSync(file, "utf8") : "";
  const lines = current.split(/\r?\n/);
  const pattern = new RegExp(`^${key}=`);
  const exists = lines.some((line) => pattern.test(line));
  if (exists) {
    if (options.onlyIfMissing) return;
    const next = lines.map((line) => (pattern.test(line) ? `${key}=${value}` : line)).join("\n");
    writeFileSync(file, next.endsWith("\n") || next === "" ? next : `${next}\n`, "utf8");
    return;
  }
  const prefix = current && !current.endsWith("\n") ? `${current}\n` : current;
  writeFileSync(file, `${prefix}${key}=${value}\n`, "utf8");
}

/**
 * 按选定提供商写入 frontend/web/.env.development，不写入密钥明文默认值以外的占位。
 * @param {string} root GravityD 仓库根
 * @param {"insforge"|"firebase"} provider 提供商
 * @returns {string} 写入的 env 路径
 */
export function writeWebProviderEnv(root, provider) {
  const dest = join(root, "frontend", "web", ".env.development");
  const example = join(root, "frontend", "web", ".env.development.example");
  if (!existsSync(dest) && existsSync(example)) {
    copyFileSync(example, dest);
  }
  upsertEnvFile(dest, "VITE_APP_TITLE", "GravityD", { onlyIfMissing: true });
  upsertEnvFile(dest, "VITE_BACKEND_PROVIDER", provider);
  if (provider === "firebase") {
    for (const key of [
      "VITE_FIREBASE_API_KEY",
      "VITE_FIREBASE_AUTH_DOMAIN",
      "VITE_FIREBASE_PROJECT_ID",
      "VITE_FIREBASE_STORAGE_BUCKET",
      "VITE_FIREBASE_MESSAGING_SENDER_ID",
      "VITE_FIREBASE_APP_ID",
      "VITE_FIREBASE_MEASUREMENT_ID",
    ]) {
      upsertEnvFile(dest, key, process.env[key] || "", { onlyIfMissing: true });
    }
  } else {
    upsertEnvFile(dest, "VITE_INSFORGE_URL", process.env.VITE_INSFORGE_URL || DEFAULT_INSFORGE_URL, {
      onlyIfMissing: true,
    });
  }
  return dest;
}

export function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    out[key] = value;
  }
  return out;
}

export function insforgeEnv(root) {
  return parseEnvFile(join(root, "insforge", ".env"));
}

export function webEnv(root) {
  const dev = parseEnvFile(join(root, "frontend", "web", ".env.development"));
  const local = parseEnvFile(join(root, "frontend", "web", ".env"));
  return { ...local, ...dev };
}

export function insforgeUrlFromEnv(root, fallback = DEFAULT_INSFORGE_URL) {
  const env = insforgeEnv(root);
  const web = webEnv(root);
  return (
    env.API_BASE_URL ||
    web.VITE_INSFORGE_URL ||
    fallback
  ).replace(/\/$/, "");
}

export function postgresPortFromEnv(root) {
  const env = insforgeEnv(root);
  const n = Number(env.POSTGRES_PORT || DEFAULT_POSTGRES_PORT);
  return Number.isInteger(n) ? n : DEFAULT_POSTGRES_PORT;
}

export function composeProjectFromEnv(root) {
  const env = insforgeEnv(root);
  return env.COMPOSE_PROJECT_NAME || "gravityd-insforge";
}

export function secretsPresent(root) {
  const env = insforgeEnv(root);
  const web = webEnv(root);
  const anon = Boolean(env.ACCESS_ANON_KEY || env.ANON_KEY || web.VITE_INSFORGE_ANON_KEY);
  return {
    insforge_env: existsSync(join(root, "insforge", ".env")),
    anon_key: anon,
    root_admin_password: Boolean(env.ROOT_ADMIN_PASSWORD),
    vite_insforge_url: Boolean(web.VITE_INSFORGE_URL),
  };
}
