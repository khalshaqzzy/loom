# ADR 0016: Mobile BLE Notify Hardening

Status: Accepted
Date: 2026-05-15
Scope: React Native mobile BLE integration with ESP32 node firmware

## Context

The mobile app failed during node validation after selecting a node with an error similar to:

`validasi node gagal. JSON parse error: unexpected character`

The firmware validation characteristic accepts a JSON request, then sets and notifies the validation response. The previous native mobile client wrote the validation request and immediately read the same characteristic, assuming the returned value would always be a base64-encoded JSON response. In practice, BLE characteristic timing and platform encoding can expose a value that is not yet the response, is plain JSON, or contains non-JSON padding bytes.

The same read/notify mismatch also affected message acknowledgement risk because firmware exposes message ack as a notify characteristic.

## Decision

The native mobile BLE client now treats validation responses and message acknowledgements as notify-first interactions:

- Subscribe to the response characteristic before writing the request.
- Resolve from the first valid JSON notification.
- Fall back to a read after a bounded timeout.
- Decode BLE payloads defensively as base64 or plain UTF-8 JSON.
- Strip BOM, null bytes, and leading/trailing non-JSON text before parsing.
- Ignore malformed backlog and node-status notifications instead of throwing through React Native callbacks.
- Disconnect after failed validation setup and show a user-safe validation error instead of surfacing internal JSON parser text.

## Rationale

This aligns mobile behavior with the firmware BLE contract implemented in `firmware/loom-node/src/ble_bridge.cpp`, where validation response and message ack are emitted by `notify()`. The fallback read preserves compatibility with implementations that expose readable response characteristics, while the decoder hardening tolerates platform and firmware differences without weakening schema validation.

The change remains mobile-only and does not alter shared BLE schemas, firmware UUIDs, or backend ingest contracts.

## Consequences

Positive:

- Node validation no longer depends on a race-prone immediate read after write.
- Mobile can handle both base64 and plain JSON characteristic payloads.
- Malformed telemetry notifications are isolated and logged without crashing the app flow.
- Users receive a generic validation failure when the node response is invalid or not ready.

Tradeoffs:

- Native BLE hardware validation is still required because BLE timing varies by device and OS.
- The mobile client now has a bounded 5-second wait for validation/message responses before fallback behavior.
- The defensive JSON cleanup is intentionally narrow and still requires parsed payloads to pass the shared Zod schemas.

## Verification

Completed local checks:

- `npm run typecheck` in `apps/mobile`
- `npx expo config --type public` in `apps/mobile`

Hardware validation remains a release prerequisite for the ESP32/mobile integration path.
