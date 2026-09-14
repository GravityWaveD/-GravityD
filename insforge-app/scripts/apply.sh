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
for f in "$MIG_DIR"/001_system_schema.sql "$MIG_DIR"/002_seed_system.sql; do
  echo "Applying $(basename "$f")"
  docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 < "$f"
done

echo "Schema + static seed applied."
