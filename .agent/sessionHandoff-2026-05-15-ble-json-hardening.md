# Session Handoff: BLE JSON Characteristic Hardening

Document status: Active
Created: 2026-05-15
Purpose: handoff after hardening ESP32 BLE JSON characteristic writes and mobile diagnostics for persistent 4-byte binary identity reads

## Completed This Session

- Treated the persistent mobile validation failure as a firmware read-path or Android GATT/value issue, not as a UUID/schema mismatch.
- Kept the LOOM BLE UUID namespace unchanged.
- Updated `firmware/loom-node/src/ble_bridge.cpp`:
  - added explicit byte-buffer plus length JSON characteristic writes,
  - replaced JSON `setValue(out.c_str())` style writes across identity, validation, message ack, backlog, and node status,
  - added `[BLE DBG]` Serial diagnostics with expected JSON bytes, stored `getDataLength()` bytes, and a short stored hex preview.
- Updated `apps/mobile/src/ble/nativeClient.ts`:
  - preserved Android `refreshGatt: "OnConnected"`,
  - relabeled node-status identity fallback reads as `nodeStatus:*`,
  - added one reconnect, rediscovery, and identity reread for the specific 4-byte binary identity case,
  - fails with diagnostics if identity still returns 4-byte binary after reconnect.
- Added ADR `docs/adr/0019-ble-json-characteristic-hardening.md`.

## Important Context

- `firmware/loom-node/src/config.h` and `packages/contracts/src/schemas/ble.ts` already agree on UUIDs.
- The prior pointer-size explanation for the 4-byte value is only a hypothesis, not a proven root cause. NimBLE-Arduino 1.4.0 has string overloads that should use string length when selected.
- The explicit byte-length write remains a valid hardening change because it removes overload ambiguity and gives deterministic JSON byte counts.
- The pass condition is not only “Serial prints identity JSON”; nRF Connect and the mobile app must read JSON bytes from the characteristic.

## Verification Run

Passed:

- `npm run typecheck` in `apps/mobile`
- `git diff --check`
- Search confirmed old JSON `setValue(out.c_str())` style writes are gone from `firmware/loom-node/src`.

Blocked:

- `platformio run -d firmware/loom-node` because `platformio` is not available in PATH on this machine.

## Files Changed

- `firmware/loom-node/src/ble_bridge.cpp`
- `apps/mobile/src/ble/nativeClient.ts`
- `docs/adr/0019-ble-json-characteristic-hardening.md`
- `.agent/sessionHandoff-2026-05-15-ble-json-hardening.md`

## Next Start

1. On a machine with PlatformIO, run:
   - `platformio run -d firmware/loom-node`
   - `platformio run -d firmware/loom-node -t erase`
   - `platformio run -d firmware/loom-node -t upload`
   - `platformio device monitor -d firmware/loom-node -b 115200`
2. Confirm Serial Monitor logs:
   - expected node ID/device name,
   - `[BLE DBG] identity:init` and `identity:read` with matching JSON/stored byte lengths,
   - hex preview begins with JSON bytes such as `7b 22`.
3. Use nRF Connect before the mobile app:
   - read identity and confirm `{"protocol":"loom-ble-v1",...}`,
   - read validation and confirm challenge JSON,
   - read node status and confirm JSON.
4. Then test the mobile app:
   - scan and connect to the node,
   - confirm validation succeeds,
   - confirm mobile logs no longer show 4-byte identity hex such as `c4 ea fc 3f`,
   - confirm message ack and node-status subscription still parse.
