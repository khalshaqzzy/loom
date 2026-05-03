# LOOM Phase Backlog

Document status: Active  
Created: 2026-05-04  
Purpose: condensed execution backlog and next-session start point

## Current Repo State

- Phases 0-3 are complete in repo terms.
- Active npm workspaces:
  - `apps/api`
  - `packages/contracts`
  - `packages/test-fixtures`
- Placeholder-only directories:
  - `apps/web`
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
- ADRs exist for VM monolith runtime, LoRa V2, mobile direct burst, Google Maps, public lookup privacy, and active workspace package boundaries.
- Root npm workspace is limited to packages that build or test today.
- `packages/contracts` defines shared schemas, constants, and enums.
- `packages/test-fixtures` defines reusable backend/API fixtures.
- `apps/api` implements the backend API surface for auth, node registration, ingest, map, markers, messages, public lookup, audit logs, and readiness.
- Backend tests cover unit behavior, API integration against `mongodb-memory-server` replica set, and contract snapshots.
- Removed stale generated files from `packages/decision-tree`; it now contains only `README.md`.
- Regenerated `package-lock.json` after removing placeholder packages from the workspace.

## Next Recommended Start

Start Phase 4: Web Frontend Implementation.

1. Scaffold the real Next.js TypeScript package under `apps/web`.
2. Add `apps/web/package.json` when the Next.js app is created.
3. Add `apps/web` back to root npm workspaces in the same change.
4. Build the public/admin routes against `packages/contracts`.
5. Keep web business policy out of React components; backend contracts remain the policy source.

Before starting, read:

- `.agent/rules.md`
- `.agent/sessionHandoff-2026-05-04.md`
- `.agent/implementationPhases.md`
- `docs/adr/0006-active-workspaces-and-placeholders.md`

## Verification Baseline

Last passing verification:

- `npm install`
- `npm run typecheck`
- `npm run lint`
- `npm test`
- `npm run build`
