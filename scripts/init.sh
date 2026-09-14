#!/usr/bin/env bash
# GravityD 本地初始化：InsForge + 系统表 + 超管 + 前端环境变量
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

need_cmd docker
need_cmd curl
docker info >/dev/null 2>&1 || die "Docker 引擎未运行，请先打开 Docker Desktop"
docker compose version >/dev/null 2>&1 || die "需要 Docker Compose 插件"

log "不要停止本机已有的 5432 / 6379 等容器。InsForge Postgres 使用 5433。"

ensure_insforge_clone
ensure_insforge_env
insforge_up
wait_insforge
apply_schema

if [[ -x "$ROOT/insforge-app/scripts/seed-admin.sh" ]]; then
  log "写入超管 admin@local.dev"
  bash "$ROOT/insforge-app/scripts/seed-admin.sh" || warn "seed-admin 失败（账号可能已存在）"
fi

write_web_env

if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  warn "frontend/web/node_modules 不存在。可在该目录执行: ./node_modules 安装失败时用 npm/pnpm install"
fi

cat <<EOF

GravityD 初始化完成。

  管理后台    http://127.0.0.1:5180/web
  InsForge    http://127.0.0.1:7130
  后台账号    admin@local.dev / 123456
  控制台账号  admin / insforge/.env 里的 ROOT_ADMIN_PASSWORD

下一步：
  bash scripts/dev.sh          # 启动前端开发服务
  bash scripts/deploy.sh       # 构建并按生产配置部署

二次开发约定：.cursor/skills/base-server-app
EOF
