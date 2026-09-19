#!/usr/bin/env bash
# GravityD 脚本公共函数。由 init / deploy / dev 以 source 引入。

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INSFORGE_DIR="$ROOT/insforge"
MIG_DIR="$ROOT/insforge-app/migrations"
WEB_DIR="$ROOT/frontend/web"
COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-gravityd-insforge}"

log() { printf '\033[0;34m[GravityD]\033[0m %s\n' "$*"; }
warn() { printf '\033[0;33m[GravityD]\033[0m %s\n' "$*"; }
die() { printf '\033[0;31m[GravityD]\033[0m %s\n' "$*" >&2; exit 1; }

need_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "缺少命令: $1"
}

upsert_env() {
  local file="$1" key="$2" value="$3"
  mkdir -p "$(dirname "$file")"
  touch "$file"
  if grep -qE "^${key}=" "$file"; then
    local tmp
    tmp="$(mktemp)"
    awk -v k="$key" -v v="$value" 'BEGIN{FS=OFS="="} $1==k{$0=k"="v} {print}' "$file" >"$tmp"
    mv "$tmp" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

env_get() {
  local file="$1" key="$2"
  [[ -f "$file" ]] || return 1
  grep -E "^${key}=" "$file" | tail -n1 | cut -d= -f2-
}

psql_insforge() {
  (cd "$INSFORGE_DIR" && docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 "$@")
}

apply_sql() {
  local file="$1"
  [[ -f "$file" ]] || die "找不到 SQL: $file"
  log "应用 $(basename "$file")"
  (cd "$INSFORGE_DIR" && docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1) <"$file"
}

ensure_insforge_clone() {
  if [[ -d "$INSFORGE_DIR/.git" || -f "$INSFORGE_DIR/docker-compose.yml" || -f "$INSFORGE_DIR/docker-compose.yaml" ]]; then
    return 0
  fi
  need_cmd git
  log "克隆官方 InsForge 到 insforge/（不跑官方 setup.sh）"
  git clone --depth 1 --filter=blob:none https://github.com/InsForge/InsForge.git "$INSFORGE_DIR"
}

ensure_insforge_env() {
  local envf="$INSFORGE_DIR/.env"
  if [[ ! -f "$envf" ]]; then
    if [[ -f "$INSFORGE_DIR/.env.example" ]]; then
      cp "$INSFORGE_DIR/.env.example" "$envf"
    else
      touch "$envf"
    fi
    local secret
    secret="$(openssl rand -hex 12 2>/dev/null || python3 -c 'import secrets;print(secrets.token_hex(12))')"
    upsert_env "$envf" "ROOT_ADMIN_PASSWORD" "$secret"
    warn "已生成 insforge/.env，控制台密码见 ROOT_ADMIN_PASSWORD"
  fi
  upsert_env "$envf" "POSTGRES_PORT" "${POSTGRES_PORT:-5433}"
  upsert_env "$envf" "API_BASE_URL" "${API_BASE_URL:-http://127.0.0.1:7130}"
  upsert_env "$envf" "COMPOSE_PROJECT_NAME" "$COMPOSE_PROJECT"
  # 避免和本机已有 Postgres 5432 冲突
  if grep -qE '^POSTGRES_PORT=5432$' "$envf"; then
    upsert_env "$envf" "POSTGRES_PORT" "5433"
  fi
}

insforge_up() {
  [[ -f "$INSFORGE_DIR/.env" ]] || die "缺少 $INSFORGE_DIR/.env，请先 bash scripts/init.sh"
  (cd "$INSFORGE_DIR" && docker compose up -d)
}

wait_insforge() {
  local i
  for i in $(seq 1 60); do
    if curl -fsS -m 2 http://127.0.0.1:7130/ >/dev/null 2>&1; then
      log "InsForge 已就绪 http://127.0.0.1:7130"
      return 0
    fi
    sleep 2
  done
  die "InsForge 7130 未就绪，请检查 docker compose logs"
}

menu_count() {
  psql_insforge -Atc "SELECT COUNT(*) FROM public.sys_menu" 2>/dev/null || echo "0"
}

apply_schema() {
  local count
  apply_sql "$MIG_DIR/001_system_schema.sql"
  count="$(menu_count | tr -d '[:space:]')"
  if [[ "${count:-0}" == "0" ]]; then
    log "sys_menu 为空，首次写入 002 种子（以后不要再跑）"
    apply_sql "$MIG_DIR/002_seed_system.sql"
  else
    log "sys_menu 已有 ${count} 行，跳过 002"
  fi
  apply_sql "$MIG_DIR/003_system_extend.sql"
  apply_sql "$MIG_DIR/004_seed_extra.sql"
  apply_sql "$MIG_DIR/005_insforge_menu.sql"
  apply_sql "$MIG_DIR/006_brand_gravityd.sql"
  apply_sql "$MIG_DIR/007_secure_rls.sql"
  apply_sql "$MIG_DIR/008_agent_runtime.sql"
}

write_web_env() {
  local dest="$WEB_DIR/.env.development"
  local example="$WEB_DIR/.env.development.example"
  local anon
  anon="$(env_get "$INSFORGE_DIR/.env" ACCESS_ANON_KEY || true)"
  [[ -n "$anon" ]] || anon="$(env_get "$INSFORGE_DIR/.env" ANON_KEY || true)"
  if [[ ! -f "$dest" && -f "$example" ]]; then
    cp "$example" "$dest"
  fi
  [[ -f "$dest" ]] || touch "$dest"
  upsert_env "$dest" "VITE_APP_TITLE" "GravityD"
  upsert_env "$dest" "VITE_INSFORGE_URL" "http://127.0.0.1:7130"
  if [[ -n "$anon" ]]; then
    upsert_env "$dest" "VITE_INSFORGE_ANON_KEY" "$anon"
  else
    warn "insforge/.env 里还没有 ACCESS_ANON_KEY，启动栈后重新执行 init 会写上"
  fi
  log "已写入 $dest"
}

write_web_prod_env() {
  local dest="$WEB_DIR/.env.production"
  local example="$WEB_DIR/.env.production.example"
  local url="${GRAVITYD_PUBLIC_URL:-http://127.0.0.1:7130}"
  local anon
  anon="$(env_get "$INSFORGE_DIR/.env" ACCESS_ANON_KEY || true)"
  [[ -n "$anon" ]] || anon="$(env_get "$INSFORGE_DIR/.env" ANON_KEY || true)"
  if [[ ! -f "$dest" && -f "$example" ]]; then
    cp "$example" "$dest"
  fi
  [[ -f "$dest" ]] || touch "$dest"
  upsert_env "$dest" "VITE_APP_TITLE" "GravityD"
  upsert_env "$dest" "VITE_INSFORGE_URL" "$url"
  upsert_env "$dest" "VITE_API_BASE_URL" "$url"
  [[ -n "$anon" ]] && upsert_env "$dest" "VITE_INSFORGE_ANON_KEY" "$anon"
}
