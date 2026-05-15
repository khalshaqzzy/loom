# LOOM Firmware/Mobile Integration Implementation Phase

Document status: Recreated implementation plan  
Updated: 2026-05-15  
Source of truth: `.agent/PRD.md`  
Companion analysis: `.agent/firmwareMobileGapReport.md`  
Purpose: detailed work plan for two parallel implementers, one owning firmware and one owning mobile, to close all firmware/mobile gaps and match the PRD.

Note: the filename intentionally keeps the requested spelling: `integrationImpelentationPhase.md`.

## 1. Goal

Implement the LOOM edge stack so the current firmware and mobile prototypes become PRD-compliant:

- ESP32 + LoRa + BLE firmware under `firmware/`.
- React Native Expo mobile app under `apps/mobile`.
- Mobile-consumable decision-tree compression under `packages/decision-tree`.
- Shared contracts for LoRa constants, BLE UUIDs, BLE payloads, canonical message values, and backend burst mapping.

The end state must satisfy PRD sections 7.2 through 7.6, 8.4, 8.5, 11, 13, 14, 17.1 through 17.5, 18.3, 21.3, 21.4, and test scenarios 24 through 40.

## 2. Current Starting Point

### Firmware

- `firmware/loom-node` is a PlatformIO Arduino prototype using `LoRa` and `NimBLE-Arduino`.
- The node advertises BLE service `4fafc201-1fb5-459e-8fcc-c5c9c331914b`.
- The node exposes report write `beb5483e-36e1-4688-b7f5-ea07361b26a8`.
- The node exposes internet status write `cba1d466-344c-4be3-ab3f-189f80dd7518`.
- `firmware/loom-node/src/main.cpp` is monolithic.
- LoRa packets still use `PKT_MAGIC = 0x4C4D`, little-endian fields, missing HEARTBEAT `heartbeatSeq`, missing DATA `latE6/lonE6`, and an extra DATA message length byte.
- Routing only handles direct gateway heartbeat in a limited way.
- Pending queue, backlog store, route recompute, stale route behavior, random forward delay, and test harness are missing.
- `firmware/loom-gateway` is an optional/historical WiFi gateway prototype. It should not drive the MVP mobile direct burst architecture.

### Mobile

- `apps/mobile` is an Expo Router prototype with report, history, help, and settings tabs.
- BLE scan and write wrappers exist with mock mode.
- Local history/backlog uses AsyncStorage.
- A direct burst uploader exists but its request/response handling does not match backend contracts.
- `apps/mobile` is not included in the root workspace.
- Mobile typecheck currently fails because `ignoreDeprecations` is invalid.
- The app sends raw text to firmware when text is present and uses noncanonical compression values.
- Node ID validation, backlog receive/ack, real connection state, per-item sync states, and internet status lifecycle are missing.

### Shared Contracts

- Backend ingest exists and expects `POST /api/ingest/burst`.
- Canonical backend message values already exist in `packages/contracts/src/enums/index.ts`.
- Shared LoRa constant currently conflicts with the PRD: code says `0x4C4D`, PRD says `0xD15A`.
- `packages/decision-tree` is still placeholder-only.

## 3. Ownership Model

### Firmware Owner

Owns:

- `firmware/loom-node/**`
- Firmware protocol codec.
- Firmware routing state.
- Firmware dedup cache.
- Firmware pending queue.
- Firmware backlog store.
- Firmware BLE GATT server.
- Firmware LoRa send/receive behavior.
- Firmware tests and hardware checklist.

Does not own:

- Mobile UI.
- Mobile local persistence.
- Mobile backend sync behavior.
- Backend API semantics beyond integration feedback.

### Mobile Owner

Owns:

- `apps/mobile/**`
- `packages/decision-tree/**`
- Mobile workspace integration.
- Mobile BLE client abstraction and mocks.
- Mobile local storage and migrations.
- Mobile direct backend burst.
- Mobile tests and manual device checklist.

Does not own:

- Firmware LoRa routing internals.
- Firmware BLE server implementation.
- Backend ingest semantics beyond integration feedback.

### Shared Coordination

Both owners must coordinate on:

- LoRa byte-level fixtures.
- BLE UUIDs.
- BLE JSON payload schemas.
- Message value taxonomy.
- Firmware ack/backlog semantics.
- Integration test fixtures.

No owner should invent a private contract. If a contract changes, update this file and add/update an ADR when the decision is durable.

## 4. Frozen Decisions For This Phase

### 4.1 LoRa Protocol

Use the PRD exactly:

- `MAGIC = 0xD15A`.
- `TYPE_HEARTBEAT = 0x01`.
- `TYPE_DATA = 0x02`.
- `ROUTE_INFINITY = 65535`.
- Node IDs are uint24 in range `0..16777215`.
- Multi-byte values use big-endian/network byte order.
- DATA has no target receiver, ACK, TTL, next hop, version, or flags.
- DATA forwarding rule is exactly `self.rangeToGateway < packet.forwarderRangeToGateway`.
- Forwarding updates only `forwarderRangeToGateway`.

DATA message handling:

- Treat DATA message bytes as the remaining packet bytes after the fixed 26-byte header.
- Do not add a LoRa-level message length byte unless the PRD/ADR is updated.
- Message bytes must be ASCII canonical values from `messageValueValues`.
- Reject unsupported or empty message values.

GPS unavailable handling:

- DATA still carries fixed `latE6` and `lonE6` fields.
- For MVP, encode `latE6 = 0` and `lonE6 = 0` as the no-fix sentinel.
- Mobile omits or nulls backend `lat`, `lon`, `latE6`, and `lonE6` when both E6 values are zero.

### 4.2 BLE Contract

Keep the current service UUID and existing report/internet UUIDs to avoid unnecessary churn. Rename "report" conceptually to "message write" while preserving the characteristic UUID.

Service UUID:

```text
4fafc201-1fb5-459e-8fcc-c5c9c331914b
```

Characteristics:

| Purpose | UUID | Direction | Properties | Current state |
| --- | --- | --- | --- | --- |
| Node identity | `4fafc201-1fb5-459e-8fcc-c5c9c331914c` | firmware -> mobile | read | Add |
| Validation | `4fafc201-1fb5-459e-8fcc-c5c9c331914d` | mobile <-> firmware | read, write, notify | Add |
| Message write | `beb5483e-36e1-4688-b7f5-ea07361b26a8` | mobile -> firmware | write, notify/ack pairing | Keep existing UUID |
| Message ack | `beb5483e-36e1-4688-b7f5-ea07361b26a9` | firmware -> mobile | notify | Add |
| Backlog stream | `5f7e2d00-6c2e-4e68-9b7a-9bc6b193f001` | firmware -> mobile | read, notify | Add |
| Backlog ack | `5f7e2d00-6c2e-4e68-9b7a-9bc6b193f002` | mobile -> firmware | write | Add |
| Internet status | `cba1d466-344c-4be3-ab3f-189f80dd7518` | mobile -> firmware | write | Keep existing UUID |
| Node status | `cba1d466-344c-4be3-ab3f-189f80dd7519` | firmware -> mobile | read, notify | Add |

BLE encoding rules:

- Use UTF-8 JSON for all BLE payloads.
- Keep payloads small and bounded; reject payloads above agreed characteristic size.
- Numeric fields stay numeric in JSON and must fit PRD ranges.
- Firmware must reject malformed JSON, out-of-range node IDs, invalid timestamps, invalid coordinates, unsupported message values, and writes before validation.
- Mobile must validate decoded BLE JSON before changing trusted connection, storage, or sync state.

Node identity payload:

```json
{
  "protocol": "loom-ble-v1",
  "nodeId": 123456,
  "firmwareVersion": "0.1.0",
  "capabilities": ["lora_v2", "backlog_stream", "internet_status"]
}
```

Validation flow:

1. Mobile connects and reads node identity.
2. Mobile reads validation challenge:

```json
{ "challenge": "8-to-16-printable-chars" }
```

3. Mobile asks the user to confirm or enter expected node ID.
4. Mobile writes:

```json
{ "nodeId": 123456, "challenge": "same-challenge" }
```

5. Firmware notifies:

```json
{ "validated": true, "nodeId": 123456 }
```

or:

```json
{ "validated": false, "error": "validation_failed" }
```

MVP validation is node-ID confirmation plus challenge echo. It is not cryptographic authentication.

Mobile message write payload:

```json
{
  "protocol": "loom-ble-v1",
  "clientMessageId": "uuid",
  "message": "medical_help",
  "timestamp": "2026-05-15T10:00:00.000Z",
  "lat": -6.208763,
  "lon": 106.845599,
  "latE6": -6208763,
  "lonE6": 106845599,
  "kind": "emergency"
}
```

Safe status payload:

```json
{
  "protocol": "loom-ble-v1",
  "clientMessageId": "uuid",
  "message": "fine",
  "timestamp": "2026-05-15T10:00:00.000Z",
  "kind": "safe"
}
```

Message ack payload:

```json
{
  "clientMessageId": "uuid",
  "accepted": true,
  "senderNodeId": 123456,
  "seqId": 42,
  "queued": false,
  "rangeToGateway": 2
}
```

Backlog item payload:

```json
{
  "backlogId": "123456:42",
  "senderNodeId": 123456,
  "seqId": 42,
  "senderRangeToGateway": 5,
  "lastForwarderRangeToGateway": 1,
  "timestamp": "2026-05-15T10:00:00.000Z",
  "lat": -6.208763,
  "lon": 106.845599,
  "latE6": -6208763,
  "lonE6": 106845599,
  "message": "medical_help",
  "receivedByNodeId": 900001,
  "source": "lora_mesh"
}
```

Backlog ack payload:

```json
{
  "backlogIds": ["123456:42", "123456:43"],
  "receipt": "stored_on_mobile"
}
```

Internet status payload:

```json
{
  "online": true,
  "observedAt": "2026-05-15T10:00:00.000Z",
  "mobileInstallationId": "uuid"
}
```

Node status payload:

```json
{
  "nodeId": 123456,
  "validated": true,
  "rangeToGateway": 0,
  "neighborCount": 2,
  "pendingCount": 1,
  "backlogCount": 3,
  "internetPathActive": true
}
```

### 4.3 Backend Ingest Mapping

Mobile sends `POST /api/ingest/burst` with:

```json
{
  "uploaderType": "mobile_app",
  "mobileInstallationId": "uuid",
  "uploadedAt": "2026-05-15T10:05:00.000Z",
  "messages": [
    {
      "senderNodeId": 123456,
      "seqId": 42,
      "senderRangeToGateway": 5,
      "lastForwarderRangeToGateway": 1,
      "timestamp": "2026-05-15T10:00:00.000Z",
      "lat": -6.208763,
      "lon": 106.845599,
      "latE6": -6208763,
      "lonE6": 106845599,
      "message": "medical_help",
      "receivedByNodeId": 900001,
      "source": "lora_mesh"
    }
  ]
}
```

Rules:

- Backend dedup key is `senderNodeId + ":" + seqId`.
- Mobile marks `accepted` and `duplicate` items as synced.
- Mobile retains `rejected` items with reason.
- Mobile never deletes backlog only because the HTTP request returned JSON.
- Firmware never talks to MongoDB.
- Mobile never talks to MongoDB.

## 5. Shared Contract Phase

This phase must happen before the firmware and mobile tracks diverge too far. Either owner can implement these tasks, but both must review.

### S-001: Align LoRa constants and fixtures with PRD

Files:

- `packages/contracts/src/constants/index.ts`
- `packages/test-fixtures/src/index.ts`
- Contract tests if any are added/changed.
- Any docs/ADR that freeze byte-level examples.

Subplan:

1. Change `LORA_PACKET_MAGIC` from `0x4c4d` to `0xd15a`.
2. Export LoRa constants:
   - `LORA_HEARTBEAT_PACKET_SIZE = 10`
   - `LORA_DATA_HEADER_SIZE = 26`
   - `LORA_NODE_ID_SIZE = 3`
   - `LORA_HEARTBEAT_INTERVAL_MIN_MS = 12000`
   - `LORA_HEARTBEAT_INTERVAL_MAX_MS = 18000`
   - `LORA_ROUTE_RECOMPUTE_MS = 5000`
   - `LORA_NEIGHBOR_TIMEOUT_MS = 60000`
   - `LORA_SEEN_CACHE_EXPIRY_MS = 1800000`
   - `LORA_PENDING_EXPIRY_MS = 1800000`
   - `LORA_FORWARD_DELAY_MIN_MS = 100`
   - `LORA_FORWARD_DELAY_MAX_MS = 1000`
3. Replace heartbeat fixture with a PRD-compliant big-endian 10-byte fixture.
4. Add one DATA fixture with:
   - `senderNodeId = 123456`
   - `seqId = 42`
   - `senderRangeToGateway = 5`
   - `forwarderRangeToGateway = 5`
   - `timestamp = 1710000123`
   - `latE6 = -6208763`
   - `lonE6 = 106845599`
   - `message = "medical_help"`
5. Add expected dedup key and expected backend burst item fixture.

Exit criteria:

- Shared fixture bytes are stable.
- Firmware owner can copy fixture bytes into codec tests.
- Mobile owner can copy backend fixture into sync tests.

### S-002: Add BLE contract source of truth

Files:

- Add `docs/adr/00NN-loom-ble-v1-contract.md` or update an existing ADR if appropriate.
- Optionally add `packages/contracts/src/ble.ts` or `packages/contracts/src/schemas/ble.ts` for TypeScript consumers.

Subplan:

1. Record the BLE UUID table from section 4.2.
2. Record JSON payloads and rejection rules.
3. If adding TypeScript schemas, export:
   - `loomBleServiceUuid`
   - `bleNodeIdentitySchema`
   - `bleValidationChallengeSchema`
   - `bleValidationRequestSchema`
   - `bleValidationResponseSchema`
   - `bleMobileMessageSchema`
   - `bleMessageAckSchema`
   - `bleBacklogItemSchema`
   - `bleBacklogAckSchema`
   - `bleInternetStatusSchema`
   - `bleNodeStatusSchema`
4. Ensure mobile imports these constants rather than duplicating strings where possible.
5. Firmware should mirror the UUIDs in a single `config.h` section with comments pointing to the shared contract.

Exit criteria:

- Firmware and mobile have one BLE source of truth.
- Mock BLE payloads and firmware payloads use the same shape.

### S-003: Implement decision-tree package scaffold

Owner: Mobile owner.

Files:

- `packages/decision-tree/package.json`
- `packages/decision-tree/tsconfig.json`
- `packages/decision-tree/src/index.ts`
- `packages/decision-tree/src/compress.ts`
- `packages/decision-tree/src/taxonomy.ts`
- `packages/decision-tree/src/*.test.ts`
- root `package.json`
- root lockfile

Subplan:

1. Add `@loom/decision-tree` workspace.
2. Export:
   - `compressEmergencyText(input: string): CompressionResult`
   - `isSupportedMessageValue(value: string): value is MessageValue`
   - `messageValueMetadata`
3. Use only canonical values:
   - `fine`
   - `needs_rescue`
   - `medical_help`
   - `food_water`
   - `shelter_needed`
   - `trapped`
   - `danger`
   - `unknown`
4. Safe status must not call compression. Mobile sends `fine` directly.
5. Compression result:

```ts
type CompressionResult =
  | { ok: true; message: MessageValue; confidence: "high" | "medium"; matchedKeywords: string[] }
  | { ok: false; reason: "empty" | "too_long" | "unsupported" | "ambiguous"; suggestions: MessageValue[] };
```

6. Add Indonesian and English keyword coverage for rescue, medical, food/water, shelter, trapped, and danger.
7. Return `ok: false` for ambiguous text instead of silently using `unknown`.

Exit criteria:

- Decision-tree tests pass.
- Mobile no longer uses `src/utils/compression.ts` for canonical mapping.

## 6. Firmware Track

The firmware owner should implement this track in order. The mobile owner can work with mocks while firmware progresses.

### F0: Project structure and configuration

Goal: turn the node prototype into a testable firmware project without losing useful pin and PlatformIO setup.

Files to add/change:

- `firmware/loom-node/platformio.ini`
- `firmware/loom-node/src/main.cpp`
- `firmware/loom-node/src/config.h`
- `firmware/loom-node/src/protocol.h`
- `firmware/loom-node/src/protocol.cpp`
- `firmware/loom-node/src/message_value.h`
- `firmware/loom-node/src/time_utils.h`
- `firmware/loom-node/test/**`

Subplan:

1. Keep Arduino + PlatformIO unless hardware work proves it unsuitable.
2. Move pin constants, frequency, node ID, route constants, BLE UUIDs, and queue sizes into `config.h`.
3. Remove hardcoded periodic `MESSAGE_VALUE` send from `loop()`.
4. Make `main.cpp` thin:
   - initialize serial, LoRa, BLE, routing, queues;
   - call `loraTransport.poll(nowMs)`;
   - call `routing.tick(nowMs)`;
   - call `bleBridge.tick(nowMs)`;
   - call `pendingQueue.prune(nowMs)` and `backlogStore.prune(nowMs)` as needed.
5. Leave `firmware/loom-gateway` untouched until node firmware is PRD-compliant, except for shared codec updates if tests require it.

Exit criteria:

- Node firmware compiles.
- Non-hardware modules can be unit-tested without parsing `main.cpp`.

### F1: Protocol codec

Goal: encode/decode HEARTBEAT and DATA exactly according to PRD LoRa V2.

Files:

- `protocol.h`
- `protocol.cpp`
- `message_value.h`
- `test/test_protocol.cpp`

Data structures:

```cpp
struct HeartbeatPacket {
  uint32_t nodeId;
  uint16_t rangeToGateway;
  uint16_t heartbeatSeq;
};

struct DataPacket {
  uint32_t senderNodeId;
  uint32_t seqId;
  uint16_t senderRangeToGateway;
  uint16_t forwarderRangeToGateway;
  uint32_t timestamp;
  int32_t latE6;
  int32_t lonE6;
  char message[32];
  uint8_t messageLength;
};
```

Subplan:

1. Implement big-endian helpers:
   - `writeUint16BE`
   - `readUint16BE`
   - `writeUint24BE`
   - `readUint24BE`
   - `writeUint32BE`
   - `readUint32BE`
   - `writeInt32BE`
   - `readInt32BE`
2. Implement:
   - `encodeHeartbeat`
   - `decodeHeartbeat`
   - `encodeData`
   - `decodeData`
3. Validate:
   - magic value;
   - packet type;
   - exact/minimum length;
   - node ID range;
   - route range;
   - ASCII message bytes;
   - canonical message value;
   - output buffer size.
4. DATA message is packet remainder after offset 26.
5. Do not call LoRa APIs inside codec.

Tests:

- HEARTBEAT fixture encodes exact hex.
- HEARTBEAT fixture decodes exact fields.
- DATA fixture encodes exact hex.
- DATA fixture decodes exact fields.
- `123456` encodes as uint24 big-endian `01 E2 40`.
- `lat=-6.208763` and `lon=106.845599` convert to `-6208763` and `106845599`.
- Wrong magic is rejected.
- Old little-endian prototype bytes are rejected.

Exit criteria:

- Codec tests pass.
- All LoRa packet construction goes through codec.

### F2: Dedup cache

Goal: drop duplicate DATA by `senderNodeId + seqId` with 30-minute expiry.

Files:

- `dedup_cache.h`
- `dedup_cache.cpp`
- `test/test_dedup_cache.cpp`

Subplan:

1. Implement fixed-capacity `DedupCache`.
2. Store `senderNodeId`, `seqId`, `expiresAtMs`, and occupied flag.
3. API:
   - `bool has(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs)`
   - `void add(uint32_t senderNodeId, uint32_t seqId, uint32_t nowMs)`
   - `void prune(uint32_t nowMs)`
4. Expire after 30 minutes.
5. Evict expired entries first; if still full, evict oldest expiry.
6. Avoid default zero-memory false positives.

Tests:

- New key is not duplicate.
- Added key is duplicate.
- Same sender different seq is not duplicate.
- Different sender same seq is not duplicate.
- Entry expires after 30 minutes.
- Full cache evicts deterministically.

Exit criteria:

- Receive DATA and own-origin DATA can both mark dedup entries.

### F3: Pending queue

Goal: queue locally created messages when route is unknown.

Files:

- `pending_queue.h`
- `pending_queue.cpp`
- `test/test_pending_queue.cpp`

Subplan:

1. Implement bounded queue storing full `DataPacket`.
2. Store `createdAtMs` and `expiresAtMs`.
3. API:
   - `bool push(const DataPacket&, uint32_t nowMs)`
   - `bool popReady(DataPacket* out)`
   - `void prune(uint32_t nowMs)`
   - `size_t size()`
4. Expire after 30 minutes.
5. If full, drop oldest `fine` before emergency values; if no `fine`, drop oldest item.
6. Flush only when current `rangeToGateway != ROUTE_INFINITY`.

Tests:

- Unknown route queues origin message.
- Pending expires after 30 minutes.
- Full queue drops oldest safe message first.
- Flush order is FIFO.

Exit criteria:

- Firmware never broadcasts new origin DATA while route is unknown.

### F4: Backlog store

Goal: retain received/origin DATA that needs mobile handoff.

Files:

- `backlog_store.h`
- `backlog_store.cpp`
- `test/test_backlog_store.cpp`

Subplan:

1. Store full `DataPacket`.
2. Derive `backlogId = senderNodeId + ":" + seqId`.
3. Store `receivedByNodeId`, `storedAtMs`, `deliveredToMobileAtMs`, and `ackedByMobile`.
4. Upsert by dedup key to avoid duplicate backlog entries.
5. Add received LoRa DATA after dedup.
6. Add own-origin DATA when the mobile app should later upload it.
7. Do not clear until mobile ack confirms local storage.
8. Keep an explicit capacity policy; drop oldest non-critical item first when full.

Tests:

- Backlog upsert dedups by key.
- Ack marks item acked.
- Unacked item remains.
- Capacity policy is deterministic.

Exit criteria:

- BLE bridge can stream backlog reliably.

### F5: Routing state and neighbor table

Goal: implement the PRD range-to-gateway gradient.

Files:

- `routing.h`
- `routing.cpp`
- `test/test_routing.cpp`

Subplan:

1. Implement neighbor table entries:
   - `neighborId`
   - `rangeToGateway`
   - `heartbeatSeq`
   - `lastSeenMs`
   - optional RSSI/SNR diagnostics.
2. On heartbeat decode:
   - ignore self;
   - update or insert neighbor;
   - store latest heartbeat sequence.
3. Every 5 seconds:
   - remove neighbors older than 60 seconds;
   - if `internetPathActive`, set self range to 0;
   - else choose fresh neighbor with smallest finite range and set self range to `neighbor.range + 1`;
   - if none exists, set range to `ROUTE_INFINITY`.
4. Implement stale gateway protection:
   - if previous best route times out, return to `ROUTE_INFINITY` for a recompute cycle before trusting child routes.
5. Expose route state to BLE node status.

Tests:

- No neighbors gives 65535.
- Internet path gives 0.
- Neighbor range 0 gives self range 1.
- Neighbor range 2 gives self range 3.
- Stale neighbor is removed after 60 seconds.
- Stale gateway timeout does not instantly trust old child route.

Exit criteria:

- Route recompute acceptance criteria pass.

### F6: Heartbeat scheduler

Goal: send PRD heartbeat every 12 to 18 seconds.

Files:

- `routing.*`
- `lora_transport.*`
- `main.cpp`
- `test/test_heartbeat_scheduler.cpp` if feasible.

Subplan:

1. Maintain `heartbeatSeq`.
2. Schedule next heartbeat with random interval between 12000 and 18000 ms.
3. Encode heartbeat with current range.
4. Apply to every node role that sends heartbeat.
5. Include route range 0 when mobile internet path is active.

Tests:

- Scheduled intervals stay in range.
- Heartbeat seq increments.
- Encoded packet matches codec fixture shape.

Exit criteria:

- Firmware sends compliant heartbeat timing and bytes.

### F7: DATA origin, forwarding, and delayed transmit

Goal: handle origin messages and forwarding exactly as PRD requires.

Files:

- `lora_transport.h`
- `lora_transport.cpp`
- `routing.*`
- `pending_queue.*`
- `backlog_store.*`
- `test/test_forwarding.cpp`

Subplan:

1. Origin message:
   - assign local `seqId`;
   - use current `rangeToGateway` as sender and forwarder range;
   - use mobile timestamp and location if provided;
   - use no-fix sentinel if location missing;
   - add to dedup after accepted.
2. If range is unknown:
   - queue in pending;
   - BLE ack `queued: true`.
3. If range is known:
   - encode and transmit DATA;
   - BLE ack `queued: false`.
4. Receive DATA:
   - decode with codec;
   - ignore self-origin packets;
   - drop duplicates;
   - store backlog;
   - if `self.rangeToGateway < packet.forwarderRangeToGateway`, schedule forward;
   - if self range is 65535, do not forward.
5. Forward:
   - random delay 100 to 1000 ms;
   - update only `forwarderRangeToGateway`;
   - preserve sender ID, seq ID, sender range, timestamp, coordinates, and message.
6. Flush pending when route becomes known.

Tests:

- Unknown route queues.
- Known route sends.
- Forward denied for equal/higher range.
- Forward denied for 65535.
- Forward allowed when lower.
- Forward updates only forwarder range.
- Random delay is within range.

Exit criteria:

- Firmware DATA behavior satisfies PRD scenarios 31 through 40.

### F8: BLE bridge

Goal: expose all PRD-required mobile/node interactions.

Files:

- `ble_bridge.h`
- `ble_bridge.cpp`
- `config.h`
- `main.cpp`

Subplan:

1. Advertise service UUID and device name `LOOM-Node-<nodeId>`.
2. Identity characteristic:
   - read returns node identity payload.
3. Validation characteristic:
   - read returns current challenge;
   - write validates node ID and challenge;
   - notify validation result;
   - maintain `validated` session state.
4. Message write:
   - reject before validation;
   - parse JSON payload;
   - validate canonical message and coordinates;
   - create origin DATA through routing/origin API;
   - notify message ack.
5. Backlog stream:
   - stream pending backlog items after validation;
   - support read of next item if notifications are not available.
6. Backlog ack:
   - accept `stored_on_mobile`;
   - mark backlog entries acked only after successful local storage on mobile.
7. Internet status:
   - reject before validation or accept but do not trust until validation; choose one and document it;
   - parse structured online/offline payload;
   - update `internetPathActive` freshness.
8. Node status:
   - read/notify route, neighbor, pending, backlog, and internet state.

Manual checks:

- Mobile can scan, connect, read identity, validate, send safe, get ack, receive backlog, ack backlog, and set internet status.

Exit criteria:

- Firmware BLE contract is complete and usable by mobile mocks/real app.

### F9: LoRa transport integration

Goal: isolate radio IO from protocol/routing logic.

Files:

- `lora_transport.h`
- `lora_transport.cpp`
- `main.cpp`

Subplan:

1. Initialize SPI and LoRa pins from config.
2. Poll `LoRa.parsePacket()`.
3. Read bytes into bounded buffer.
4. Pass bytes to protocol decode.
5. Dispatch HEARTBEAT to routing.
6. Dispatch DATA to receive handler.
7. Send encoded bytes from origin, pending flush, heartbeat, and delayed forward queues.
8. Capture RSSI/SNR for diagnostics only.

Exit criteria:

- Radio IO is isolated from packet field parsing.

### F10: Gateway prototype policy

Goal: prevent `loom-gateway` from blocking mobile MVP while keeping it coherent.

Subplan:

1. Do not rely on `firmware/loom-gateway` for mobile PRD acceptance.
2. If touched, update it to share protocol constants/code patterns:
   - `0xD15A`;
   - big-endian;
   - heartbeat sequence;
   - DATA lat/lon parsing.
3. Remove hardcoded WiFi credentials before real use.
4. Preserve gateway upload as optional `uploaderType: "gateway_node"` only.

Exit criteria:

- Gateway is either clearly optional or protocol-aligned.

### F11: Firmware verification

Automated checks:

- PlatformIO build for `firmware/loom-node`.
- Unit tests for protocol, dedup, pending, backlog, routing, and forwarding.

Manual hardware checks:

1. One node advertises BLE identity.
2. Mobile validation mismatch is rejected.
3. Mobile validation match succeeds.
4. Safe `fine` message receives ack.
5. Unknown route queues pending.
6. Online mobile sets node range to 0.
7. Two nodes exchange heartbeat and compute range 1.
8. Three nodes form gradient 0 -> 1 -> 2.
9. DATA moves only toward lower range.
10. Duplicate DATA is dropped.
11. Backlog streams to mobile and clears only after mobile ack.

Firmware done when:

- All PRD firmware acceptance criteria pass in tests or documented hardware checks.

## 7. Mobile Track

The mobile owner should implement this track in order, using a mock BLE client until real firmware BLE is ready.

### M0: Workspace, tooling, and build repair

Goal: make mobile visible to automated checks.

Files:

- root `package.json`
- root lockfile if workspace changes require it
- `apps/mobile/package.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/App.tsx`
- `apps/mobile/index.ts`

Subplan:

1. Decide whether mobile is a root npm workspace. Recommended: add `apps/mobile` to root workspaces.
2. Rename package to `@loom/mobile`.
3. Add scripts:
   - `typecheck`
   - `test`
   - `lint` if local lint config is used.
4. Fix invalid `ignoreDeprecations`.
5. Align entrypoint:
   - keep `expo-router/entry` as canonical;
   - remove or ignore default `App.tsx` and `index.ts` to avoid confusion.
6. Run mobile typecheck.

Exit criteria:

- `npm run typecheck -w @loom/mobile` or equivalent passes.
- Root checks either include mobile or intentionally document why not.

### M1: App architecture boundaries

Goal: isolate BLE, compression, storage, sync, and UI.

Target modules:

- `apps/mobile/src/ble/client.ts`
- `apps/mobile/src/ble/mockClient.ts`
- `apps/mobile/src/ble/nativeClient.ts`
- `apps/mobile/src/connection/connectionStore.ts`
- `apps/mobile/src/messages/buildMobileMessage.ts`
- `apps/mobile/src/storage/database.ts`
- `apps/mobile/src/storage/sentMessages.ts`
- `apps/mobile/src/storage/backlogItems.ts`
- `apps/mobile/src/sync/burstClient.ts`
- `apps/mobile/src/sync/syncBacklog.ts`
- `apps/mobile/src/location/locationService.ts`
- `apps/mobile/src/config/appConfig.ts`

Subplan:

1. Keep UI components thin.
2. Do not build backend request bodies in React components.
3. Do not parse BLE payloads in React components.
4. Do not store raw arbitrary JSON without validation.
5. Use shared contracts for message values and backend schema where practical.

Exit criteria:

- Critical logic has testable modules.

### M2: Environment and identity config

Goal: configure backend API and stable mobile identity.

Subplan:

1. Add API base URL config:
   - production default `https://api.loomnetwork.site`;
   - development override through Expo public env or settings.
2. Generate and persist `mobileInstallationId` on first launch.
3. Store app settings:
   - API base override;
   - last validated node ID;
   - last BLE device ID for convenience only.
4. Never treat last BLE device ID as trusted without validation.

Exit criteria:

- Burst sync can target local or production API without source edits.

### M3: Local storage and migrations

Goal: support offline sent history, received backlog, and sync state.

Recommended data models:

```ts
type SentMessageStatus = "draft" | "sent_to_node" | "queued" | "synced" | "failed";

type LocalSentMessage = {
  clientMessageId: string;
  connectedNodeId: number;
  senderNodeId?: number;
  seqId?: number;
  message: MessageValue;
  rawText?: string;
  kind: "safe" | "emergency";
  status: SentMessageStatus;
  createdAt: string;
  sentToNodeAt?: string;
  syncedAt?: string;
  failureReason?: string;
  lat?: number;
  lon?: number;
  latE6?: number;
  lonE6?: number;
};

type LocalBacklogItem = {
  backlogId: string;
  senderNodeId: number;
  seqId: number;
  senderRangeToGateway: number;
  lastForwarderRangeToGateway: number;
  timestamp: string;
  message: MessageValue;
  receivedByNodeId?: number | null;
  source: "lora_mesh" | "gateway_node" | "mobile_app";
  lat?: number | null;
  lon?: number | null;
  latE6?: number | null;
  lonE6?: number | null;
  syncStatus: "pending" | "syncing" | "synced" | "rejected" | "failed";
  syncAttempts: number;
  lastSyncError?: string;
};
```

Subplan:

1. Prefer SQLite because Expo SQLite is already installed and backlog needs query/update semantics.
2. Add schema version and migrations from version 1.
3. Migrate or intentionally reset old AsyncStorage prototype data.
4. Sent history:
   - create draft when needed;
   - mark `sent_to_node` when firmware ack says `queued: false`;
   - mark `queued` when firmware ack says `queued: true`;
   - mark `failed` on BLE error/timeout.
5. Backlog:
   - upsert by `backlogId`;
   - track sync attempts and reason;
   - keep rejected items.
6. Add selectors for UI counts.

Tests:

- Status transitions.
- Backlog dedup.
- Accepted/duplicate marks synced.
- Rejected remains local.

Exit criteria:

- App can show sent history and backlog status offline.

### M4: Permissions and location

Goal: request hardware permissions only when needed and attach GPS when available.

Subplan:

1. BLE scan flow requests Bluetooth permissions.
2. Android requests required scan/connect/location permissions by SDK version.
3. Composer and safe status request foreground location only when sending or refreshing location.
4. If allowed, compute:
   - `latE6 = Math.round(lat * 1_000_000)`
   - `lonE6 = Math.round(lon * 1_000_000)`
5. If denied/unavailable, send without lat/lon and let firmware encode no-fix sentinel.
6. Settings screen must show real permission/network state, not fake switches.

Tests:

- Location denied still allows send.
- E6 conversion works.
- Invalid coordinates are rejected.

Exit criteria:

- Mobile can send timestamped messages with or without location.

### M5: BLE client and connection state machine

Goal: discover, connect, validate, and communicate with nearby LOOM nodes.

API:

```ts
type BleClient = {
  requestPermissions(): Promise<boolean>;
  scanForNodes(onNode: (node: DiscoveredNode) => void): Promise<() => void>;
  connect(deviceId: string): Promise<void>;
  disconnect(): Promise<void>;
  readNodeIdentity(): Promise<BleNodeIdentity>;
  readValidationChallenge(): Promise<BleValidationChallenge>;
  validateNode(nodeId: number, challenge: string): Promise<BleValidationResponse>;
  writeMessage(payload: BleMobileMessage): Promise<BleMessageAck>;
  subscribeBacklog(onItem: (item: BleBacklogItem) => void): Unsubscribe;
  ackBacklog(ids: string[]): Promise<void>;
  writeInternetStatus(payload: BleInternetStatus): Promise<void>;
  subscribeNodeStatus(onStatus: (status: BleNodeStatus) => void): Unsubscribe;
};
```

Subplan:

1. Implement mock client first.
2. Implement native `react-native-ble-plx` client.
3. Scan by service UUID, not only device name.
4. Keep BLE `deviceId` separate from LOOM numeric `nodeId`.
5. Connection states:
   - idle;
   - scanning;
   - found;
   - connecting;
   - validating;
   - connected;
   - failed;
   - disconnected.
6. Reject message writes before validation.
7. On disconnect, clear active session but keep local history/backlog.

Tests:

- Mock scan finds node.
- Validation accepts matching node ID.
- Validation rejects mismatch.
- Message write before validation throws.
- Disconnect transitions state.

Exit criteria:

- PRD discovery and validation criteria pass with mock and real firmware.

### M6: Composer and decision-tree compression

Goal: free text becomes exactly one canonical `message` value before firmware.

Subplan:

1. Replace `apps/mobile/src/utils/compression.ts` with `@loom/decision-tree`.
2. On emergency send:
   - trim input;
   - call `compressEmergencyText`;
   - if high confidence, continue;
   - if medium confidence, ask user to confirm category;
   - if not ok, show supported category choices or ask for shorter text.
3. Never send raw text to firmware/backend.
4. Store raw text only in local sent history.
5. Enforce max input length and ASCII/canonical output constraints.

Tests:

- Representative text maps to expected category.
- Unsupported text blocks send.
- Raw text is absent from BLE payload.

Exit criteria:

- Mobile free-text acceptance criterion passes.

### M7: Safe status fixed flow

Goal: safe status always sends `fine` and bypasses compression.

Subplan:

1. Implement a dedicated safe action or make `Aman` status path strict.
2. Payload:
   - `kind = "safe"`;
   - `message = "fine"`;
   - `timestamp = now ISO`;
   - optional coordinates.
3. Do not use optional note as transmitted `message`.
4. Store optional note locally only if retained.

Tests:

- Safe payload always uses `fine`.
- Compression is not called.
- Sent history updates from firmware ack.

Exit criteria:

- Safe-status PRD criterion passes.

### M8: Message send and ack handling

Goal: send safe/emergency messages over BLE and update local state from firmware ack.

Subplan:

1. Build `BleMobileMessage` from safe/composer flow.
2. Validate payload before BLE write.
3. Write message characteristic.
4. Wait for ack notification or timeout.
5. On accepted ack:
   - store `senderNodeId`;
   - store `seqId`;
   - set `queued` or `sent_to_node` based on ack.
6. On rejected ack:
   - set `failed`;
   - store reason.
7. On timeout:
   - set `failed`;
   - offer retry.

Tests:

- Queued ack updates status `queued`.
- Broadcast ack updates status `sent_to_node`.
- Timeout updates status `failed`.

Exit criteria:

- Owner can send safe/emergency reports after validated local connection.

### M9: Backlog receive and firmware ack

Goal: receive node backlog and persist it before acking firmware.

Subplan:

1. Subscribe to backlog after validation.
2. Validate each `BleBacklogItem`.
3. Convert no-fix sentinel to null/omitted location for storage/backend.
4. Upsert by `backlogId`.
5. Ack firmware only after storage succeeds.
6. If storage fails, do not ack.
7. Show pending/synced/rejected counts in sync status/history UI.

Tests:

- Valid backlog stores and acks.
- Duplicate backlog does not duplicate storage.
- Invalid backlog is not acked.
- No-fix sentinel maps to null/omitted location.

Exit criteria:

- Mobile receives and preserves node backlog offline.

### M10: Burst sync to backend

Goal: upload backlog directly to backend when internet is available.

Subplan:

1. Replace `src/api/burst.ts` with typed sync module.
2. Build `BurstIngestRequest` exactly:
   - `uploaderType = "mobile_app"`;
   - `mobileInstallationId`;
   - `uploadedAt = now ISO`;
   - `messages = pending backlog batch`.
3. Use ISO timestamps, canonical message values, and valid coordinate ranges.
4. Batch up to `MAX_INGEST_BATCH_SIZE` or 100.
5. Check `response.ok`.
6. Validate response shape.
7. Per item:
   - `accepted` -> synced;
   - `duplicate` -> synced;
   - `rejected` -> rejected with reason.
8. On request failure:
   - failed;
   - increment attempts;
   - retry with exponential backoff from 5 seconds to 5 minutes.
9. Do not clear all backlog globally.

Tests:

- Builds valid request.
- Accepted marks synced.
- Duplicate marks synced.
- Rejected remains local.
- Mixed response handled per item.
- HTTP 500 does not delete backlog.

Exit criteria:

- Mobile burst acceptance criteria pass.

### M11: Internet path advertisement

Goal: tell validated node when phone can act as gateway path.

Subplan:

1. Observe network state while connected and validated.
2. On online:

```json
{ "online": true, "observedAt": "...", "mobileInstallationId": "..." }
```

3. Refresh every 15 seconds while online.
4. On offline:

```json
{ "online": false, "observedAt": "...", "mobileInstallationId": "..." }
```

5. On disconnect, best-effort write offline before disconnect.
6. Show range 0 only when firmware node status reports it.

Tests:

- Online state writes online payload.
- Offline transition writes offline payload.
- Periodic refresh occurs.
- No write before validation.

Exit criteria:

- Node can advertise gateway range while phone internet path is fresh.

### M12: Screen completion

Goal: align UI with required PRD owner workflows.

Screens/routes:

1. Connect Node:
   - scan button;
   - connection state;
   - selected validated node summary.
2. Nearby Nodes:
   - scanning;
   - discovered nodes;
   - empty/error states.
3. Node ID Validation:
   - show detected node ID;
   - allow expected ID entry/confirmation;
   - generic validation failure.
4. Message Composer:
   - emergency text input;
   - category confirmation if needed;
   - send status.
5. Safe Status:
   - fixed `fine` action.
6. Sent History:
   - local messages with `draft`, `sent_to_node`, `queued`, `synced`, `failed`.
7. Sync Status:
   - backlog counts;
   - pending/synced/rejected;
   - latest sync result;
   - manual retry.
8. Settings/Permissions:
   - real Bluetooth/location/network state;
   - API base display;
   - mobile installation ID for debugging.

Design rules:

- Offline-first.
- No marketing landing page.
- Do not claim guaranteed LoRa delivery.
- Keep emergency send path short.
- Avoid technical BLE detail outside settings/debug.

Exit criteria:

- All PRD mobile screens/workflows are usable.

### M13: Encoding and copy cleanup

Goal: remove mojibake and misleading delivery copy.

Subplan:

1. Normalize source files as UTF-8 or replace emoji with icon assets/components.
2. Replace garbled strings such as `âœ…`, `ðŸ“¡`, and `Â±`.
3. Keep delivery language accurate:
   - BLE ack means node accepted/queued, not cloud delivered.
   - backend sync means accepted/duplicate.
   - LoRa is best-effort.

Exit criteria:

- UI text renders cleanly and does not overstate delivery guarantees.

### M14: Mobile verification

Automated checks:

- `npm run typecheck -w @loom/mobile`.
- `npm run test -w @loom/mobile`.
- `npm run test -w @loom/decision-tree`.
- Root `npm run typecheck` if mobile is included.
- Root `npm test` if mobile is included.

Manual checks:

1. App opens offline.
2. Permission denied path remains usable.
3. BLE scan finds mock and real firmware node.
4. Node ID validation rejects mismatch.
5. Node ID validation accepts match.
6. Safe status sends fixed `fine`.
7. Emergency text compresses to canonical value.
8. Sent history updates offline.
9. Backlog receives from firmware.
10. No internet keeps backlog local.
11. Internet restored triggers burst.
12. Accepted and duplicate mark synced.
13. Rejected remains visible.
14. Internet path advertisement makes firmware report range 0.

Mobile done when:

- All PRD mobile acceptance criteria pass with mocks.
- Single-node real firmware integration passes.

## 8. Parallel Execution Plan

### Batch 1: Contract alignment

Both owners:

- Review this file.
- Confirm PRD LoRa constants and BLE UUID table.
- Confirm `message` is DATA remainder after 26-byte header.
- Confirm no-fix sentinel.

Firmware owner:

- Start F0/F1 after S-001.

Mobile owner:

- Start M0/M1 and S-003.

Dependency:

- Firmware F1 and mobile M5/M10 must use shared constants/schemas.

### Batch 2: Independent core implementation

Firmware owner:

- F1 protocol codec.
- F2 dedup cache.
- F3 pending queue.
- F4 backlog store.
- F5 routing state.

Mobile owner:

- M2 config.
- M3 storage.
- M4 permissions/location.
- M5 mock BLE client.
- M6 composer/compression.
- M7 safe status.

Dependency:

- None beyond shared contracts.

### Batch 3: BLE integration

Firmware owner:

- F8 BLE bridge.
- F7 origin message path needed for message write.

Mobile owner:

- M5 real BLE client.
- M8 message send/ack.
- M9 backlog receive/ack.
- M11 internet advertisement.

Coordination test:

- scan -> connect -> read identity -> validate -> send safe -> firmware ack -> receive backlog -> mobile ack.

### Batch 4: LoRa and sync integration

Firmware owner:

- F6 heartbeat scheduler.
- F7 forwarding and delayed transmit.
- F9 LoRa transport integration.

Mobile owner:

- M10 burst sync.
- M12 screen completion.
- M13 encoding/copy cleanup.

Coordination test:

- Firmware sends backlog item over BLE.
- Mobile stores it.
- Mobile uploads it to backend.
- Backend response updates local status.

### Batch 5: Full acceptance

Both owners:

- Single-node BLE/mobile/backend flow.
- Three-node LoRa gradient flow.
- Failure paths:
  - phone offline;
  - phone online;
  - BLE disconnect;
  - stale gateway timeout;
  - duplicate LoRa packet;
  - backend partial rejection.

## 9. Integration Test Matrix

| Scenario | Firmware responsibility | Mobile responsibility | Expected result |
| --- | --- | --- | --- |
| BLE discovery | Advertise service and identity | Scan by service UUID | Node appears in nearby list |
| Node validation success | Challenge and validate matching node ID | Read identity, echo challenge | Trusted connected state |
| Node validation mismatch | Reject mismatch | Show failed state | No message writes allowed |
| Safe status | Accept `fine`, assign seqId | Send fixed `fine` | History records safe status |
| Emergency message | Accept canonical value only | Compress free text first | No raw text enters LoRa |
| Unknown route | Queue origin DATA | Mark status `queued` | Pending count increases |
| Known route | Broadcast origin DATA | Mark `sent_to_node` | LoRa packet sent |
| Backlog receive | Notify backlog item | Store then ack | Firmware marks item acked |
| Phone online | Set range 0 from fresh status | Write online status | Node status range 0 |
| Phone offline | Expire/clear internet path | Write offline status | Route recompute resumes |
| LoRa duplicate | Dedup drops repeat | Backend duplicate marks synced | No duplicate DB row |
| Burst partial response | N/A | Per-item update | Accepted/duplicate synced; rejected retained |

## 10. Backend/Web Touch Policy

Backend and web are outside this implementation track unless real integration exposes a contract bug.

Allowed backend changes:

- Add clearer rejected reason codes.
- Tune timestamp skew for offline backlog if current validation rejects legitimate disaster backlog.
- Add non-dedup diagnostic metadata.
- Add indexes if burst/history query patterns need them.

Disallowed backend changes:

- Do not change dedup away from `senderNodeId + seqId`.
- Do not dedup by phone, uploader, or batch.
- Do not let mobile or firmware access MongoDB.
- Do not weaken public lookup privacy.
- Do not add hosted CI/CD deployment for mobile.

Web changes are not expected except verifying that ingested mobile/firmware data appears in existing admin/public views.

## 11. Definition Of Done

### Firmware Done

- HEARTBEAT encode/decode exactly matches PRD.
- DATA encode/decode exactly matches PRD.
- All LoRa numeric fields are big-endian.
- Heartbeat interval is randomized from 12 to 18 seconds.
- Neighbor timeout is 60 seconds.
- Route recompute runs every 5 seconds.
- Stale gateway timeout returns to `65535` before trusting child routes.
- Dedup cache expires entries after 30 minutes.
- Pending queue stores origin messages when route is unknown.
- DATA forwarding only happens when self range is lower than packet forwarder range.
- Random forward delay is 100 to 1000 ms.
- BLE exposes identity, validation, message write, message ack, backlog, backlog ack, internet status, and node status.
- Firmware tests and documented hardware checks pass.

### Mobile Done

- App opens offline.
- App discovers nearby BLE nodes.
- App validates node ID before trusted connection.
- App sends safe status as fixed `fine`.
- App compresses emergency text into one canonical message value before BLE send.
- App never sends raw free text to firmware/backend.
- App stores sent history offline.
- App receives node backlog.
- App detects internet and bursts backlog to backend.
- App handles accepted, duplicate, and rejected per item.
- App retains rejected items.
- App notifies connected node when internet is available and unavailable.
- Mobile tests and manual device checks pass.

### Integrated Done

- One node owner can connect phone to ESP32, validate node ID, send safe status, and see it sync through backend/web after backlog upload.
- One node owner can send emergency text; mobile compresses it; firmware creates DATA; mobile/backend sync preserves canonical value.
- Three ESP32 nodes form a range gradient and forward DATA toward range 0.
- Duplicate LoRa packets do not create duplicate backend messages.
- Phone offline keeps backlog local.
- Phone online bursts backlog to backend.
- Admin and public web surfaces show resulting heatmap/history according to existing privacy rules.

## 12. Handoff Notes

- Start with S-001 and S-002. Do not build more code against `0x4C4D`.
- Keep existing BLE service/report/internet UUIDs unless a new ADR intentionally migrates them.
- Firmware and mobile mocks must use the same BLE JSON payloads.
- Prefer small PRs by layer: contracts, firmware codec, firmware routing/queues, mobile tooling, decision tree, mobile storage, mobile BLE mock, real BLE integration, sync integration.
- Update `.agent/implementationPhases.md`, `.agent/phaseBacklog.md`, and a new session handoff when major firmware/mobile milestones complete.
- Add an ADR if BLE UUIDs, LoRa no-fix sentinel behavior, or mobile Expo BLE constraints become long-lived implementation decisions.
