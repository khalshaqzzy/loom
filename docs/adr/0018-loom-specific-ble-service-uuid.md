# ADR 0018: LOOM-Specific BLE Service UUID

Status: Accepted
Date: 2026-05-15
Scope: Mobile and ESP32 node BLE discovery contract

## Context

Physical Android validation repeatedly failed before the validation request was sent. Mobile diagnostics showed the identity characteristic read returned:

`raw=KOv8Pw==`

That decodes to a 4-byte binary float-like value, not the LOOM identity JSON payload. The service UUID in use, `4fafc201-1fb5-459e-8fcc-c5c9c331914b`, is a common ESP32 BLE tutorial/sample UUID. That made it possible for mobile to discover or cache a peripheral/service that matched the sample service UUID but did not implement the LOOM final BLE contract.

## Decision

LOOM now uses a project-specific BLE service UUID:

`7d3f9a10-8f6e-4f7a-9c1b-2e4d8f0b6a01`

The characteristic UUIDs remain unchanged:

- identity
- validation
- message write
- message ack
- backlog stream
- backlog ack
- internet status
- node status

Mobile diagnostics also explicitly identify 4-byte binary reads from the identity characteristic as an incompatible firmware/service contract, rather than surfacing a generic JSON parse failure.

## Rationale

The discovery service UUID is the first filter mobile uses to decide which nearby peripheral can be treated as a LOOM node candidate. Reusing a common ESP32 sample UUID creates false positives and stale Android GATT-cache ambiguity. A LOOM-specific service UUID forces mobile to discover only firmware that intentionally implements the LOOM service.

Keeping characteristic UUIDs unchanged limits the contract blast radius to discovery and service scoping. Firmware must still be reflashed before the mobile app can discover the node under the new service UUID.

## Consequences

Positive:

- Mobile no longer discovers peripherals that only match the common ESP32 sample service UUID.
- Android GATT cache ambiguity is reduced because the service UUID changed.
- Identity parse failures now explain when the node is likely running old/incompatible firmware.

Tradeoffs:

- ESP32 nodes running firmware with the old service UUID will not appear in mobile scans until reflashed.
- Any manual BLE tooling or documentation using the previous service UUID must be updated.

## Verification

Completed local checks:

- `npm run build -w @loom/contracts`
- `npm run typecheck -w @loom/contracts`
- `npm run typecheck` in `apps/mobile`
- `npx expo export --platform android --output-dir .expo-export-check` in `apps/mobile`

Blocked locally:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.
