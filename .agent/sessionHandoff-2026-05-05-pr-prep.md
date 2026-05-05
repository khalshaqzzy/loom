# LOOM Session Handoff - 2026-05-05 (Phase 6-7 Hosted E2E and CI/CD)

Document status: Active
Created: 2026-05-05
Purpose: high-signal handoff after hosted web/API e2e, production VM CI/CD, deployment docs, and verification

## Completed This Session

- Implemented Phase 6 Docker-free hosted web/API e2e with `apps/e2e`.
- Added Playwright global setup that starts ephemeral MongoDB, the API, and the web app on dynamic local ports.
- Added e2e coverage for public map/history, admin login/nodes/map/messages, and ingest duplicate/race behavior.
- Added deterministic fallback-map marker selection so admin marker details can be tested without a Google Maps key.
- Implemented Phase 7 hosted production runtime:
  - API and web Dockerfiles,
  - remote Docker Compose for `mongo`, `api`, `web`, and `caddy`,
  - Caddy routing for `loomnetwork.site` and `api.loomnetwork.site`,
  - VM bootstrap, remote deploy, rollback, smoke, and readiness scripts,
  - main-only CI, production deploy, Gitleaks/Trivy, CodeQL, and Dependency Review workflows.
- Added operational docs for environment matrix, deployment guide, manual provisioning, and release checklist.
- Added ADRs `0012-docker-free-hosted-e2e-harness.md` and `0013-production-vm-cicd-runtime.md`.
- Refactored stale web tests caused by frontend polish and API integration changes.
- Updated admin login tests to target the password input instead of also matching the password
  visibility button.
- Scoped admin node registration test queries to the register-node form with `within(...)`.
- Updated public map tests to assert composed `Nodes` and `Reports` status text reliably.
- Updated admin messages empty-state coverage to match the polished `EmptyState` title and generic
  guidance copy.
- Ran a repository-wide Prettier pass so `npm run format:check` now passes.
- Added ADR `0011-web-test-pr-readiness-gate.md`.

## Important Repo Facts

- Active branch at Phase 6-7 implementation time: `main`.
- Active npm workspaces are `apps/api`, `apps/e2e`, `apps/web`, `packages/contracts`, and
  `packages/test-fixtures`.
- `apps/mobile` and `packages/decision-tree` remain placeholder/future implementation areas.
- `firmware/loom-node` and `firmware/loom-gateway` contain intentional PlatformIO prototypes and
  must not be changed by hosted e2e/deployment work.
- Public lookup failure shape must stay generic for wrong birth date and unknown owner.
- Backend ingest deduplication must remain global by `senderNodeId + ":" + seqId`.
- Web route model remains `/`, `/public`, `/public/history`, `/admin/login`, and `/admin/**`.
- Public map APIs remain `/api/public/map/heatmap` and `/api/public/map/markers`.
- Admin map APIs remain `/api/admin/map/heatmap` and `/api/admin/map/markers` behind session auth.
- Formatter changes are intentionally included in this branch because `format:check` was failing
  before PR prep.
- Production deploy base path is `/opt/loom/hosted`.
- Production deploy is automatic after successful `CI` on `main`, assuming VM bootstrap and GitHub
  production secrets are complete.
- Production deploy now runs VM preflight before Compose, queues concurrent GitHub deploys instead
  of canceling them, and uses `/opt/loom/hosted/deploy.lock` to prevent concurrent VM deploy/rollback.
- Production no longer requires a separate owner birth-date hash GitHub secret; the API derives
  owner birth-date hashing from `SESSION_SECRET` when no explicit API env override is provided.
- Secret schema and deployment docs do not enforce minimum secret lengths; GitHub Actions still
  validates that required production secrets are nonblank before deploy.

## Verification Run

Completed successfully:

- `npm run format:check`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
- `npm run e2e`
- `docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml config`
- `git diff --check`

Not completed locally because Docker Desktop's Linux engine was not running:

- `docker compose --env-file deploy/env/runtime.production.env.example -f deploy/compose/docker-compose.remote.yml build`

## Files Intentionally Touched

- Web test refactor:
  - `apps/web/src/test/admin-login-client.test.tsx`
  - `apps/web/src/test/admin-nodes-client.test.tsx`
  - `apps/web/src/test/public-map-client.test.tsx`
  - `apps/web/src/test/admin-messages-client.test.tsx`
- Documentation:
  - `.agent/deploymentGuide.md`
  - `.agent/environmentMatrix.md`
  - `.agent/manualProvisioningChecklist.md`
  - `.agent/releaseExecutionChecklist.md`
  - `.agent/implementationPhases.md`
  - `.agent/phaseBacklog.md`
  - `docs/adr/0011-web-test-pr-readiness-gate.md`
  - `docs/adr/0012-docker-free-hosted-e2e-harness.md`
  - `docs/adr/0013-production-vm-cicd-runtime.md`
  - `.agent/sessionHandoff-2026-05-05-pr-prep.md`
- Hosted e2e:
  - `apps/e2e/**`
  - `apps/web/src/components/MapVisual.tsx`
- Hosted runtime and CI/CD:
  - `apps/api/Dockerfile`
  - `apps/web/Dockerfile`
  - `deploy/**`
  - `.github/workflows/**`
- Formatting baseline:
  - repository files reported by the previous failing `npm run format:check`

## Next Start

Begin Phase 8 IoT firmware:

1. Inspect the intentional PlatformIO prototypes under `firmware/loom-node` and `firmware/loom-gateway`.
2. Reconcile codec byte order and packet layout with LoRa V2 PRD/shared constants.
3. Add testable firmware modules for codec, routing state, dedup cache, pending queue, and forwarding.
4. Keep mobile implementation deferred until firmware BLE/API contracts are stable.
5. Do not modify hosted CI/CD unless deployment verification reveals an operational defect.
