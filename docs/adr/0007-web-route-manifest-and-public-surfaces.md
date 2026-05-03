# 0007 Web Route Manifest and Public Surfaces

Status: Accepted  
Date: 2026-05-04  
Scope: web route contract, public map API paths, and frontend navigation metadata

## Context

LOOM needs both a polished public entry point and direct operational surfaces for public heatmap
access, privacy-gated history lookup, and admin workflows. The web frontend also needs stable paths
that future implementation sessions can consume without rediscovering route intent from scattered
product notes.

The backend already exposes public-safe heatmap and marker data, public history lookup, and
authenticated admin map/message APIs. The frontend route model now separates product introduction
from public operations:

- `/` is the landing page.
- `/public` is the unauthenticated public heatmap surface.
- `/public/history` is the public privacy-gated history lookup surface.
- `/admin/login` and `/admin/**` are admin surfaces.

## Decision

Expose a public web route manifest at `GET /api/web/routes`. The manifest lists canonical frontend
paths for landing, public, and admin surfaces, plus the API paths the web frontend should use for
public map data, public lookup, admin markers, admin messages, and admin node registration.

Add canonical public map aliases under:

- `GET /api/public/map/heatmap`
- `GET /api/public/map/markers`

Keep the existing public map routes as compatibility aliases:

- `GET /api/map/heatmap`
- `GET /api/map/markers`

Admin marker and message APIs remain under the authenticated admin namespace.

## Rationale

The landing page can now be polished and explanatory without weakening the MVP requirement that
public users can reach map and lookup tools without login. Moving the public operational UI to
`/public` also gives future frontend implementation a clearer information architecture.

The route manifest keeps route decisions machine-readable for the web app and tests. Public map API
aliases align backend URL shape with the new public route namespace while preserving compatibility
with existing backend tests and any early clients using `/api/map`.

## Consequences

Frontend implementation should treat `/api/web/routes` as the source for route/navigation metadata
where useful, but it must still use shared contracts for response validation and backend APIs for
data.

Public marker routes must stay public-safe and must not expose owner identity. Public lookup failure
behavior remains generic. Owner birth dates are used only for validation and registration; they must
never render in the web UI.

## Follow-up

When the Next.js web app is scaffolded, implement:

- `/` as the landing page.
- `/public` as the public heatmap and lookup-entry surface.
- `/public/history` as the dedicated lookup flow.
- `/admin/login` and protected admin routes using the existing backend session APIs.
