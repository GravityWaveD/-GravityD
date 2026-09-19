import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MENU_BLOCK_SIZE, MENU_BUSINESS_START } from "./constants.mjs";

export function collectMenuIdsFromSql(sql) {
  const ids = [];
  for (const m of sql.matchAll(/\bid\s*>=\s*(\d+)/g)) ids.push(Number(m[1]));
  for (const m of sql.matchAll(/\bmenu_id\s*>=\s*(\d+)/g)) ids.push(Number(m[1]));
  for (const m of sql.matchAll(/^\s*\((\d+),\s*'/gm)) ids.push(Number(m[1]));
  return ids;
}

export function listMigrationFiles(root) {
  const dir = join(root, "insforge-app", "migrations");
  return readdirSync(dir)
    .filter((name) => /^\d+_.*\.sql$/.test(name))
    .sort();
}

export function nextMigrationNumber(root) {
  let max = 0;
  for (const name of listMigrationFiles(root)) {
    const n = Number(name.slice(0, 3));
    if (Number.isInteger(n) && n > max) max = n;
  }
  return max + 1;
}

export function padMigration(n) {
  return String(n).padStart(3, "0");
}

export function usedMenuIds(root) {
  const dir = join(root, "insforge-app", "migrations");
  const ids = [];
  for (const name of listMigrationFiles(root)) {
    const sql = readFileSync(join(dir, name), "utf8");
    ids.push(...collectMenuIdsFromSql(sql));
  }
  return ids;
}

export function nextMenuBlock(used, start = MENU_BUSINESS_START, size = MENU_BLOCK_SIZE) {
  let n = start;
  while (used.some((id) => id >= n && id < n + size)) n += size;
  return n;
}

export function menuRange(menuId, size = MENU_BLOCK_SIZE) {
  return { start: menuId, end: menuId + size };
}

export function assertMenuId(menuId, used, { force = false } = {}) {
  if (!Number.isInteger(menuId) || menuId < MENU_BUSINESS_START) {
    const err = new Error(`menu-id 必须是 >= ${MENU_BUSINESS_START} 的整数`);
    err.code = "validation_error";
    err.field = "menuId";
    throw err;
  }
  if (menuId % MENU_BLOCK_SIZE !== 0) {
    const err = new Error(`menu-id 必须是 ${MENU_BLOCK_SIZE} 的倍数（一段预留 ${MENU_BLOCK_SIZE} 个 id）`);
    err.code = "validation_error";
    err.field = "menuId";
    throw err;
  }
  const { start, end } = menuRange(menuId);
  const overlap = used.filter((id) => id >= start && id < end);
  if (overlap.length && !force) {
    const err = new Error(`菜单 id ${start}–${end - 1} 已在迁移里出现: ${overlap.slice(0, 8).join(", ")}`);
    err.code = "conflict";
    err.field = "menuId";
    err.hint = "换一段 --menu-id，或确认后加 --force";
    throw err;
  }
  return { start, end };
}
