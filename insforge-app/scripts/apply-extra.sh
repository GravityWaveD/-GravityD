#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
COMPOSE_DIR="$ROOT/insforge"
MIG_DIR="$ROOT/insforge-app/migrations"

if [[ ! -f "$COMPOSE_DIR/.env" ]]; then
  echo "Missing $COMPOSE_DIR/.env" >&2
  exit 1
fi

cd "$COMPOSE_DIR"
for f in "$MIG_DIR"/003_system_extend.sql "$MIG_DIR"/004_seed_extra.sql "$MIG_DIR"/005_insforge_menu.sql "$MIG_DIR"/006_brand_gravityd.sql "$MIG_DIR"/007_secure_rls.sql "$MIG_DIR"/008_agent_runtime.sql; do
  echo "Applying $(basename "$f")"
  docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 < "$f"
done

echo "Extra schema + seed applied."
