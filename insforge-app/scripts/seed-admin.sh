#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENV_FILE="$ROOT/insforge/.env"
set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

BASE="${API_BASE_URL:-http://127.0.0.1:7130}"
API_KEY="${ACCESS_API_KEY:?ACCESS_API_KEY missing}"

email="admin@local.dev"
password="123456"
name="管理员"

resp="$(curl -sS -X POST "$BASE/api/auth/users" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"name\":\"$name\",\"autoConfirm\":true}")"

echo "$resp"

user_id="$(python3 -c 'import json,sys; data=json.load(sys.stdin); user=data.get("user") or (data.get("data") or {}).get("user") or {}; uid=user.get("id");
import sys as s; s.exit("cannot parse user id: "+json.dumps(data)) if not uid else print(uid)' <<<"$resp")"

cd "$ROOT/insforge"
docker compose exec -T postgres psql -U postgres -d insforge -v ON_ERROR_STOP=1 <<SQL
INSERT INTO public.profiles (id, username, name, email, status, dept_id, is_superuser, description)
SELECT '$user_id', 'admin', '管理员', '$email', 0, d.id, true, 'InsForge 第一期超管'
FROM public.sys_dept d
WHERE d.code = 'DEFAULT'
ON CONFLICT (id) DO UPDATE
SET username = EXCLUDED.username,
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    is_superuser = true,
    dept_id = EXCLUDED.dept_id;

INSERT INTO public.sys_user_roles (user_id, role_id)
SELECT '$user_id', r.id FROM public.sys_role r WHERE r.code = 'SUPER_ADMIN'
ON CONFLICT DO NOTHING;
SQL

echo "Seeded $email ($user_id)"
