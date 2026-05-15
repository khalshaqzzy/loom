# ADR 0019: BLE JSON Characteristic Hardening

Status: Accepted
Date: 2026-05-15
Scope: ESP32 node firmware and React Native mobile BLE diagnostics

## Context

Physical Android validation continued to fail after the mobile and firmware BLE UUID contract was moved to the LOOM-specific namespace. The mobile log showed the identity read returning a 4-byte binary value such as `c4 ea fc 3f` instead of JSON.

The UUID/schema contract is already aligned between firmware and `packages/contracts`. The remaining issue is therefore treated as firmware read-path or Android GATT/value behavior, not as a contract mismatch.

The earlier theory that `NimBLECharacteristic::setValue(out.c_str())` stores pointer-sized data is not proven. NimBLE-Arduino 1.4.0 has string overloads that should use string length when selected by overload resolution. The explicit byte-length write is still useful hardening, but the implementation must gather evidence before naming the library overload as root cause.

## Decision

Firmware now writes JSON characteristic values using explicit byte buffers and explicit lengths for all JSON BLE values:

- identity initial/read value
- validation challenge and response
- message acknowledgement
- backlog stream initial/readable value and notifications
- node status readable/notification value

Firmware also logs stored characteristic diagnostics after JSON assignment:

- expected JSON byte length
- `getDataLength()` stored byte length
- a short hex preview of stored bytes

Mobile diagnostics now distinguish node-status fallback reads from identity reads, preserving clearer evidence when identity cannot be read. The mobile client also performs one bounded reconnect, rediscovery, and identity reread for the specific 4-byte binary identity case. If identity remains 4-byte binary after reconnect, the app fails with diagnostics instead of treating node-status fallback as proof of success.

## Rationale

Explicit byte-length writes avoid ambiguity in C++ overload selection and keep firmware behavior independent of library overload details. The added firmware diagnostics distinguish whether the ESP32 stored the correct JSON value before Android reads it.

The mobile reconnect path tests the stale Android GATT/value hypothesis once without hiding persistent firmware or GATT problems. Clearer node-status labels keep logs usable when comparing identity reads, status fallback reads, and firmware Serial Monitor output.

## Consequences

Positive:

- BLE JSON writes are explicit and consistent across all firmware characteristics.
- Serial Monitor output can prove whether firmware stored JSON or a short binary value.
- Mobile diagnostics no longer describe node-status fallback data as identity data.
- A stale Android connection gets one recovery attempt before failing with evidence.

Tradeoffs:

- Firmware logs are more verbose during BLE reads and notifications.
- Hardware validation is still required because PlatformIO is not available in this local environment and Android BLE behavior is device-dependent.

## Verification

Completed locally:

- `npm run typecheck` in `apps/mobile`
- `git diff --check`
- Search confirmed no old `setValue(out.c_str())` JSON characteristic writes remain; only the explicit byte-length helper remains.

Blocked locally:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.

Required hardware verification:

- Erase and reflash the affected ESP32 node.
- Confirm Serial Monitor `[BLE DBG] identity:*` logs show JSON byte length matching stored byte length and hex beginning with JSON bytes.
- Read identity, validation, and node-status with nRF Connect and confirm JSON bytes, not a 4-byte binary value.
- Validate from the mobile app and confirm the BLE log no longer reports `hex=c4 ea fc 3f`.
