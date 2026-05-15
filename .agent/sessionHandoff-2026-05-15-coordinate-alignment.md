# Session Handoff: End-to-End Message And Coordinate Alignment

Document status: Active
Created: 2026-05-15
Purpose: handoff after aligning mesh message coordinates across firmware assumptions, mobile backlog sync, contracts, API ingest, and map responses

## Completed This Session

- Added shared coordinate normalization in `packages/contracts/src/coordinates.ts`.
- Exported coordinate helpers from `@loom/contracts`.
- Updated BLE and burst ingest schemas to reject:
  - partial decimal or E6 coordinate pairs,
  - inconsistent decimal and E6 values,
  - invalid coordinate ranges.
- Preserved the firmware/LoRa coordinate model:
  - `latE6/lonE6` remain canonical for DATA packets and firmware backlog JSON,
  - LoRa DATA packet format remains unchanged.
- Updated mobile backlog storage:
  - derives decimal `lat/lon` from E6-only backlog items,
  - derives E6 from decimal-only items,
  - converts `latE6=0/lonE6=0` to all-null location.
- Updated mobile sync so `POST /api/ingest/burst` sends normalized decimal and E6 coordinates.
- Staged accepted mobile-origin BLE messages into local backlog for later burst sync.
- Updated API ingest:
  - normalizes coordinates before insert,
  - stores both decimal and fixed-point values,
  - updates registered-node latest metadata from normalized decimal coordinates.
- Updated message response contracts and serializers to include nullable `latE6/lonE6`.
- Updated LoRa V2 fixtures:
  - heartbeat magic now uses `0xD15A`,
  - added DATA fixture with `latE6=-6208763` and `lonE6=106845599`.
- Added ADR `docs/adr/0020-mesh-coordinate-normalization.md`.

## Important Context

- The original connection issue was already handled separately in ADR 0019. This session targeted message and coordinate alignment after BLE validation became safe enough to proceed.
- The key downstream bug was not firmware packet encoding. The gap was that E6-only backlog data could be accepted by the mobile/API path while decimal map fields stayed missing.
- The zero-zero E6 pair is treated as the current no-location sentinel.
- Firmware/mobile-specific tests were intentionally not added in this session by user request.

## Verification Run

Passed:

- `npm run build -w @loom/contracts`
- `npm run test -w @loom/contracts`
- `npm run build -w @loom/test-fixtures`
- `npm run test -w @loom/api`
- `npm run typecheck` in `apps/mobile`
- `git diff --check`

Not run:

- PlatformIO firmware build or hardware validation.
- Additional firmware/mobile tests, by request.

## Files Changed

- `apps/api/src/modules/ingest/ingestRoutes.ts`
- `apps/api/src/modules/messages/messageSerializers.ts`
- `apps/api/src/test/integration/api.test.ts`
- `apps/mobile/app/index.tsx`
- `apps/mobile/src/storage/backlogItems.ts`
- `apps/mobile/src/sync/syncBacklog.ts`
- `packages/contracts/src/coordinates.ts`
- `packages/contracts/src/index.ts`
- `packages/contracts/src/schemas/ble.ts`
- `packages/contracts/src/schemas/ingest.ts`
- `packages/contracts/src/schemas/messages.ts`
- `packages/contracts/test/coordinates.test.ts`
- `packages/test-fixtures/src/index.ts`
- `docs/adr/0020-mesh-coordinate-normalization.md`
- `.agent/sessionHandoff-2026-05-15-coordinate-alignment.md`

## Next Start

1. On hardware, send one message from a node with known GPS E6 values and confirm the receiving node logs matching `latE6/lonE6`.
2. Pull backlog from mobile and confirm local SQLite stores both decimal and E6 coordinates.
3. Run mobile burst sync and confirm:
   - API stores both coordinate forms,
   - admin history exposes `lat/lon/latE6/lonE6`,
   - public heatmap and marker endpoints show derived decimal coordinates.
4. If PlatformIO is available, run `platformio run -d firmware/loom-node` before flashing.
