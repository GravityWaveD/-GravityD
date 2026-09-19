import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parseArgv } from "../lib/args.mjs";
import { collectMenuIdsFromSql, nextMenuBlock } from "../lib/menu.mjs";
import { ident, moduleNames } from "../lib/names.mjs";
import { looksLikeGravityd } from "../lib/project.mjs";

const bin = fileURLToPath(new URL("../bin/gravityd.mjs", import.meta.url));

function run(args, { cwd, env } = {}) {
  const merged = { ...process.env, GRAVITYD_FORMAT: "json", ...env };
  if (!env || !Object.prototype.hasOwnProperty.call(env, "GRAVITYD_ROOT")) {
    delete merged.GRAVITYD_ROOT;
  }
  return spawnSync(process.execPath, [bin, "--json", ...args], {
    cwd,
    encoding: "utf8",
    env: merged,
  });
}

function parseOut(result) {
  const text = result.stdout.trim();
  assert.ok(text, `stdout empty. stderr=${result.stderr}`);
  return JSON.parse(text.split("\n").filter(Boolean).at(-1));
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), "gravityd-cli-"));
  mkdirSync(join(root, "insforge-app", "migrations"), { recursive: true });
  mkdirSync(join(root, "frontend", "web", "src", "api"), { recursive: true });
  mkdirSync(join(root, "frontend", "web", "src", "views"), { recursive: true });
  mkdirSync(join(root, "scripts"), { recursive: true });
  writeFileSync(join(root, "scripts", "lib.sh"), "# fixture\n");
  writeFileSync(
    join(root, "insforge-app", "migrations", "006_brand_gravityd.sql"),
    "-- brand\nDELETE FROM public.sys_menu WHERE id >= 90 AND id < 100;\nINSERT INTO public.sys_menu VALUES\n  (94, 'x', 2);\n"
  );
  return root;
}

test("parseArgv maps insforge-style flags", () => {
  const { flags, positionals } = parseArgv([
    "node",
    "gravityd",
    "link",
    "--project-id",
    "local",
    "-y",
    "--dry-run",
  ]);
  assert.equal(positionals[0], "link");
  assert.equal(flags.projectId, "local");
  assert.equal(flags.yes, true);
  assert.equal(flags.dryRun, true);
});

test("ident rejects uppercase domain", () => {
  assert.throws(() => ident("CRM", "domain"));
});

test("moduleNames builds perm and table", () => {
  const n = moduleNames({ domain: "crm", resource: "customer", title: "客户" });
  assert.equal(n.table, "crm_customer");
  assert.equal(n.permPrefix, "module_crm:customer");
  assert.equal(n.routeName, "CrmCustomer");
  assert.equal(n.componentPath, "module_crm/customer/index");
});

test("nextMenuBlock skips used 90s and starts at 100", () => {
  const ids = collectMenuIdsFromSql("DELETE FROM public.sys_menu WHERE id >= 90 AND id < 100;\n(94, 'x',");
  assert.equal(nextMenuBlock(ids), 100);
  assert.equal(nextMenuBlock([100, 108]), 110);
});

test("schema lists link", () => {
  const result = run(["schema"]);
  const body = parseOut(result);
  assert.equal(result.status, 0);
  assert.equal(body.ok, true);
  assert.ok(body.data.commands.some((c) => c.method === "link"));
});

test("unknown command is validation exit 3", () => {
  const result = run(["nope"]);
  const body = parseOut(result);
  assert.equal(result.status, 3);
  assert.equal(body.ok, false);
  assert.equal(body.error.code, "validation_error");
});

test("outside repo is not_gravityd", () => {
  const dir = mkdtempSync(join(tmpdir(), "not-gd-"));
  const result = run(["current"], { cwd: dir, env: { GRAVITYD_ROOT: "" } });
  const body = parseOut(result);
  assert.equal(result.status, 3);
  assert.equal(body.error.code, "not_gravityd");
});

test("link + current + module add dry-run + write", () => {
  const root = fixture();
  assert.equal(looksLikeGravityd(root), true);

  const linked = run(["link", "--project-id", "demo-app", "--url", "http://127.0.0.1:7130", "-y"], {
    cwd: root,
  });
  const linkBody = parseOut(linked);
  assert.equal(linked.status, 0, linked.stderr);
  assert.equal(linkBody.data.project_id, "demo-app");
  assert.ok(existsSync(join(root, ".gravityd", "project.json")));
  const saved = JSON.parse(readFileSync(join(root, ".gravityd", "project.json"), "utf8"));
  assert.equal(saved.api_key, undefined);
  assert.equal(saved.appkey, undefined);

  const cur = parseOut(run(["current"], { cwd: root }));
  assert.equal(cur.data.project_id, "demo-app");

  const dry = parseOut(
    run(
      [
        "module",
        "add",
        "--domain",
        "crm",
        "--resource",
        "customer",
        "--title",
        "客户",
        "--fields",
        "mobile:text",
        "--dry-run",
      ],
      { cwd: root }
    )
  );
  assert.equal(dry.data.table, "crm_customer");
  assert.equal(dry.data.menu_id, 100);
  assert.equal(dry.data.dry_run, true);
  assert.equal(existsSync(join(root, "insforge-app", "migrations", "007_crm_customer.sql")), false);

  const wrote = run(
    [
      "module",
      "add",
      "--domain",
      "crm",
      "--resource",
      "customer",
      "--title",
      "客户",
      "--fields",
      "mobile:text",
    ],
    { cwd: root }
  );
  const body = parseOut(wrote);
  assert.equal(wrote.status, 0, wrote.stderr + wrote.stdout);
  const sqlPath = join(root, body.data.files.sql);
  const apiPath = join(root, body.data.files.api);
  const vuePath = join(root, body.data.files.vue);
  const sql = readFileSync(sqlPath, "utf8");
  const api = readFileSync(apiPath, "utf8");
  const vue = readFileSync(vuePath, "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS public\.crm_customer/);
  assert.match(sql, /mobile TEXT,\n  owner_id UUID/);
  assert.match(sql, /id >= 100 AND id < 110/);
  assert.match(sql, /NOTIFY pgrst/);
  assert.match(sql, /sort_order INTEGER/);
  assert.match(sql, /current_user_id/);
  assert.match(api, /serverPageOf/);
  assert.match(api, /unwrap\(/);
  assert.match(api, /count:\s*['"]exact['"]/);
  assert.match(vue, /prop: "mobile"/);
  assert.match(vue, /sort_order/);
  assert.match(vue, /module_crm:customer:create/);
  assert.match(vue, /name: "CrmCustomer"/);

  const forbidden = parseOut(run(["migrate", "apply", "--file", "002_seed_system.sql"], { cwd: root }));
  assert.equal(forbidden.ok, false);
  assert.equal(forbidden.error.code, "forbidden_migration");
});

test("module add without link is exit 2", () => {
  const root = fixture();
  const result = run(
    ["module", "add", "--domain", "crm", "--resource", "customer", "--title", "客户", "--dry-run"],
    { cwd: root }
  );
  const body = parseOut(result);
  assert.equal(result.status, 2);
  assert.equal(body.error.code, "not_linked");
});
