#!/usr/bin/env bash
# OWASP ZAP baseline scan against a running ZeloxTag instance (Docker required).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TARGET="${ZAP_TARGET:-http://host.docker.internal:3000}"
REPORT_DIR="${ROOT}/.zap/reports"
IMAGE="${ZAP_DOCKER_IMAGE:-ghcr.io/zaproxy/zaproxy:stable}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "${REPORT_DIR}"

if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required. Install Docker Desktop or run the GitHub Action .github/workflows/owasp-zap.yml"
  exit 1
fi

echo "ZAP baseline → ${TARGET}"
echo "Reports → ${REPORT_DIR}/zap-baseline-${TIMESTAMP}.html"

docker run --rm \
  -v "${REPORT_DIR}:/zap/wrk:rw" \
  -t "${IMAGE}" \
  zap-baseline.py \
  -t "${TARGET}" \
  -r "zap-baseline-${TIMESTAMP}.html" \
  -J "zap-baseline-${TIMESTAMP}.json" \
  -I \
  -d \
  -a

echo "Done. Open: ${REPORT_DIR}/zap-baseline-${TIMESTAMP}.html"
