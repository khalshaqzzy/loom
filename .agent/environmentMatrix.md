# LOOM Environment Matrix

Document status: Active
Created: 2026-05-05
Purpose: canonical local and production runtime topology for hosted API/web deployment

## Local Development

- API: `apps/api`, default `http://localhost:4000`.
- Web: `apps/web`, default `http://localhost:3000`.
- MongoDB: developer-provided local MongoDB or `mongodb-memory-server` in automated tests.
- Google Maps: optional local `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`; when absent, web uses fallback map.
- Docker: not required for unit, integration, web, or e2e tests.

## E2E

- Runner: `apps/e2e` Playwright workspace.
- API: built API server started on a dynamic `127.0.0.1` port.
- Web: Next dev server started on a dynamic `127.0.0.1` port.
- MongoDB: ephemeral `MongoMemoryReplSet`.
- Google Maps: intentionally unset for deterministic fallback-map coverage.
- Command: `npm run e2e`.

## Production

- Base path: `/opt/loom/hosted`.
- Releases: `/opt/loom/hosted/releases/<sha>`.
- Current symlink: `/opt/loom/hosted/current`.
- Current release marker: `/opt/loom/hosted/current_release`.
- Shared runtime env: `/opt/loom/hosted/shared/runtime.env`.
- MongoDB data: `/opt/loom/hosted/shared/mongo-data`.
- Caddy data/config: `/opt/loom/hosted/shared/caddy-data` and
  `/opt/loom/hosted/shared/caddy-config`.
- Public web domain: `https://loomnetwork.site`.
- Backend API domain: `https://api.loomnetwork.site`.
- Runtime: Docker Compose services `mongo`, `api`, `web`, and `caddy`.

## Out Of Scope For Hosted CI/CD

- `apps/mobile`.
- `firmware/**`.
- `packages/decision-tree`.
- Docs-only and `.agent/**` changes.
