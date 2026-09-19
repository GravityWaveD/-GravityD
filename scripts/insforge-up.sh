#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/insforge"
if [[ ! -f "$DIR/.env" ]]; then
  echo "Missing $DIR/.env — clone InsForge into insforge/ and generate secrets first." >&2
  exit 1
fi
# 优先沿用 insforge/.env 里已有的项目名，避免再拉起一套空库抢端口
if [[ -z "${COMPOSE_PROJECT_NAME:-}" ]]; then
  COMPOSE_PROJECT_NAME="$(grep -E '^COMPOSE_PROJECT_NAME=' "$DIR/.env" | tail -n1 | cut -d= -f2-)"
fi
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-gravityd-insforge}"
cd "$DIR"
docker compose up -d
docker compose ps
echo "InsForge console: http://127.0.0.1:7130"
