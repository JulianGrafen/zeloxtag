#!/usr/bin/env bash
# Authenticated OWASP ZAP baseline: Playwright login → cookie hook → spider + passive scan.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${ROOT}/.env"
  set +a
fi

TARGET="${ZAP_TARGET:-https://app.zeloxtag.de}"
# Playwright runs on the host — map Docker host aliases to localhost.
PLAYWRIGHT_TARGET="${ZAP_PLAYWRIGHT_TARGET:-${TARGET}}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//host.docker.internal/localhost}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//127.0.0.1/localhost}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//0.0.0.0/localhost}"
REPORT_DIR="${ROOT}/.zap/reports"
SESSION_DIR="${ROOT}/.zap/session"
IMAGE="${ZAP_DOCKER_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SPIDER_MINS="${ZAP_SPIDER_MINS:-3}"

mkdir -p "${REPORT_DIR}" "${SESSION_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required."
  exit 1
fi

echo "Exporting session cookies (Playwright) → ${PLAYWRIGHT_TARGET}"
ZAP_TARGET="${PLAYWRIGHT_TARGET}" node "${ROOT}/scripts/zap-export-auth-cookies.mjs"

if [[ ! -f "${SESSION_DIR}/cookies.json" ]]; then
  echo "Missing ${SESSION_DIR}/cookies.json"
  exit 1
fi

echo "ZAP authenticated baseline → ${TARGET}"
echo "Reports → ${REPORT_DIR}/zap-auth-${TIMESTAMP}.html"

ZAP_WRK="${ROOT}/.zap"
mkdir -p "${ZAP_WRK}/reports" "${ZAP_WRK}/session"

ZAP_CONFIG=()
if [[ -f "${ZAP_WRK}/rules.tsv" ]]; then
  ZAP_CONFIG=(-c "/zap/wrk/rules.tsv")
fi

docker run --rm \
  --add-host=host.docker.internal:host-gateway \
  -v "${ZAP_WRK}:/zap/wrk:rw" \
  -v "${ROOT}/scripts/zap-auth-hook.py:/zap/wrk/zap-auth-hook.py:ro" \
  -e ZAP_COOKIE_FILE=/zap/wrk/session/cookies.json \
  -t "${IMAGE}" \
  zap-baseline.py \
  -t "${TARGET}" \
  "${ZAP_CONFIG[@]}" \
  -m "${SPIDER_MINS}" \
  -r "reports/zap-auth-${TIMESTAMP}.html" \
  -J "reports/zap-auth-${TIMESTAMP}.json" \
  -I \
  -d \
  -a \
  -j \
  --hook=/zap/wrk/zap-auth-hook.py

echo "Done. Open: ${REPORT_DIR}/zap-auth-${TIMESTAMP}.html"
