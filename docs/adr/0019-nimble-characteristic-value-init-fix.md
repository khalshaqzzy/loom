# ADR 0019: NimBLE Characteristic Value Initialization Fix

Status: Accepted
Date: 2026-05-15
Scope: ESP32 firmware BLE bridge and mobile Android GATT cache handling

## Context

Physical Android-to-node BLE validation consistently failed with:

```
Characteristic identity mengembalikan 4-byte binary, bukan JSON LOOM.
```

Mobile diagnostics showed all BLE characteristic reads (identity `7d3f9a11` and nodeStatus `7d3f9a18`) returning the same 4-byte binary value `c4 ea fc 3f` instead of the expected JSON payloads. The hex value `c4 ea fc 3f` decodes to approximately 1.98 as an IEEE 754 float, indicating a NimBLE default/cached buffer rather than firmware data.

Previous BLE ADRs addressed related but different issues:

- ADR-0016 hardened mobile JSON decoding and notify-first handling.
- ADR-0017 fixed validation `onRead()` overwriting the response with a challenge.
- ADR-0018 migrated to LOOM-specific BLE UUIDs to avoid sample-UUID collision.

None of these addressed the NimBLE characteristic value initialization order.

### Evidence

1. The device name in mobile logs was `LOOM-Node-1` while `config.h` had `BLE_DEVICE_NAME = "LOOM-Node-2"`, indicating the physical device was running older firmware or had stale NVS state.
2. The LOOM service UUID `7d3f9a10-...` and all 8 characteristics were correctly discovered, confirming the firmware had been reflashed with LOOM-specific UUIDs.
3. Both identity and nodeStatus characteristics returned the identical 4-byte value, meaning ALL characteristics served cached/default buffers.
4. The value was always exactly 4 bytes and always `c4 ea fc 3f`, ruling out random corruption or partial JSON.

### Root Cause

The firmware `BleBridge::begin()` method set characteristic values using `setValue(const char*)` BEFORE calling `service->start()`:

```cpp
identityChar_ = service->createCharacteristic(...);
identityChar_->setValue(identity.c_str());  // BEFORE service->start()
// ...
service->start();
```

In NimBLE-Arduino 1.4.x, `NimBLEService::start()` finalizes the GATT database and can reinitialize characteristic value buffers, overwriting values set before it was called. Additionally, ESP32 stores GATT entries in NVS (Non-Volatile Storage), so stale values from previous firmware versions persist across reflashes unless explicitly cleared.

The `IdentityCallbacks::onRead()` callback should have refreshed the value on each read, but NimBLE may serve cached values without triggering the callback, or `setValue(const char*)` inside the callback may not properly resize the internal buffer when the new value is larger than the cached one.

## Decision

The firmware BLE bridge now:

1. Clears all NimBLE bonds and GATT cache on boot via `NimBLEDevice::deleteAllBonds()` before creating the server.
2. Creates all characteristics and starts the service BEFORE setting any values, ensuring NimBLE has finalized the GATT database.
3. Uses `setValue((const uint8_t*)data, length)` instead of `setValue(const char*)` for explicit buffer size control across all characteristic value writes.
4. Verifies the identity value was set correctly by reading it back and retrying if the read-back is too short or missing JSON structure.
5. Logs the identity value content and length to Serial Monitor for field debugging.

The mobile native BLE client now:

1. Detects 4-byte binary reads on the identity characteristic.
2. When binary is detected, performs a disconnect/reconnect cycle with `refreshGatt: "OnConnected"` to force Android to rebuild its GATT table from the peripheral.
3. Retries the identity read (2 attempts) after the GATT refresh.
4. Falls back to nodeStatus only if the GATT refresh retry also fails.

## Rationale

The 4-byte binary value `c4 ea fc 3f` was consistently returned for ALL characteristics, not just identity. This pointed to a NimBLE initialization/cache issue rather than a protocol or schema problem. The fix addresses both sides:

- **Firmware side**: Clearing NVS cache and setting values after service start eliminates the stale-buffer root cause.
- **Mobile side**: The GATT cache refresh handles the Android-side BLE stack caching that can also serve stale characteristic values even when the peripheral has correct data.

Using explicit byte-length `setValue()` ensures NimBLE allocates the correct buffer size regardless of internal null-termination behavior.

## Consequences

Positive:

- Characteristic values are set after NimBLE has finalized the GATT database, eliminating the initialization-order overwrite.
- NVS-stored GATT cache is cleared on every boot, preventing stale values from persisting across reflashes.
- Identity value verification catches buffer allocation failures at boot time with clear Serial Monitor diagnostics.
- Mobile GATT cache refresh provides a second chance before falling back to nodeStatus.
- All `setValue()` calls use explicit length, making buffer handling consistent and predictable.

Tradeoffs:

- `deleteAllBonds()` on every boot means previously bonded mobile devices must re-pair. This is acceptable for MVP because LOOM BLE does not use bonding for security; validation is handled by the challenge/response protocol.
- The mobile GATT refresh adds approximately 1-2 seconds to the connection flow when binary identity is detected.
- Identity verification retry at boot adds a small delay to BLE service readiness.

## Verification

Completed local checks:

- `npm run typecheck` at repo root (all workspaces)
- `npm run typecheck` in `apps/mobile`
- `npx expo export --platform android` in `apps/mobile`

Required after flashing:

1. Flash updated firmware to ESP32.
2. Open Serial Monitor at 115200 and verify:
   - `[BLE] Init device=LOOM-Node-2 service=... (bonds cleared)`
   - `[BLE] Service started`
   - `[BLE] Identity set uuid=... node=2 value={"protocol":"loom-ble-v1",...}`
   - `[BLE] Identity verified len=XXX`
3. Clear Android BLE cache (Settings > Apps > Bluetooth > Storage > Clear Data).
4. Open mobile app, scan, select node.
5. Verify identity read returns JSON and validation completes successfully.
