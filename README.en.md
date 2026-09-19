<div align="center">
  <img src="./frontend/web/public/logo.png" width="128" height="128" alt="GravityD" />
  <h1>GravityD</h1>
  <p>Admin scaffold for every product in the org.</p>
  <p>Vue3 + TypeScript + self-hosted InsForge</p>
</div>

[简体中文](./README.md) | English

Developer handbook (Chinese): [docs/开发指南.md](docs/开发指南.md). Agent conventions: [`.cursor/skills/base-server-app`](.cursor/skills/base-server-app/SKILL.md).

## Quick start

Do not stop other people’s containers on `5432` / `6379`. InsForge Postgres listens on `5433`.

```bash
bash scripts/init.sh
bash scripts/dev.sh
```

| App | URL | Account |
|-----|-----|---------|
| Admin | http://127.0.0.1:5180/web | `admin@local.dev` / `123456` |
| InsForge console | http://127.0.0.1:7130 | `admin` + `ROOT_ADMIN_PASSWORD` in `insforge/.env` |

## Deploy

```bash
bash scripts/init.sh      # first time on the host
bash scripts/deploy.sh    # incremental SQL + frontend/web/dist
```

Point Nginx at `frontend/web/dist`. Set public `VITE_INSFORGE_URL` / `VITE_INSFORGE_ANON_KEY` in `.env.production` and rebuild.

Do **not** re-run `002_seed_system.sql`. Do **not** run the official InsForge `setup.sh` at the repo root.

New business menus start at id `100`. See `.cursor/skills/base-server-app`.

CLI usage (Chinese): [docs/gravityd-cli.md](docs/gravityd-cli.md). Analog of `npx @insforge/cli link --project-id <id>`:

```bash
npx --yes ./packages/gravityd-cli link --project-id local -y
npx --yes ./packages/gravityd-cli module add --domain crm --resource customer --title Customer --dry-run
```
