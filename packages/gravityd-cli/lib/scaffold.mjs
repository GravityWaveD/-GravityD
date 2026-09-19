import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { asInt } from "./args.mjs";
import { fail } from "./io.mjs";
import { MENU_BLOCK_SIZE } from "./constants.mjs";
import { assertMenuId, menuRange, nextMenuBlock, nextMigrationNumber, padMigration, usedMenuIds } from "./menu.mjs";
import { moduleNames, parseFields } from "./names.mjs";
import { generateApi, generateSql } from "./scaffold-sql-api.mjs";
import { generateVue } from "./scaffold-vue.mjs";

export function planModule(root, flags) {
  const names = moduleNames({
    domain: flags.domain,
    resource: flags.resource,
    title: flags.title,
    dirTitle: flags.dirTitle,
  });
  const fields = parseFields(flags.fields);
  const used = usedMenuIds(root);
  const menuId =
    asInt(flags.menuId, "menuId") ?? nextMenuBlock(used);
  const range = assertMenuId(menuId, used, { force: Boolean(flags.force) });
  const migNo = nextMigrationNumber(root);
  const migName = `${padMigration(migNo)}_${names.migrationStem}.sql`;

  const ctx = {
    ...names,
    fields,
    menuId,
    range,
    dirIcon: flags.dirIcon || "ri:briefcase-line",
    pageIcon: flags.pageIcon || "ri:file-list-line",
    dirOrder: asInt(flags.dirOrder, "dirOrder") ?? 10,
  };

  const files = {
    sql: join(root, "insforge-app", "migrations", migName),
    api: join(root, "frontend", "web", "src", "api", `module_${names.domain}`, `${names.resource}.ts`),
    vue: join(
      root,
      "frontend",
      "web",
      "src",
      "views",
      `module_${names.domain}`,
      names.resource,
      "index.vue"
    ),
  };

  return {
    ctx,
    files,
    contents: {
      sql: generateSql(ctx),
      api: generateApi(ctx),
      vue: generateVue(ctx),
    },
    existing: {
      sql: existsSync(files.sql),
      api: existsSync(files.api),
      vue: existsSync(files.vue),
    },
    hashRoute: `/#/${names.domain}/${names.resource}`,
    menuBlockSize: MENU_BLOCK_SIZE,
    menuRange: menuRange(menuId),
  };
}

export function writePlan(root, plan, { force = false } = {}) {
  const written = [];
  for (const [key, file] of Object.entries(plan.files)) {
    const rel = relative(root, file);
    if (plan.existing[key] && !force) {
      throw fail("already_exists", `已存在 ${rel}，加 --force 覆盖`, { field: key });
    }
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, plan.contents[key], "utf8");
    written.push(rel);
  }
  return written;
}

export function relativeFiles(root, plan) {
  return {
    sql: relative(root, plan.files.sql),
    api: relative(root, plan.files.api),
    vue: relative(root, plan.files.vue),
  };
}
