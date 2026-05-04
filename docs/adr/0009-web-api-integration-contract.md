# 0009 Web API Integration Contract

Status: Accepted
Date: 2026-05-04
Scope: Next.js web frontend, Express API contracts, public/admin map and history flows

## Context

LOOM's web frontend depends on the backend for all product policy, persistence, authentication, and
privacy-sensitive decisions. The frontend must not read MongoDB directly, duplicate backend privacy
rules, or rely on fixture-only behavior after the backend API is available.

Phase 4 produced the active Next.js web workspace and initial public/admin surfaces. Phase 5 then
needed to prove those surfaces against real Express API contracts, including admin session cookies,
CORS, node registration, public privacy lookup, map data, markers, and message history.

The integration pass found that public map data was available, but the admin map needed an explicit
authenticated heatmap endpoint. The frontend also had map type controls that needed to drive the real
Google Map instance, and the admin map needed to load heatmap points as well as markers.

## Decision

The web frontend will consume backend APIs through the shared TypeScript/Zod contracts in
`packages/contracts`; React components will call a thin API client and parse responses with those
contracts.

Public map reads use:

- `GET /api/public/map/heatmap`
- `GET /api/public/map/markers`

Admin map reads use authenticated session cookies and separate admin endpoints:

- `GET /api/admin/map/heatmap`
- `GET /api/admin/map/markers`

The API route manifest advertises the active public and admin map/message endpoints so future web
work can discover the canonical route shape without rediscovering backend files.

The public map remains identity-safe. Public marker responses omit owner identity and birth-date
data. Public history lookup remains privacy-gated by full name plus birth date and keeps generic
failure behavior. Admin-only identity and drilldown data remain behind admin session middleware.

The web map component owns Google Maps integration details. Screens pass LOOM map data, marker-only
state, and map type values into the reusable map component instead of embedding provider-specific
logic throughout public/admin pages.

Heatmap-style rendering uses weighted Google circle overlays rather than the Google Maps JavaScript
Heatmap Layer. This keeps the MVP on supported Maps APIs while preserving the heatmap-like operator
and public experience.

## Rationale

Separate public and admin map endpoints make data exposure explicit and reviewable. They also avoid
relying on frontend filtering to hide sensitive fields, which would violate the PRD security model.

Using shared contracts in the web API client catches integration drift early without turning React
components into policy owners. The backend remains the source of truth for validation, auth,
privacy, idempotency, and data shaping.

Keeping Google Maps behind a reusable component limits provider coupling. It also allows the
implementation to react to provider deprecations, such as the Heatmap Layer deprecation, without
rewriting every public/admin map screen.

Weighted circles are less visually specialized than the old Heatmap Layer but are sufficient for the
MVP, support map type switching, avoid a deprecated dependency path, and keep automated tests simple.

## Consequences

Frontend/backend integration tests must cover both public and admin flows rather than only isolated
component rendering. At minimum, the suite should verify map loading/filtering, marker-only mode,
public lookup success/failure, admin login, node registration, duplicate-node errors, message
filtering, and admin map data loading.

Admin map heatmap access is now an authenticated API contract. Future backend changes to map data
must update `packages/contracts`, the API route manifest, backend integration tests, and web tests in
the same change.

The frontend can still display a fallback map state when Google Maps fails or no local key is
available. Lookup and history workflows must remain usable when map rendering fails.

Google classic marker deprecation warnings may still appear through the current React Google Maps
wrapper. That warning does not block Phase 5 completion, but future map work should evaluate
Advanced Marker APIs when the wrapper and schedule make migration practical.

## Verification

The accepted implementation was verified with:

- root lint, typecheck, test, and build commands;
- backend API integration tests covering authenticated admin heatmap responses;
- web component tests with mocked Google Maps and mocked API client responses;
- local browser verification using a seeded memory-backed API on `http://localhost:4000` and the
  Next.js web app on `http://localhost:3000` with `apps/web/.env.local`.

## Follow-up

Phase 6 should add a repeatable hosted web/API e2e harness that starts API, web, and MongoDB together
and exercises public map/filter/lookup, admin login/node registration/search/map marker/history, and
ingest-to-map/history updates end to end.

Future map hardening should consider Advanced Marker migration and, if needed, a dedicated supported
heatmap renderer with better visual fidelity than weighted circles.
