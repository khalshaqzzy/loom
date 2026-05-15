# ADR 0018: LOOM-Specific BLE UUID Namespace

Status: Accepted
Date: 2026-05-15
Scope: Mobile and ESP32 node BLE discovery and characteristic contract

## Context

Physical Android validation repeatedly failed before the validation request was sent. Mobile diagnostics showed the identity characteristic read returned:

`raw=KOv8Pw==`

That decodes to a 4-byte binary float-like value, not the LOOM identity JSON payload. The service and characteristic UUIDs in use included common ESP32 BLE tutorial/sample UUIDs such as `4fafc201-...` and `beb5483e-...`. That made it possible for mobile to discover or cache a peripheral/service that matched sample UUIDs but did not implement the LOOM final BLE contract.

## Decision

LOOM now uses a project-specific BLE UUID namespace:

- service: `7d3f9a10-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- identity: `7d3f9a11-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- validation: `7d3f9a12-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- message write: `7d3f9a13-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- message ack: `7d3f9a14-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- backlog stream: `7d3f9a15-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- backlog ack: `7d3f9a16-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- internet status: `7d3f9a17-8f6e-4f7a-9c1b-2e4d8f0b6a01`
- node status: `7d3f9a18-8f6e-4f7a-9c1b-2e4d8f0b6a01`

Mobile diagnostics also explicitly identify 4-byte binary reads from the identity characteristic as an incompatible firmware/service contract, rather than surfacing a generic JSON parse failure.

## Rationale

The discovery service UUID is the first filter mobile uses to decide which nearby peripheral can be treated as a LOOM node candidate. Reusing common ESP32 sample UUIDs creates false positives and stale Android GATT-cache ambiguity. A LOOM-specific UUID namespace forces mobile to discover and read only firmware that intentionally implements the LOOM service and characteristic contract.

Changing all BLE UUIDs is more disruptive than changing only the service UUID, but it removes the remaining collision risk for identity and validation reads.

## Consequences

Positive:

- Mobile no longer discovers peripherals that only match common ESP32 sample UUIDs.
- Android GATT cache ambiguity is reduced because both the service and characteristic UUIDs changed.
- Identity parse failures now explain when the node is likely running old/incompatible firmware.

Tradeoffs:

- ESP32 nodes running firmware with the old BLE UUIDs will not appear in mobile scans until reflashed.
- Any manual BLE tooling or documentation using the previous service UUID must be updated.

## Verification

Completed local checks:

- `npm run build -w @loom/contracts`
- `npm run typecheck -w @loom/contracts`
- `npm run typecheck` in `apps/mobile`
- `npx expo export --platform android --output-dir .expo-export-check` in `apps/mobile`

Blocked locally:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.
