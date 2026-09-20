import { basename, isAbsolute, join } from "node:path";
import { existsSync } from "node:fs";
import { CLI_VERSION, DEFAULT_INSFORGE_URL, DEFAULT_PROJECT_ID, FORBIDDEN_MIGRATIONS } from "../lib/constants.mjs";
import {
  insforgeUrlFromEnv,
  postgresPortFromEnv,
  secretsPresent,
  composeProjectFromEnv,
  normalizeProvider,
  writeWebProviderEnv,
} from "../lib/env.mjs";
import { spawnSync } from "node:child_process";
import { fail, printHumanLines } from "../lib/io.mjs";
import {
  findGravitydRoot,
  readIdempotency,
  readProject,
  requireProject,
  unlinkProject,
  writeIdempotency,
  writeProject,
} from "../lib/project.mjs";
import { listCommands, commandSchema, helpText, SCHEMA_VERSION } from "../lib/schema.mjs";
import { applySqlFile, insforgeUp, pingHttp, pingTcp } from "../lib/docker.mjs";
import { listMigrationFiles, nextMenuBlock, nextMigrationNumber, padMigration, usedMenuIds } from "../lib/menu.mjs";
import { planModule, relativeFiles, writePlan } from "../lib/scaffold.mjs";

export function cmdHelp(io, name) {
  const text = helpText(name);
  if (io.json) {
    return io.writeOk({ text, command: name || null }, text);
  }
  return io.writeOk({ text }, text);
}

export function cmdVersion(io) {
  const data = { name: "@gravityd/cli", version: CLI_VERSION, schema_version: SCHEMA_VERSION };
  return io.writeOk(data, `gravityd ${CLI_VERSION}`);
}

export function cmdSchema(io, name) {
  if (!name) {
    const data = { schema_version: SCHEMA_VERSION, commands: listCommands() };
    return io.writeOk(data, helpText());
  }
  const key = name.includes(".") ? name : name === "module" ? "module.add" : name === "migrate" ? "migrate.apply" : name;
  const cmd = commandSchema(key);
  if (!cmd) throw fail("validation_error", `未知命令: ${name}`, { field: "command" });
  return io.writeOk(cmd, helpText(key));
}

export function cmdLink(io, flags, cwd) {
  const root = findGravitydRoot(cwd);
  const projectId = String(flags.projectId || DEFAULT_PROJECT_ID).trim();
  if (!projectId) throw fail("validation_error", "缺少 --project-id", { field: "projectId" });
  if (!/^[a-zA-Z0-9._-]{1,64}$/.test(projectId)) {
    throw fail("validation_error", "project-id 只允许字母数字、点、下划线、短横线", { field: "projectId" });
  }

  const existing = readProject(root);
  if (existing?.project_id && existing.project_id !== projectId && !io.yes && !io.force) {
    throw fail("conflict", `已 link 到 ${existing.project_id}，换项目请加 -y`, {
      field: "projectId",
      hint: `gravityd link --project-id ${projectId} -y`,
    });
  }

  const url = (flags.url || insforgeUrlFromEnv(root, DEFAULT_INSFORGE_URL)).replace(/\/$/, "");
  const provider = flags.provider
    ? normalizeProvider(flags.provider)
    : normalizeProvider(existing?.provider || "insforge");
  if (io.dryRun) {
    const data = { root, project_id: projectId, insforge_url: url, provider, dry_run: true };
    return io.writeOk(
      data,
      printHumanLines([
        `[dry-run] 将写入 ${root}/.gravityd/project.json`,
        `project_id: ${projectId}`,
        `provider: ${provider}`,
        `insforge_url: ${url}`,
      ])
    );
  }

  const cached = readIdempotency(root, flags.idempotencyKey);
  if (cached?.data) return io.writeOk(cached.data, formatLink(cached.data, true));

  const project = writeProject(root, {
    project_id: projectId,
    name: flags.name || "GravityD",
    insforge_url: url,
    provider,
  });
  const envFile = writeWebProviderEnv(root, provider);
  project.env_file = envFile.replace(`${root}/`, "");
  writeIdempotency(root, flags.idempotencyKey, project);
  return io.writeOk(project, formatLink(project, false));
}

function formatLink(project, replay) {
  return printHumanLines([
    replay ? "已存在相同 idempotency-key，返回上次 link 结果" : `已链接 GravityD 项目 ${project.project_id}`,
    `  根目录: ${project.root}`,
    `  提供商: ${project.provider || "insforge"}`,
    `  InsForge: ${project.insforge_url}`,
    `  配置: .gravityd/project.json（已 gitignore，不含密钥）`,
  ]);
}

/**
 * 按 --provider 调用 scripts/init.sh。dry-run 只预览，不拉 Docker。
 * @param {{ json: boolean, dryRun: boolean, writeOk: Function }} io CLI IO
 * @param {{ provider?: string }} flags 命令行参数
 * @param {string} cwd 当前工作目录
 */
export function cmdInit(io, flags, cwd) {
  const root = findGravitydRoot(cwd);
  const provider = normalizeProvider(flags.provider, "insforge");
  const script = join(root, "scripts", "init.sh");
  if (!existsSync(script)) {
    throw fail("runtime_error", "找不到 scripts/init.sh");
  }
  if (io.dryRun) {
    return io.writeOk(
      { root, provider, dry_run: true, script: "scripts/init.sh" },
      `[dry-run] bash scripts/init.sh --provider=${provider}`
    );
  }
  const result = spawnSync("bash", [script, `--provider=${provider}`], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.status !== 0) {
    throw fail("runtime_error", (result.stderr || result.stdout || "init.sh 失败").trim(), {
      hint: `bash scripts/init.sh --provider=${provider}`,
    });
  }
  return io.writeOk(
    { root, provider, stdout: result.stdout },
    result.stdout || `已按 ${provider} 完成初始化`
  );
}

export function cmdUnlink(io, cwd) {
  const root = findGravitydRoot(cwd);
  if (!io.yes) {
    throw fail("validation_error", "unlink 需要 -y", { hint: "gravityd unlink -y" });
  }
  if (io.dryRun) {
    return io.writeOk({ root, dry_run: true }, `[dry-run] 将删除 ${root}/.gravityd/project.json`);
  }
  const existed = unlinkProject(root);
  return io.writeOk({ root, unlinked: existed }, existed ? "已取消 link" : "本来就没有 link");
}

export function cmdCurrent(io, cwd) {
  const root = findGravitydRoot(cwd);
  const project = requireProject(root);
  return io.writeOk(project, printHumanLines([
    `project_id: ${project.project_id}`,
    `root: ${project.root}`,
    `provider: ${project.provider || "insforge"}`,
    `insforge_url: ${project.insforge_url}`,
    `linked_at: ${project.linked_at}`,
  ]));
}

export async function cmdStatus(io, cwd) {
  const root = findGravitydRoot(cwd);
  const project = readProject(root);
  const url = project?.insforge_url || insforgeUrlFromEnv(root);
  const pgPort = postgresPortFromEnv(root);
  const secrets = secretsPresent(root);
  const [http, tcp] = await Promise.all([pingHttp(url), pingTcp("127.0.0.1", pgPort)]);
  const used = usedMenuIds(root);
  const data = {
    root,
    linked: Boolean(project?.project_id),
    project_id: project?.project_id || null,
    provider: project?.provider || "insforge",
    insforge_url: url,
    insforge_http: http,
    postgres: { host: "127.0.0.1", port: pgPort, ...tcp },
    compose_project: composeProjectFromEnv(root),
    secrets_present: secrets,
    next_menu_id: nextMenuBlock(used),
    next_migration: `${padMigration(nextMigrationNumber(root))}_*.sql`,
    admin: { url: "http://127.0.0.1:5180/web", account: "admin@local.dev" },
  };
  return io.writeOk(
    data,
    printHumanLines([
      `root: ${root}`,
      `linked: ${data.linked ? data.project_id : "no"}`,
      `provider: ${data.provider}`,
      `insforge: ${url}  ${http.ok ? `HTTP ${http.status}` : http.error || "down"}`,
      `postgres: 127.0.0.1:${pgPort}  ${tcp.ok ? "up" : tcp.error || "down"}`,
      `anon_key: ${secrets.anon_key ? "present" : "missing"}`,
      `next menu: ${data.next_menu_id}`,
      `next migration: ${data.next_migration}`,
    ])
  );
}

export async function cmdUp(io, cwd) {
  const root = findGravitydRoot(cwd);
  requireProject(root);
  if (io.dryRun) {
    return io.writeOk({ root, dry_run: true, script: "scripts/insforge-up.sh" }, "[dry-run] bash scripts/insforge-up.sh");
  }
  const result = await insforgeUp(root);
  return io.writeOk({ root, ...result }, result.stdout || "InsForge is up");
}

export async function cmdModuleAdd(io, flags, cwd) {
  if (!flags.domain || !flags.resource || !flags.title) {
    throw fail("validation_error", "module add 需要 --domain --resource --title", {
      hint: "gravityd module add --domain crm --resource customer --title 客户 --dry-run",
    });
  }
  const root = findGravitydRoot(cwd);
  requireProject(root);
  const plan = planModule(root, flags);
  const rel = relativeFiles(root, plan);
  const data = {
    domain: plan.ctx.domain,
    resource: plan.ctx.resource,
    table: plan.ctx.table,
    title: plan.ctx.title,
    menu_id: plan.ctx.menuId,
    menu_range: `${plan.menuRange.start}-${plan.menuRange.end - 1}`,
    files: rel,
    hash_route: `http://127.0.0.1:5180/web${plan.hashRoute}`,
    apply: Boolean(flags.apply),
    dry_run: io.dryRun,
  };

  if (io.dryRun) {
    return io.writeOk(
      { ...data, preview: { sql_head: plan.contents.sql.split("\n").slice(0, 8).join("\n") } },
      printHumanLines([
        `[dry-run] ${plan.ctx.dirTitle} / ${plan.ctx.title}`,
        `  SQL  ${rel.sql}`,
        `  API  ${rel.api}`,
        `  Vue  ${rel.vue}`,
        `  菜单 ${data.menu_range}`,
        `  路由 ${data.hash_route}`,
      ])
    );
  }

  const cached = readIdempotency(root, flags.idempotencyKey);
  if (cached?.data) return io.writeOk(cached.data, "idempotency-key 命中，未再次写文件");

  const written = writePlan(root, plan, { force: io.force });
  data.written = written;

  if (flags.apply) {
    const applied = await applySqlFile(root, plan.files.sql);
    data.applied = true;
    data.psql = applied;
  } else {
    data.applied = false;
    data.apply_hint = `gravityd migrate apply --file ${rel.sql}`;
  }

  writeIdempotency(root, flags.idempotencyKey, data);
  return io.writeOk(
    data,
    printHumanLines([
      `已生成 ${plan.ctx.dirTitle} / ${plan.ctx.title}`,
      ...written.map((f) => `  ${f}`),
      `  菜单 ${data.menu_range}`,
      data.applied ? "  已 apply SQL" : `  未 apply。下一步: ${data.apply_hint}`,
      "  重新登录后侧栏才会出现新菜单。",
    ])
  );
}

function isForbiddenMigration(name) {
  const base = basename(name || "");
  return FORBIDDEN_MIGRATIONS.has(base) || /^002_/.test(base);
}

export async function cmdMigrateApply(io, flags, cwd, fileArg) {
  const root = findGravitydRoot(cwd);
  requireProject(root);
  const spec = flags.file || fileArg;
  if (spec && isForbiddenMigration(spec)) {
    throw fail("forbidden_migration", "禁止应用 002_seed_system.sql（会 TRUNCATE 业务表）", {
      field: "file",
    });
  }
  const file = resolveMigrationFile(root, flags, fileArg);
  const base = basename(file);
  if (isForbiddenMigration(base)) {
    throw fail("forbidden_migration", "禁止应用 002_seed_system.sql（会 TRUNCATE 业务表）", {
      field: "file",
    });
  }
  if (io.dryRun) {
    return io.writeOk({ file, dry_run: true }, `[dry-run] docker compose exec psql < ${base}`);
  }
  const result = await applySqlFile(root, file);
  return io.writeOk({ file, ...result }, `已应用 ${base}`);
}

function resolveMigrationFile(root, flags, fileArg) {
  const spec = flags.file || fileArg;
  if (flags.latest && spec) {
    throw fail("validation_error", "--latest 和 --file 不能一起用");
  }
  if (flags.latest) {
    const files = listMigrationFiles(root).filter((n) => !FORBIDDEN_MIGRATIONS.has(n) && !n.startsWith("002_"));
    if (!files.length) throw fail("validation_error", "没有可应用的迁移文件");
    return join(root, "insforge-app", "migrations", files[files.length - 1]);
  }
  if (!spec) throw fail("validation_error", "migrate apply 需要 --file 或 --latest", { field: "file" });
  if (isAbsolute(spec) || spec.includes("/")) {
    if (!existsSync(spec)) {
      const under = join(root, spec);
      if (existsSync(under)) return under;
      throw fail("validation_error", `找不到 SQL: ${spec}`, { field: "file" });
    }
    return spec;
  }
  const under = join(root, "insforge-app", "migrations", spec);
  if (!existsSync(under)) throw fail("validation_error", `找不到 SQL: ${spec}`, { field: "file" });
  return under;
}
