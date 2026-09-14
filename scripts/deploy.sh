#!/usr/bin/env bash
# GravityD 部署：拉起 InsForge、套增量迁移、构建前端
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

need_cmd docker
need_cmd curl
docker info >/dev/null 2>&1 || die "Docker 引擎未运行"
[[ -f "$INSFORGE_DIR/.env" ]] || die "尚未初始化，先在本机或服务器执行 bash scripts/init.sh"

insforge_up
wait_insforge

# 部署不重跑 002
apply_sql "$MIG_DIR/001_system_schema.sql"
apply_sql "$MIG_DIR/003_system_extend.sql"
apply_sql "$MIG_DIR/004_seed_extra.sql"
apply_sql "$MIG_DIR/005_insforge_menu.sql"
apply_sql "$MIG_DIR/006_brand_gravityd.sql"

write_web_prod_env

VITE_BIN="$WEB_DIR/node_modules/.bin/vite"
[[ -x "$VITE_BIN" ]] || die "找不到 $VITE_BIN，请先在 frontend/web 安装依赖"

log "构建前端"
cd "$WEB_DIR"
if [[ -x "$WEB_DIR/node_modules/.bin/vue-tsc" ]]; then
  "$VITE_BIN" build --mode production
else
  "$VITE_BIN" build --mode production
fi

DIST="$WEB_DIR/dist"
[[ -d "$DIST" ]] || die "构建失败，没有 $DIST"

cat <<EOF

GravityD 已构建。

  静态资源    $DIST
  InsForge    http://127.0.0.1:7130
  预览前端    cd frontend/web && ./node_modules/.bin/vite preview --mode production

生产请把 dist 挂到 Nginx，并把 VITE_INSFORGE_URL / VITE_INSFORGE_ANON_KEY
写进 frontend/web/.env.production 后重新构建。
InsForge 控制台账号 admin，密码见 insforge/.env 的 ROOT_ADMIN_PASSWORD。
EOF
