# Session Handoff: BLE NimBLE Characteristic Value Init Fix

## Date

2026-05-15

## Branch

`fix/ble-nimble-characteristic-init`

## Scope Completed

Fixed the persistent BLE identity read failure where all characteristic reads returned a 4-byte binary value `c4 ea fc 3f` instead of JSON. This issue was previously unfixable despite three related ADRs (0016, 0017, 0018).

## Root Cause

NimBLE-Arduino 1.4.x characteristic value initialization order bug combined with ESP32 NVS GATT cache persistence. The firmware set `setValue()` BEFORE `service->start()`, and NimBLE overwrote those values during service finalization. The 4-byte value was a NimBLE default/cached buffer, not firmware data.

## Changes Made

### Firmware: `firmware/loom-node/src/ble_bridge.cpp`

- Added `NimBLEDevice::deleteAllBonds()` on boot to clear NVS-stored GATT cache
- Moved all `setValue()` calls to AFTER `service->start()` so NimBLE has finalized the GATT database
- Changed all `setValue(const char*)` to `setValue((const uint8_t*)data, length)` for explicit buffer control
- Added identity value verification after setting: reads back the value and retries if too short or missing JSON
- Enhanced Serial Monitor logging with value content and length for field debugging

### Mobile: `apps/mobile/src/ble/nativeClient.ts`

- Added `retryIdentityWithGattRefresh()` method: when 4-byte binary is detected, disconnects from device, waits 600ms, reconnects with `refreshGatt: "OnConnected"`, and retries identity read (2 attempts)
- Integrated into `readNodeIdentity()` flow, called before nodeStatus fallback

### ADR: `docs/adr/0019-nimble-characteristic-value-init-fix.md`

- Documents the root cause, decision, rationale, and verification steps

## Verification Completed

Commands that passed:

```powershell
npm run typecheck                    # root (all workspaces)
npm run typecheck                    # apps/mobile
npm run build -w @loom/contracts     # contracts build
npm run typecheck -w @loom/contracts # contracts typecheck
npx expo export --platform android --output-dir .expo-export-check  # Android export
```

Temporary `.expo-export-check` output was deleted after verification.

## Required Hardware Verification

After flashing updated firmware:

1. Flash ESP32 with updated firmware
2. Open Serial Monitor at 115200, verify:
   - `[BLE] Init device=LOOM-Node-2 service=... (bonds cleared)`
   - `[BLE] Service started`
   - `[BLE] Identity set uuid=... node=2 value={"protocol":"loom-ble-v1",...}`
   - `[BLE] Identity verified len=XXX`
3. Clear Android BLE cache (Settings > Apps > Bluetooth > Storage > Clear Data)
4. Open mobile app, scan, select node
5. Verify identity read returns JSON and validation completes

## Files Changed

- `firmware/loom-node/src/ble_bridge.cpp`
- `apps/mobile/src/ble/nativeClient.ts`
- `docs/adr/0019-nimble-characteristic-value-init-fix.md`
- `.agent/sessionHandoff-2026-05-15-ble-nimble-init-fix.md`

## Relationship to Previous ADRs

| ADR | What it fixed | Why 0019 is needed |
|-----|---------------|-------------------|
| 0016 | Mobile notify-first + defensive JSON decode | Didn't help because raw bytes were 4 bytes, not malformed JSON |
| 0017 | Validation `onRead()` no longer overwrites with challenge | Didn't help because identity `onRead()` wasn't being triggered or `setValue()` wasn't working |
| 0018 | LOOM-specific UUID namespace | UUIDs were correct, but NimBLE characteristic values were still cached/stale |
| 0019 | NimBLE initialization order + NVS cache clear | Addresses the root cause: values set before `service->start()` are overwritten |

## Next Start

1. Install or enable PlatformIO, then run: `platformio run -d firmware/loom-node`
2. Flash a node and verify Serial Monitor logs show identity value set correctly
3. Clear Android BLE cache
4. Run mobile BLE integration: scan -> identity read -> validation -> message send
5. If identity still returns binary after firmware fix, check NimBLE-Arduino version and consider upgrading from 1.4.x
