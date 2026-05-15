# ADR 0017: BLE Validation Read Fallback Contract

Status: Accepted
Date: 2026-05-15
Scope: Mobile and ESP32 node BLE validation handshake

## Context

During physical mobile-to-node validation, the mobile app showed:

`Validasi node gagal. Respons BLE node tidak valid atau belum siap.`

The previous hardening made mobile wait for validation notifications and fall back to reading the validation characteristic. Firmware, however, still used the validation characteristic `onRead()` callback to overwrite the characteristic value with a fresh challenge JSON. This created a race:

1. Mobile reads the challenge.
2. Mobile subscribes to validation notifications and writes `{ nodeId, challenge }`.
3. Firmware sets and notifies `{ validated, nodeId }`.
4. If the notification is missed or not yet subscribed at the BLE stack level, mobile falls back to read.
5. Firmware `onRead()` overwrites the response with `{ challenge }`.
6. Mobile validates the fallback payload against the response schema and rejects it.

## Decision

The validation characteristic now keeps the latest meaningful value instead of overwriting reads:

- `resetChallenge()` sets the characteristic value to the current challenge.
- `handleValidationWrite()` sets the characteristic value to the validation response and notifies it.
- `ValidationCallbacks::onRead()` only logs the read and does not rewrite the characteristic value.
- Failed validation no longer immediately rotates the challenge after the response is sent, preserving a readable response for fallback behavior.
- Mobile waits briefly after subscribing to the response notification before writing the request, reducing the chance of missing the first notification.

## Rationale

BLE notification subscription setup is asynchronous across Android devices. A response characteristic that is both notify-capable and readable must preserve the response long enough for a client fallback read to work. Rewriting the value in `onRead()` made fallback reads semantically different from notifications and caused valid firmware responses to look like invalid mobile payloads.

This preserves the existing UUIDs and JSON schemas while making the validation handshake deterministic for both notification-first and read-fallback clients.

## Consequences

Positive:

- Mobile fallback reads can now retrieve the latest validation response.
- The validation characteristic has clearer semantics: challenge before write, response after write.
- The firmware Serial Monitor now logs validation characteristic reads without mutating state.
- The mobile client is less likely to miss validation/message response notifications due to subscription timing.

Tradeoffs:

- A failed validation response remains readable until the next challenge reset or reconnect lifecycle updates it.
- Hardware validation is still required after flashing firmware because BLE timing remains device-dependent.

## Verification

Completed local checks:

- `npm run typecheck` in `apps/mobile`
- `npx expo export --platform android --output-dir .expo-export-check` in `apps/mobile`

Blocked locally:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.
