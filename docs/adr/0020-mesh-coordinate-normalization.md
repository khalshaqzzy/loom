# ADR 0020: Mesh Coordinate Normalization

Status: Accepted
Date: 2026-05-15
Scope: firmware/mobile/API coordinate contract for mesh messages

## Context

LoRa DATA packets already carry mesh coordinates as fixed-point `latE6/lonE6` in the PRD V2 packet header. Firmware also emits backlog JSON with fixed-point coordinates first.

The gap was downstream: mobile backlog storage could keep decimal `lat/lon` as `null` when firmware only supplied `latE6/lonE6`, while API map and latest-node metadata logic used decimal `lat/lon`. That meant a valid burst could be accepted but fail to appear correctly in map surfaces.

## Decision

Treat `latE6/lonE6` as the canonical firmware and LoRa mesh coordinate representation, and normalize at mobile/API boundaries:

- derive decimal `lat/lon` from E6 when only fixed-point coordinates are present,
- derive E6 from decimal coordinates when only decimal coordinates are present,
- treat `latE6=0` and `lonE6=0` as no-location and store all coordinate fields as `null`,
- reject partial coordinate pairs,
- reject inconsistent decimal and fixed-point pairs.

Firmware LoRa packet format remains unchanged: magic `0xD15A`, DATA type, 26-byte header, `latE6/lonE6`, and canonical message bytes.

## Rationale

Fixed-point coordinates are the safest representation on constrained firmware and over LoRa because they avoid float formatting and parsing ambiguity. Decimal coordinates are still needed for API responses, maps, heatmaps, and marker metadata.

Centralizing normalization in `@loom/contracts` keeps mobile and API behavior aligned and makes invalid coordinate states explicit before persistence or map rendering.

## Consequences

Positive:

- E6-only firmware backlog items now become map-ready API messages.
- Mobile stores normalized coordinates before local backlog sync.
- API history responses expose both decimal and fixed-point coordinates.
- Latest-node marker metadata uses derived decimal coordinates for E6-only bursts.
- Invalid partial or inconsistent coordinate pairs are rejected during ingest.

Tradeoffs:

- The zero-zero sentinel cannot represent a real Gulf of Guinea coordinate in mesh data.
- Producers that send both decimal and E6 coordinates must keep them exactly consistent at E6 precision.

## Verification

Completed locally:

- `npm run build -w @loom/contracts`
- `npm run test -w @loom/contracts`
- `npm run build -w @loom/test-fixtures`
- `npm run test -w @loom/api`
- `npm run typecheck` in `apps/mobile`
- `git diff --check`

Firmware and mobile-specific tests were not added for this change by request. Hardware validation should still confirm two nodes exchange a DATA message with matching `latE6/lonE6`, and that the mobile burst path produces map-visible API records.
