#!/usr/bin/env bash
# Authenticated OWASP ZAP *full* scan: spider + active attack + passive rules.
# Can be noisy and slow — prefer staging; production only with a dedicated scan account.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if [[ -f "${ROOT}/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  . "${ROOT}/.env"
  set +a
fi

TARGET="${ZAP_TARGET:-https://app.zeloxtag.de}"
PLAYWRIGHT_TARGET="${ZAP_PLAYWRIGHT_TARGET:-${TARGET}}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//host.docker.internal/localhost}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//127.0.0.1/localhost}"
PLAYWRIGHT_TARGET="${PLAYWRIGHT_TARGET//0.0.0.0/localhost}"
IMAGE="${ZAP_DOCKER_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
SPIDER_MINS="${ZAP_SPIDER_MINS:-5}"
MAX_TIME_MINS="${ZAP_MAX_TIME_MINS:-90}"
ACTIVE_MINS="${ZAP_ACTIVE_MINS:-30}"
REPORT_DIR="${ROOT}/.zap/reports"
SESSION_DIR="${ROOT}/.zap/session"
ZAP_WRK="${ROOT}/.zap"

mkdir -p "${REPORT_DIR}" "${SESSION_DIR}" "${ZAP_WRK}/reports"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required."
  exit 1
fi

if [[ "${TARGET}" == https://app.zeloxtag.de* ]] && [[ "${ZAP_ALLOW_PROD_ACTIVE:-}" != "1" ]]; then
  echo "Refusing active scan on production without ZAP_ALLOW_PROD_ACTIVE=1"
  echo "Active scans may trigger rate limits, emails, or write-like probes."
  exit 1
fi

echo "Exporting session cookies (Playwright) → ${PLAYWRIGHT_TARGET}"
ZAP_TARGET="${PLAYWRIGHT_TARGET}" node "${ROOT}/scripts/zap-export-auth-cookies.mjs"

echo "ZAP full (active) scan → ${TARGET}"
echo "Spider ~${SPIDER_MINS}m, active cap ~${ACTIVE_MINS}m, overall cap ~${MAX_TIME_MINS}m"
echo "Reports → ${REPORT_DIR}/zap-active-${TIMESTAMP}.html"

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
  zap-full-scan.py \
  -t "${TARGET}" \
  "${ZAP_CONFIG[@]}" \
  -m "${SPIDER_MINS}" \
  -T "${MAX_TIME_MINS}" \
  -r "reports/zap-active-${TIMESTAMP}.html" \
  -J "reports/zap-active-${TIMESTAMP}.json" \
  -I \
  -d \
  -j \
  -z "-config attack.maxScanDurationInMins=${ACTIVE_MINS}" \
  --hook=/zap/wrk/zap-auth-hook.py

echo "Done. Open: ${REPORT_DIR}/zap-active-${TIMESTAMP}.html"
