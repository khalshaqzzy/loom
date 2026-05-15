# LOOM Session Handoff - 2026-05-15 (Firmware Node PRD Alignment)

Document status: Active  
Created: 2026-05-15  
Purpose: high-signal handoff after firmware-only ESP32 node refactor for LoRa V2, BLE handoff, routing, queues, backlog, and Serial Monitor observability

## Completed This Session

- Refactored `firmware/loom-node/src/main.cpp` from a monolithic prototype into firmware-local modules:
  - `config.h`
  - `protocol.{h,cpp}`
  - `message_value.h`
  - `dedup_cache.{h,cpp}`
  - `pending_queue.{h,cpp}`
  - `backlog_store.{h,cpp}`
  - `routing.{h,cpp}`
  - `ble_bridge.{h,cpp}`
- Implemented node-side LoRa V2 behavior locally in firmware:
  - magic `0xD15A`,
  - big-endian packet fields,
  - HEARTBEAT with `heartbeatSeq`,
  - DATA fixed header with timestamp, `latE6`, `lonE6`, and canonical message bytes as the packet remainder.
- Removed the old automatic periodic hardcoded `fine` DATA transmission.
- Added firmware runtime state:
  - dedup cache with expiry,
  - pending queue for locally originated messages while route is unknown,
  - backlog store for mobile handoff,
  - neighbor table and route recompute,
  - delayed forwarding queue with random delay.
- Expanded BLE server while preserving existing service/message/internet UUIDs:
  - identity read,
  - validation challenge/response,
  - message ack notify,
  - backlog stream,
  - backlog ack write,
  - node status read/notify.
- Added Serial Monitor logs for boot/config, BLE setup and events, LoRa RX/TX, route changes, pending queue, backlog, and reject reasons.
- Added `ArduinoJson` to `firmware/loom-node/platformio.ini`.
- Added ADR `0015-firmware-node.md`.

## Important Repo Facts

- Scope was intentionally limited to firmware plus this handoff/ADR request.
- `firmware/loom-gateway` was not changed.
- Mobile, backend, shared TypeScript contracts, shared fixtures, and tests were not changed.
- Firmware now carries local LoRa/BLE constants that may still differ from `packages/contracts` until a later shared-contract phase.
- No firmware tests were added because the user explicitly requested no tests.

## Verification Run

Attempted but blocked:

- `platformio run -d firmware/loom-node`

Result:

- `platformio` is not available in PATH on this machine, so compile verification could not be completed locally.

Completed local checks:

- Confirmed no `firmware/loom-node/test` directory was added.
- Confirmed changed runtime files are under `firmware/loom-node`.
- Reviewed Serial Monitor log call sites in `main.cpp`, `ble_bridge.cpp`, and `routing.cpp`.

## Files Intentionally Touched

- `firmware/loom-node/platformio.ini`
- `firmware/loom-node/src/main.cpp`
- `firmware/loom-node/src/config.h`
- `firmware/loom-node/src/protocol.h`
- `firmware/loom-node/src/protocol.cpp`
- `firmware/loom-node/src/message_value.h`
- `firmware/loom-node/src/dedup_cache.h`
- `firmware/loom-node/src/dedup_cache.cpp`
- `firmware/loom-node/src/pending_queue.h`
- `firmware/loom-node/src/pending_queue.cpp`
- `firmware/loom-node/src/backlog_store.h`
- `firmware/loom-node/src/backlog_store.cpp`
- `firmware/loom-node/src/routing.h`
- `firmware/loom-node/src/routing.cpp`
- `firmware/loom-node/src/ble_bridge.h`
- `firmware/loom-node/src/ble_bridge.cpp`
- `docs/adr/0015-firmware-node.md`
- `.agent/sessionHandoff-2026-05-15-firmware-node.md`

## Next Start

1. Install or enable PlatformIO, then run:
   - `platformio run -d firmware/loom-node`
2. Flash a node and open Serial Monitor at `115200`.
3. Verify:
   - boot/config logs,
   - BLE service and characteristic readiness logs,
   - identity read and validation response,
   - message write rejection before validation,
   - validated message ack,
   - pending queue when route is unknown,
   - internet status setting route range to `0`,
   - heartbeat send/receive,
   - duplicate DATA suppression,
   - backlog notify and ack logs.
4. In a later scoped session, update mobile/shared contracts to consume the new firmware BLE and LoRa behavior.
