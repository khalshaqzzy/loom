# LOOM Session Handoff - 2026-05-04

Document status: Active  
Created: 2026-05-04  
Updated: 2026-05-04  
Purpose: high-signal handoff after backend foundation, web frontend implementation, and frontend/backend integration

## Completed This Session

- Implemented the Phase 0-3 backend-first foundation.
- Added npm workspace root, TypeScript base config, ESLint, Prettier, and lockfile.
- Added shared contracts and test fixtures packages.
- Implemented the Express/MongoDB API with admin auth, node registration, burst ingest idempotency, map/marker/history APIs, public lookup, audit logs, web route manifest, and health/readiness endpoints.
- Added Vitest/Supertest backend coverage with `mongodb-memory-server` replica set.
- Added the Phase 4 frontend design guide and then promoted `apps/web` from placeholder to active Next.js workspace.
- Added `apps/web` to root npm workspaces and root build/test/typecheck coverage.
- Implemented the web route model: `/`, `/public`, `/public/history`, `/admin/login`, and `/admin/**`.
- Built the landing page from code and raw assets under `apps/web/public/assets`, following the local section references without serving `.agent/designImages` directly.
- Added public map, public history lookup, admin login, admin overview, admin map, admin nodes, node detail, admin messages, and settings surfaces.
- Added web component/client helpers, labels tests, public history lookup tests, and asset-backed landing visuals.
- Added ADR `0008-nextjs-web-workspace-and-asset-led-landing.md`.
- Added ADR `0009-web-api-integration-contract.md`.
- Updated `.gitignore` and ESLint ignores so generated `.next`, `output`, and `.agent/designImages` artifacts are not committed or linted.
- Completed Phase 5 frontend/backend integration.
- Added authenticated admin heatmap API support and advertised it in the web route manifest contract.
- Wired public and admin map type selection, admin heatmap loading, admin message-value filtering, and marker-only map behavior against real backend contracts.
- Replaced Google Maps Heatmap Layer usage with supported weighted circle overlays to avoid the Heatmap Layer deprecation/removal path.
- Added web coverage for map rendering behavior, public map loading/filter/fallback, admin map filtering, admin login, admin node registration/duplicate errors, and admin message filters.
- Verified locally with a seeded memory-backed API on `http://localhost:4000` and Next.js on `http://localhost:3000` using `apps/web/.env.local`.

## Important Repo Facts

- Active npm workspaces are now `apps/api`, `apps/web`, `packages/contracts`, and `packages/test-fixtures`.
- `apps/mobile`, `packages/decision-tree`, and `firmware/loom-node` remain future implementation placeholders.
- Existing `edge-device/` sketches are legacy prototypes and should not be treated as the future firmware structure.
- Public lookup failure shape must stay generic for wrong birth date and unknown owner.
- Backend ingest deduplication must remain global by `senderNodeId + ":" + seqId`.
- Web route model uses `/` for landing, `/public` for public heatmap operations, `/public/history` for public lookup, and `/admin/login` plus `/admin/**` for admin operations.
- Public map APIs are available at `/api/public/map/heatmap` and `/api/public/map/markers`; legacy `/api/map/*` routes remain compatible.
- Admin map APIs are available at `/api/admin/map/heatmap` and `/api/admin/map/markers`; both require admin session cookies.
- `apps/web/.env.local` contains local-only web environment values, including the Google Maps key. Do not commit it.
- Google Maps marker deprecation warnings may still appear because the wrapper uses classic markers; Heatmap Layer deprecation warnings should not appear after the circle overlay migration.
- `.agent/designImages` contains local visual references only. Do not commit those images and do not serve them directly from the web app.
- Generated `.next` and `output` directories are local artifacts only.

## Verification Run

Run before handoff and commit:

- `npm run lint`
- `npm run typecheck`
- `npm test`
- `npm run build`

## Next Start

Begin Phase 6 hosted web/API e2e:

1. Add a repeatable e2e harness for API + web + MongoDB.
2. Seed admin user, registered nodes, and simulated message batches.
3. Cover public map/filter/lookup, admin login/node registration/search/map marker/history, and ingest-to-map/history updates.
4. Keep business/privacy policy in backend contracts and services; do not move those decisions into React components.
5. Preserve the `.agent/designImages`, `.next`, and `output` exclusions unless the user explicitly asks to version generated/local artifacts.
