# LOOM Session Handoff - 2026-05-04

Document status: Active  
Created: 2026-05-04  
Purpose: high-signal handoff after Phase 0-3 backend foundation work

## Completed This Session

- Implemented the Phase 0-3 backend-first foundation.
- Upgraded local Node.js LTS to `v24.15.0`.
- Added npm workspace root, TypeScript base config, ESLint, Prettier, and lockfile.
- Added shared contracts and test fixtures packages.
- Implemented the Express/MongoDB API with admin auth, node registration, burst ingest idempotency, map/marker/history APIs, public lookup, audit logs, and health/readiness endpoints.
- Added Vitest/Supertest coverage with `mongodb-memory-server` replica set.
- Removed placeholder `package.json` files from future-only directories and replaced them with README placeholders.
- Removed stale generated artifacts from `packages/decision-tree`, including `dist/`, empty `src/`, and `tsconfig.tsbuildinfo`.
- Regenerated `package-lock.json` so it only reflects active workspaces.
- Updated ADRs so they do not reference roadmap phase labels.
- Added an ADR-writing rule: ADRs must describe durable decisions and concrete future work, not phase numbers.
- Added the Phase 4 frontend design guide with `/` as a polished landing page, `/public` as the unauthenticated heatmap surface, and `/public/history` as the privacy-gated lookup surface.
- Added backend support for the updated frontend route model through `GET /api/web/routes` and canonical public map aliases under `/api/public/map`.

## Important Repo Facts

- Active npm workspaces are only `apps/api`, `packages/contracts`, and `packages/test-fixtures`.
- `apps/web`, `apps/mobile`, `packages/decision-tree`, and `firmware/loom-node` are intentionally not npm workspaces yet.
- Add package manifests to placeholder directories only when their implementation phase begins.
- Placeholder-only directories should contain README files only until real implementation starts.
- Existing `edge-device/` sketches are legacy prototypes and should not be treated as Phase 8 firmware structure.
- Public lookup failure shape must stay generic for wrong birth date and unknown owner.
- Backend ingest deduplication must remain global by `senderNodeId + ":" + seqId`.
- Web route model now uses `/` for landing, `/public` for public heatmap operations, `/public/history` for public lookup, and `/admin/login` plus `/admin/**` for admin operations.
- Public map APIs are available at `/api/public/map/heatmap` and `/api/public/map/markers`; legacy `/api/map/*` routes remain compatible.

## Verification Run

Passing commands:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`

## Next Start

Begin Phase 4 in `apps/web`:

1. Scaffold the real Next.js app and add `apps/web/package.json`.
2. Add `apps/web` to root npm workspaces.
3. Build `/` landing, `/public`, `/public/history`, and admin routes using `packages/contracts`.
4. Use `GET /api/web/routes` and the existing backend APIs as the integration source of truth.
5. Do not add ADR phase references while documenting frontend architecture decisions.
