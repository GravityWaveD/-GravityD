import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, resolve } from "node:path";
import { CONFIG_DIR, CONFIG_FILE, MARKERS } from "./constants.mjs";
import { fail } from "./io.mjs";

export function looksLikeGravityd(root) {
  return (
    existsSync(join(root, MARKERS.migrations)) &&
    existsSync(join(root, MARKERS.web)) &&
    existsSync(join(root, MARKERS.libsh))
  );
}

export function findGravitydRoot(startDir = process.cwd()) {
  const override = process.env.GRAVITYD_ROOT;
  if (override) {
    const abs = resolve(override);
    if (looksLikeGravityd(abs)) return abs;
    throw fail("not_gravityd", `GRAVITYD_ROOT 不是 GravityD 根目录: ${abs}`, {
      field: "GRAVITYD_ROOT",
    });
  }

  let dir = resolve(startDir);
  while (true) {
    if (looksLikeGravityd(dir)) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw fail(
    "not_gravityd",
    "当前目录不是 GravityD 项目（缺少 insforge-app/migrations、frontend/web、scripts/lib.sh）",
    { hint: "请在 GravityD 仓库根目录或其子目录执行，或设置 GRAVITYD_ROOT" }
  );
}

export function configPath(root) {
  return join(root, CONFIG_DIR, CONFIG_FILE);
}

export function readJson(file) {
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    throw fail("runtime_error", `无法解析 JSON: ${file}`);
  }
}

export function writeJson(file, data) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function readProject(root) {
  return readJson(configPath(root));
}

export function requireProject(root) {
  const project = readProject(root);
  if (!project?.project_id) {
    throw fail("not_linked", "尚未 link 到 GravityD 项目", {
      hint: "npx --yes ./packages/gravityd-cli link --project-id local -y",
    });
  }
  return project;
}

export function writeProject(root, project) {
  const payload = {
    schema_version: "1.0.0",
    project_id: project.project_id,
    name: project.name || "GravityD",
    root: root,
    insforge_url: project.insforge_url,
    linked_at: project.linked_at || new Date().toISOString(),
    paths: {
      insforge: "insforge",
      migrations: MARKERS.migrations,
      web: MARKERS.web,
    },
  };
  writeJson(configPath(root), payload);
  return payload;
}

export function unlinkProject(root) {
  const file = configPath(root);
  if (!existsSync(file)) return false;
  rmSync(file);
  return true;
}

export function idempotencyPath(root) {
  return join(root, CONFIG_DIR, "idempotency.json");
}

export function readIdempotency(root, key) {
  if (!key) return null;
  const map = readJson(idempotencyPath(root)) || {};
  return map[key] || null;
}

export function writeIdempotency(root, key, data) {
  if (!key) return;
  const file = idempotencyPath(root);
  const map = readJson(file) || {};
  map[key] = { at: new Date().toISOString(), data };
  writeJson(file, map);
}

export function resolveExistingRoot(startDir = process.cwd()) {
  try {
    return findGravitydRoot(startDir);
  } catch (err) {
    if (err.code === "not_gravityd") {
      const dir = resolve(startDir);
      const cfg = join(dir, CONFIG_DIR, CONFIG_FILE);
      if (existsSync(cfg)) {
        const project = readJson(cfg);
        if (project?.root && looksLikeGravityd(project.root)) return project.root;
      }
    }
    throw err;
  }
}

export function absPath(root, rel) {
  return isAbsolute(rel) ? rel : join(root, rel);
}
