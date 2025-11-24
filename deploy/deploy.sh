#!/usr/bin/env bash
set -euo pipefail

REMOTE="debian@fbmac.net"
REMOTE_DIR="${REMOTE_DIR:-/home/debian/quantum-matrix}"
DIST_DIR="dist"

if ! command -v scp >/dev/null 2>&1; then
  echo "scp não encontrado" >&2
  exit 1
fi

npm ci
npm run build

ssh "$REMOTE" "mkdir -p '$REMOTE_DIR'"
scp -r "$DIST_DIR/" "$REMOTE:$REMOTE_DIR/"
