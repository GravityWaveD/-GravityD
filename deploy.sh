#!/usr/bin/env bash
# GravityD 部署入口（InsForge + Vue）。旧的 FastAPI/MySQL compose 仍在 docker/ 下保留，不再作为默认路径。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
exec bash "$ROOT/scripts/deploy.sh"
