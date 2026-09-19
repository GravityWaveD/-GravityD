import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_INSFORGE_URL, DEFAULT_POSTGRES_PORT } from "./constants.mjs";

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
