#!/usr/bin/env bash
# 启动 GravityD 本地开发：InsForge + Vite
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

need_cmd docker
docker info >/dev/null 2>&1 || die "Docker 引擎未运行"
[[ -f "$INSFORGE_DIR/.env" ]] || die "尚未初始化，先执行 bash scripts/init.sh"

insforge_up
wait_insforge
write_web_env

VITE_BIN="$WEB_DIR/node_modules/.bin/vite"
[[ -x "$VITE_BIN" ]] || die "找不到 $VITE_BIN，请先在 frontend/web 安装依赖"

log "前端 http://127.0.0.1:5180/web"
cd "$WEB_DIR"
exec "$VITE_BIN" --mode development
