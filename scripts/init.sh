#!/usr/bin/env bash
# GravityD 本地初始化：支持选择 InsForge (本地自托管) 或 Firebase (Google Cloud BaaS)
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/lib.sh"

PROVIDER=""
DRY_RUN=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --provider=*)
      PROVIDER="${1#*=}"
      shift
      ;;
    --provider)
      if [[ -z "${2:-}" || "${2}" == -* ]]; then
        die "缺少 --provider 参数值 (insforge|firebase)"
      fi
      PROVIDER="$2"
      shift 2
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    -h|--help)
      echo "用法: bash scripts/init.sh [--provider=insforge|firebase] [--dry-run]"
      exit 0
      ;;
    *)
      die "未知参数: $1"
      ;;
  esac
done

# 如果未通过参数指定，提供交互式选择
if [[ -z "$PROVIDER" ]]; then
  if [[ -t 0 ]]; then
    echo "=========================================="
    echo "请选择 GravityD 本地初始化的后端 BaaS 提供商:"
    echo "  [1] InsForge  (默认: 本地 Docker 自托管 Postgres/PostgREST/Auth)"
    echo "  [2] Firebase  (Google Cloud Firebase: Auth + Firestore + Storage)"
    echo "=========================================="
    read -r -p "请输入序号 [默认 1]: " choice
    case "${choice:-1}" in
      1|insforge)
        PROVIDER="insforge"
        ;;
      2|firebase)
        PROVIDER="firebase"
        ;;
      *)
        warn "输入无效，默认选择 InsForge"
        PROVIDER="insforge"
        ;;
    esac
  else
    PROVIDER="insforge"
  fi
fi

log "当前选择的后端提供商: $PROVIDER"

if [[ "$DRY_RUN" == "1" ]]; then
  if [[ "$PROVIDER" == "insforge" ]]; then
    cat <<EOF
[dry-run] 将执行 InsForge 初始化：
  1. 克隆/补齐 insforge/
  2. 拉起 Docker Compose（Postgres 5433 / API 7130）
  3. 应用 SQL 迁移并写入超管
  4. 写入 frontend/web/.env.development 中 VITE_BACKEND_PROVIDER=insforge
EOF
  elif [[ "$PROVIDER" == "firebase" ]]; then
    cat <<EOF
[dry-run] 将执行 Firebase 初始化：
  1. 跳过本地 Docker / Postgres
  2. 写入 frontend/web/.env.development 中 VITE_BACKEND_PROVIDER=firebase
  3. 补齐 VITE_FIREBASE_* 模板（已有值不覆盖）
  4. 提示执行 node scripts/seed-firebase.mjs 播种
EOF
  else
    die "不支持的 BaaS 提供商: $PROVIDER (可选: insforge, firebase)"
  fi
  exit 0
fi

if [[ "$PROVIDER" == "insforge" ]]; then
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

  write_web_env "insforge"

  cat <<EOF

GravityD (InsForge 模式) 初始化完成。

  管理后台    http://127.0.0.1:5180/web
  InsForge    http://127.0.0.1:7130
  后台账号    admin@local.dev / 123456
  控制台账号  admin / insforge/.env 里的 ROOT_ADMIN_PASSWORD

下一步：
  bash scripts/dev.sh          # 启动前端开发服务
  bash scripts/deploy.sh       # 构建并按生产配置部署
EOF

elif [[ "$PROVIDER" == "firebase" ]]; then
  write_web_env "firebase"

  cat <<EOF

GravityD (Firebase 模式) 初始化完成。

已在 frontend/web/.env.development 中配置 VITE_BACKEND_PROVIDER=firebase。

重要提示：
1. 请打开 frontend/web/.env.development 填入您真实的 Firebase 凭据:
   - VITE_FIREBASE_API_KEY
   - VITE_FIREBASE_AUTH_DOMAIN
   - VITE_FIREBASE_PROJECT_ID
   - VITE_FIREBASE_STORAGE_BUCKET
   - VITE_FIREBASE_APP_ID

2. 初始化 Firestore 系统种子数据（菜单、角色、部门、初始管理员）：
   cd frontend/web && node ../../scripts/seed-firebase.mjs

下一步：
  bash scripts/dev.sh          # 启动前端开发服务
EOF

else
  die "不支持的 BaaS 提供商: $PROVIDER (可选: insforge, firebase)"
fi

if [[ ! -d "$WEB_DIR/node_modules" ]]; then
  warn "frontend/web/node_modules 不存在。可在该目录执行: ./node_modules 安装失败时用 npm/pnpm install"
fi
