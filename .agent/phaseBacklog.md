# LOOM Phase Backlog

Document status: Active  
Created: 2026-05-04  
Purpose: condensed execution backlog and next-session start point

## Current Repo State

- Phases 0-4 are complete in repo terms.
- Active npm workspaces:
  - `apps/api`
  - `apps/web`
  - `packages/contracts`
  - `packages/test-fixtures`
- Placeholder-only directories:
  - `apps/mobile`
  - `packages/decision-tree`
  - `firmware/loom-node`
  - `deploy/caddy`
  - `deploy/compose`
  - `deploy/scripts`
  - `.github/workflows`
- Placeholder-only directories should use `README.md`, not placeholder `package.json` files.
- Placeholder-only directories must not retain generated install/build artifacts such as `dist/`, empty `src/`, or `tsconfig.tsbuildinfo`.

## Completed

- `.agent/rules.md` now treats `.agent/` as the canonical project memory folder.
- ADRs exist for VM monolith runtime, LoRa V2, mobile direct burst, Google Maps, public lookup privacy, active workspace package boundaries, web route manifest, and the active Next.js web workspace.
- Root npm workspace includes packages that build or test today.
- `packages/contracts` defines shared schemas, constants, and enums.
- `packages/test-fixtures` defines reusable backend/API fixtures.
- `apps/api` implements the backend API surface for auth, node registration, ingest, public/admin map data, public lookup, web route manifest, audit logs, and readiness.
- `apps/web` implements the Next.js frontend workspace, including the polished landing page, public map surface, public privacy lookup, and admin surfaces.
- Landing-page visual reference images under `.agent/designImages` are local design inputs only and must not be committed or served directly.
- Backend tests cover unit behavior, API integration against `mongodb-memory-server` replica set, and contract snapshots.
- Removed stale generated files from `packages/decision-tree`; it now contains only `README.md`.
- Regenerated `package-lock.json` after removing placeholder packages from the workspace.

## Next Recommended Start

Start Phase 5: Frontend/Backend Integration and backend adjustments only where needed.

1. Run the Next.js web app against a live local backend and MongoDB fixture set.
2. Verify `/public`, `/public/history`, `/admin/login`, `/admin/map`, `/admin/nodes`, and `/admin/messages` against real API responses.
3. Add or adjust frontend/backend integration tests for public lookup, map filters, marker-only mode, admin login, node registration, marker selection, and message history.
4. Keep web business policy out of React components; backend contracts remain the policy source.
5. Do not commit `.agent/designImages` or generated `.next`/`output` artifacts.

Before starting, read:

- `.agent/rules.md`
- `.agent/sessionHandoff-2026-05-04.md`
- `.agent/implementationPhases.md`
- `docs/adr/0008-nextjs-web-workspace-and-asset-led-landing.md`

## Verification Baseline

Last passing verification:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
