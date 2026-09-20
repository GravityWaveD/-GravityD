import { CLI_VERSION, SCHEMA_VERSION } from "./constants.mjs";

const globalFlags = {
  json: { type: "boolean", description: "强制 stdout JSON 信封" },
  format: { type: "string", enum: ["json", "text"], description: "输出格式；非 TTY 默认 json" },
  yes: { type: "boolean", aliases: ["-y"], description: "非交互确认" },
  "dry-run": { type: "boolean", description: "只预览，不写文件 / 不执行" },
  force: { type: "boolean", aliases: ["-f"], description: "覆盖已有文件或菜单段" },
  "idempotency-key": { type: "string", description: "相同 key 的成功结果可直接回放" },
  help: { type: "boolean", aliases: ["-h"], description: "显示帮助" },
};

export const COMMANDS = {
  schema: {
    method: "schema",
    since: "0.1.0",
    safety: "read",
    description: "自描述：列出命令或某个 command 的参数 schema",
    usage: "gravityd schema [command]",
    params: {
      command: { type: "string", required: false, description: "如 link、module.add" },
    },
  },
  link: {
    method: "link",
    since: "0.1.0",
    safety: "write-local",
    description: "把当前 GravityD 仓库写成 .gravityd/project.json（对标 insforge link，不写入密钥）",
    usage: "gravityd link --project-id <id> [--provider=insforge|firebase] [--url <insforge>] [-y]",
    params: {
      "project-id": { type: "string", required: true, description: "本地项目标识，自托管默认 local" },
      provider: {
        type: "string",
        enum: ["insforge", "firebase"],
        required: false,
        description: "初始化后端提供商，默认 insforge；会写入 project.json 与 frontend/web/.env.development",
      },
      url: { type: "string", required: false, description: "InsForge 网关，默认读 insforge/.env 的 API_BASE_URL" },
      name: { type: "string", required: false, description: "显示名，默认 GravityD" },
    },
  },
  init: {
    method: "init",
    since: "0.1.0",
    safety: "write-runtime",
    description: "按选定 BaaS 提供商执行 scripts/init.sh（InsForge 拉栈，Firebase 只写环境模板）",
    usage: "gravityd init [--provider=insforge|firebase] [--dry-run]",
    params: {
      provider: {
        type: "string",
        enum: ["insforge", "firebase"],
        required: false,
        description: "后端提供商，默认 insforge",
      },
    },
  },
  unlink: {
    method: "unlink",
    since: "0.1.0",
    safety: "destructive-local",
    description: "删除 .gravityd/project.json",
    usage: "gravityd unlink -y",
    params: {},
  },
  current: {
    method: "current",
    since: "0.1.0",
    safety: "read",
    description: "显示当前 link 的项目（不含密钥）",
    usage: "gravityd current",
    params: {},
  },
  status: {
    method: "status",
    since: "0.1.0",
    safety: "read",
    description: "检查 link、InsForge、Postgres 端口、密钥是否存在、下一菜单段",
    usage: "gravityd status",
    params: {},
  },
  doctor: {
    method: "doctor",
    since: "0.1.0",
    safety: "read",
    description: "status 的别名",
    usage: "gravityd doctor",
    params: {},
    alias_of: "status",
  },
  up: {
    method: "up",
    since: "0.1.0",
    safety: "write-runtime",
    description: "拉起已有 insforge compose（scripts/insforge-up.sh）",
    usage: "gravityd up",
    params: {},
  },
  "module.add": {
    method: "module.add",
    since: "0.1.0",
    safety: "write-repo",
    description: "按岗位模块约定生成 SQL / API / Vue CRUD 脚手架",
    usage:
      "gravityd module add --domain crm --resource customer --title 客户 [--menu-id 100] [--dry-run] [--apply]",
    params: {
      domain: { type: "string", required: true, description: "域，如 crm" },
      resource: { type: "string", required: true, description: "资源，如 customer" },
      title: { type: "string", required: true, description: "页面中文名" },
      "dir-title": { type: "string", required: false, description: "侧栏目录名，默认 DOMAIN 大写" },
      "menu-id": { type: "integer", required: false, description: "目录 id，必须 >=100 且为 10 的倍数" },
      fields: {
        type: "string",
        required: false,
        description: "额外列，逗号分隔 name:type，如 mobile:text,email:text",
      },
      "dir-icon": { type: "string", required: false, default: "ri:briefcase-line" },
      "page-icon": { type: "string", required: false, default: "ri:file-list-line" },
      apply: { type: "boolean", required: false, description: "写完后用 docker compose exec psql 套这条 SQL" },
    },
  },
  "migrate.apply": {
    method: "migrate.apply",
    since: "0.1.0",
    safety: "write-runtime",
    description: "对 InsForge Postgres 应用一条迁移。禁止 002_seed_system.sql",
    usage: "gravityd migrate apply --file 007_crm_customer.sql",
    params: {
      file: { type: "string", required: false, description: "migrations 下文件名或绝对路径" },
      latest: { type: "boolean", required: false, description: "应用编号最大的那条（仍拒绝 002）" },
    },
  },
};

export function commandSchema(name) {
  const key = name === "doctor" ? "doctor" : name;
  return COMMANDS[key] || null;
}

export function listCommands() {
  return Object.values(COMMANDS).map((cmd) => ({
    method: cmd.method,
    safety: cmd.safety,
    description: cmd.description,
    usage: cmd.usage,
    since: cmd.since,
    deprecated: false,
  }));
}

export function helpText(name) {
  if (!name) {
    return [
      `gravityd ${CLI_VERSION}  GravityD 二次开发 CLI（schema ${SCHEMA_VERSION}）`,
      "",
      "对标: npx @insforge/cli link --project-id <id>",
      "本命令: npx --yes ./packages/gravityd-cli link --project-id local -y",
      "",
      "命令:",
      "  schema [command]     自描述",
      "  link                 绑定当前仓库（写 .gravityd/project.json，不含密钥）",
      "  init                 按 --provider 执行 scripts/init.sh",
      "  unlink               取消绑定",
      "  current              查看绑定",
      "  status | doctor      健康检查",
      "  up                   启动 InsForge",
      "  module add           生成业务模块脚手架",
      "  migrate apply        应用一条 SQL 迁移",
      "",
      "全局: --json  --format json|text  -y  --dry-run  --force  --idempotency-key",
      "退出码: 0 成功 / 1 运行时 / 2 未 link / 3 校验失败",
      "",
      "密钥只存在 insforge/.env 与 frontend/web/.env*，不要写进 project.json，不要提交 git。",
    ].join("\n");
  }
  const cmd = commandSchema(name);
  if (!cmd) return `未知命令: ${name}`;
  const params = Object.entries(cmd.params || {})
    .map(([k, v]) => `  --${k.padEnd(16)} ${v.required ? "(必填)" : "(可选)"} ${v.description}`)
    .join("\n");
  return [`${cmd.usage}`, "", cmd.description, params ? `\n参数:\n${params}` : ""].join("\n");
}

export { SCHEMA_VERSION, CLI_VERSION, globalFlags };
