#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${ROOT}/.env"
  set +a
fi
exec node "${ROOT}/scripts/idor-scan.mjs"
