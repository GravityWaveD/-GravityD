# @gravityd/cli

GravityD 二次开发 CLI。完整说明：[docs/gravityd-cli.md](../../docs/gravityd-cli.md)。

对标 `npx @insforge/cli link --project-id <project-id>`。自托管没有云端项目，`link` 只写 `.gravityd/project.json`（不含密钥）。

## 快速开始

```bash
npx --yes ./packages/gravityd-cli link --project-id local -y
npx --yes ./packages/gravityd-cli status
npx --yes ./packages/gravityd-cli module add --domain crm --resource customer --title 客户 --dry-run
```

等价入口：`node packages/gravityd-cli/bin/gravityd.mjs`、`bash scripts/gravityd`。

```bash
gravityd current
gravityd up
gravityd module add --domain crm --resource customer --title 客户
gravityd migrate apply --file 007_crm_customer.sql
gravityd schema module.add
```

**禁止** `migrate apply --file 002_seed_system.sql`。`.gravityd/` 已 gitignore。

非 TTY 或 `--json` 时 stdout 为 `{ ok, data|error }`。退出码：`0` 成功 / `1` 运行时 / `2` 未 link / `3` 校验失败。
