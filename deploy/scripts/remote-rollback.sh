#!/usr/bin/env bash
set -euo pipefail

APP_ENV="${1:?APP_ENV is required}"
RELEASE_SHA="${2:?RELEASE_SHA is required}"
BASE_DIR="${3:?BASE_DIR is required}"
RUNTIME_ENV_FILE="${4:?RUNTIME_ENV_FILE is required}"

RELEASE_DIR="${BASE_DIR}/releases/${RELEASE_SHA}"
COMPOSE_FILE="${RELEASE_DIR}/deploy/compose/docker-compose.remote.yml"
CURRENT_LINK="${BASE_DIR}/current"
LOCK_FILE="${BASE_DIR}/deploy.lock"

if [[ "${APP_ENV}" != "production" ]]; then
  echo "APP_ENV must be production." >&2
  exit 1
fi

if [[ ! -d "${RELEASE_DIR}" ]]; then
  echo "Release directory not found: ${RELEASE_DIR}" >&2
  exit 1
fi

if [[ ! -f "${RUNTIME_ENV_FILE}" ]]; then
  echo "Runtime env file not found: ${RUNTIME_ENV_FILE}" >&2
  exit 1
fi

exec 9>"${LOCK_FILE}"
if ! flock -n 9; then
  echo "Another LOOM deploy or rollback is already running." >&2
  exit 1
fi

docker compose \
  --project-name "loom-${APP_ENV}" \
  --env-file "${RUNTIME_ENV_FILE}" \
  -f "${COMPOSE_FILE}" \
  up -d --build --remove-orphans

ln -sfn "${RELEASE_DIR}" "${CURRENT_LINK}"
printf '%s\n' "${RELEASE_SHA}" > "${BASE_DIR}/current_release"
