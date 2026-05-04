# LOOM Phase Backlog

Document status: Active  
Created: 2026-05-04  
Updated: 2026-05-04  
Purpose: condensed execution backlog and next-session start point

## Current Repo State

- Phases 0-5 are complete in repo terms.
- Phase 4 frontend design polish is complete (ADR 0010).
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
- ADRs exist for VM monolith runtime, LoRa V2, mobile direct burst, Google Maps, public lookup privacy, active workspace package boundaries, web route manifest, the active Next.js web workspace, the web/API integration contract, and web frontend design polish.
- Root npm workspace includes packages that build or test today.
- `packages/contracts` defines shared schemas, constants, and enums.
- `packages/test-fixtures` defines reusable backend/API fixtures.
- `apps/api` implements the backend API surface for auth, node registration, ingest, public/admin map data, public lookup, web route manifest, audit logs, and readiness.
- `apps/web` implements the Next.js frontend workspace, including the polished landing page, public map surface, public privacy lookup, and admin surfaces.
- Phase 5 frontend/backend integration is complete: the web API client uses real backend contracts, admin heatmap support is implemented, map type switching is wired, public/admin map filters are covered, and seeded local browser verification passed against a memory-backed API.
- Web map heatmap intensity uses supported Google circle overlays instead of the deprecated Google Maps Heatmap Layer.
- Landing-page visual reference images under `.agent/designImages` are local design inputs only and must not be committed or served directly.
- Backend tests cover unit behavior, API integration against `mongodb-memory-server` replica set, and contract snapshots.
- Removed stale generated files from `packages/decision-tree`; it now contains only `README.md`.
- Regenerated `package-lock.json` after removing placeholder packages from the workspace.
- **Phase 4 frontend design polish complete (ADR 0010):**
  - CSS-only motion system with shimmer, stagger, fade-up, slide-up, breathe, tactile-press, glass-panel utilities.
  - Extended `ui.tsx` component library: Button loading states, StatusDot, EmptyState, InlineAlert icons, Skeleton shimmer, refined Panel/Badge/Field.
  - Admin shell: glassmorphism header, active nav indicators, mobile drawer, status dot.
  - Admin overview: asymmetric bento grid, count-up metric animations, staggered lists.
  - Admin login: mesh-line SVG overlay, glassmorphism form, password toggle.
  - Public map: refined controls, breathing live indicator, staggered marker cards, privacy note.
  - Public history: icon headers, staggered results, privacy info cards.
  - Admin map/nodes/messages/detail: staggered table rows, refined dialogs, empty states, hover effects.
  - Not-found: animated mesh background, staggered content entrance.
  - Brand: Broadcast icon with breathing pulse.
  - All animations respect `prefers-reduced-motion`.

## Next Recommended Start

Start Phase 6: Hosted Web/API End-to-End Tests.

1. Add a repeatable e2e harness for API + web + MongoDB.
2. Seed admin user, registered nodes, and simulated message batches.
3. Cover public map/filter/lookup, admin login/node registration/search/map marker/history, and ingest-to-map/history updates end to end.
4. Keep web business policy out of React components; backend contracts remain the policy source.
5. Do not commit `.agent/designImages` or generated `.next`/`output` artifacts.

Before starting, read:

- `.agent/rules.md`
- `.agent/sessionHandoff-2026-05-04.md`
- `.agent/implementationPhases.md`
- `docs/adr/0008-nextjs-web-workspace-and-asset-led-landing.md`
- `docs/adr/0010-web-frontend-design-polish-and-motion.md`
- `docs/adr/0004-google-maps-provider.md`
- `docs/adr/0009-web-api-integration-contract.md`

## Verification Baseline

Last passing verification:

- `npm install`
- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`
