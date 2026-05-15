# ADR 0021: BLE Validation Lifecycle Reset

Status: Accepted
Date: 2026-05-15
Scope: ESP32 BLE validation lifecycle and React Native mobile validation recovery

## Context

After a successful first mobile-to-node session, reconnecting to the same node could fail during validation. The mobile app expected the validation characteristic to contain a fresh challenge JSON, but the node could still expose the previous response:

`{"validated":true,"nodeId":1}`

That response is valid validation output, but it is not valid challenge input. The mobile app therefore failed schema validation before it could complete or recover the handshake.

## Decision

Firmware now treats BLE connection lifecycle boundaries as validation session boundaries:

- on connect, clear `validated_`, reset backlog notify pacing, and write a fresh challenge,
- on disconnect, clear `validated_`, reset backlog notify pacing, write a fresh challenge, and restart advertising,
- after a validation write, preserve the validation response as the characteristic value so notification fallback reads still work.

Mobile now treats a validation response during challenge read as a known stale or already-validated state:

- if node status confirms the same node is validated, accept it as already validated,
- otherwise reconnect and retry the challenge read once,
- if the retry still returns a validation response, fail with a specific stale-response diagnostic.

## Rationale

The validation characteristic has two valid states: challenge before validation write, response after validation write. Reconnects must start a fresh session so the mobile app reads a challenge again. Mobile still needs defensive recovery because Android BLE values can be stale and older firmware may remain in the field.

This keeps UUIDs and JSON schemas unchanged while making the lifecycle deterministic.

## Consequences

Positive:

- Reconnect after a successful send no longer depends on manually clearing app or Bluetooth state.
- The node no longer remains globally validated after a BLE disconnect.
- Mobile logs distinguish stale validation responses from malformed BLE JSON.

Tradeoffs:

- Disconnecting a mobile client invalidates the current BLE validation session.
- Hardware validation is required because PlatformIO is unavailable locally and the bug depends on real BLE lifecycle timing.

## Verification

Completed locally:

- `npm run typecheck` in `apps/mobile`
- `git diff --check`

Blocked locally:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.

Required hardware verification:

- Flash firmware with erase.
- Connect and validate from mobile.
- Send one message successfully.
- Force or observe BLE disconnect.
- Reconnect and send a second message without clearing app data.
- Confirm mobile logs show a fresh challenge or controlled stale-response recovery, not a schema failure.
- Confirm Serial Monitor logs show validation session reset on connect and disconnect.
