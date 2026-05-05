# 0013 Production VM CI/CD Runtime

Status: Accepted
Date: 2026-05-05
Scope: production CI/CD, Docker Compose runtime, VM bootstrap, deploy, and rollback

## Context

The PRD fixes LOOM's hosted MVP to a single VM running API, web, MongoDB, and Caddy. Earlier ADRs
accepted the VM monolith but left the concrete CI/CD, bootstrap, release directory, and rollback
implementation open.

## Decision

Use a production-only deployment flow modeled after the existing CJL deployment pattern. A one-time
bootstrap script prepares an Ubuntu/Debian-like VM, creates the deploy user, installs Docker and
Compose, enables basic UFW rules, and creates `/opt/loom/hosted`.

GitHub Actions runs CI on hosted-runtime changes targeting `main`. Successful `main` CI immediately
deploys production by uploading a source archive to `/opt/loom/hosted/releases/<sha>`, rendering
`/opt/loom/hosted/shared/runtime.env`, building images on the VM, and running Docker Compose.
Caddy routes `loomnetwork.site` to web and `api.loomnetwork.site` to API. MongoDB remains private
and persists under `/opt/loom/hosted/shared/mongo-data`.

Post-deploy smoke checks validate web, API health, and API readiness. If validation fails and a
previous release exists, the workflow rolls back by re-running Compose from the previous release.

## Rationale

Source-archive deploys avoid an image registry while preserving exact SHA releases. Keeping shared
data outside release directories makes rollback safe for code/runtime changes without deleting
MongoDB data. Main-only deploys match the MVP requirement for a simple hosted runtime.

## Consequences

The VM must be bootstrapped before the first automatic deploy. Required GitHub production secrets
must exist before `main` deploys can pass. Rollback does not reverse database writes. Mobile,
firmware, and docs-only changes are excluded from hosted CI/deploy path triggers.

## Follow-up

Production backup policy and retention are still deferred. They can be added without changing the
release directory or Compose topology.
