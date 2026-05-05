#!/usr/bin/env bash
set -euo pipefail

READY_URL="${1:?READY_URL is required}"

payload="$(curl --fail --silent --show-error --location "${READY_URL}")"

node -e '
const payload = JSON.parse(process.argv[1]);
if (payload.status !== "ready" || payload.mongo !== true || payload.indexes !== true) {
  console.error(`Unexpected readiness payload: ${JSON.stringify(payload)}`);
  process.exit(1);
}
' "${payload}"
