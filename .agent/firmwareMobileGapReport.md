# LOOM Firmware and Mobile Gap Report

Document status: Current repo gap analysis  
Updated: 2026-05-15  
Scope: `firmware/` and `apps/mobile/` gaps relative to `.agent/PRD.md`

## Executive Summary

`apps/mobile` is no longer placeholder-only. It now contains an Expo Router prototype with BLE scanning, a report composer, local AsyncStorage history, a simple burst uploader, and settings/help screens. The prototype is useful, but it is not PRD-compliant: it does not validate node ID before trusted connection, does not use canonical backend message values consistently, sends raw user text to firmware when text is present, has no node backlog receive/ack flow, builds an invalid backend burst request, clears all backlog on any apparent upload success, and currently fails TypeScript compilation.

`firmware` is also no longer placeholder-only. `firmware/loom-node` has a PlatformIO Arduino sketch with LoRa and partial NimBLE characteristics that match the current mobile UUIDs for report write and internet status. However, it remains a prototype. The LoRa packet contract still uses `0x4C4D` and little-endian fields instead of PRD `0xD15A` and big-endian/network byte order, HEARTBEAT and DATA packet shapes are incomplete, routing is not a real neighbor-table gradient, and required pending/backlog queues are missing.

The largest integration risk is contract drift across PRD, shared contracts, firmware, and mobile:

- PRD and ADR 0002 define LoRa V2 behavior, but `packages/contracts`, test fixtures, and firmware still encode `0x4C4D`.
- Backend accepts only canonical `message` values: `fine`, `needs_rescue`, `medical_help`, `food_water`, `shelter_needed`, `trapped`, `danger`, and `unknown`.
- Mobile compression emits unsupported values such as `critical_medical`, `need_water`, and `need_assistance`.
- Mobile and firmware share an ad hoc BLE contract with only report write and internet status; PRD requires identity read, validation challenge/response, backlog stream/read, backlog ack, and node status.

Do not use the previous assumption that mobile is empty. The current implementation starting point is "prototype with partial UI/BLE/storage/sync", not "README placeholder".

## Sources Reviewed

- `.agent/PRD.md`
- `.agent/rules.md`
- `docs/adr/0002-lora-protocol-v2.md`
- `docs/adr/0003-mobile-direct-burst-api.md`
- `package.json`
- `packages/contracts/src/constants/index.ts`
- `packages/contracts/src/enums/index.ts`
- `packages/contracts/src/schemas/ingest.ts`
- `packages/test-fixtures/src/index.ts`
- `packages/decision-tree/README.md`
- `firmware/README.md`
- `firmware/loom-node/platformio.ini`
- `firmware/loom-node/src/main.cpp`
- `firmware/loom-gateway/platformio.ini`
- `firmware/loom-gateway/src/main.cpp`
- `apps/mobile/package.json`
- `apps/mobile/app.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/App.tsx`
- `apps/mobile/index.ts`
- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/history.tsx`
- `apps/mobile/app/help.tsx`
- `apps/mobile/app/settings.tsx`
- `apps/mobile/src/api/burst.ts`
- `apps/mobile/src/ble/BleManager.ts`
- `apps/mobile/src/ble/useBleScanner.ts`
- `apps/mobile/src/hooks/useSelectedNode.ts`
- `apps/mobile/src/storage/localStore.ts`
- `apps/mobile/src/utils/compression.ts`
- `apps/mobile/src/utils/location.ts`

## Verification Run

Command:

```text
npx tsc --noEmit -p apps/mobile/tsconfig.json
```

Result:

```text
apps/mobile/tsconfig.json(5,27): error TS5103: Invalid value for '--ignoreDeprecations'.
```

No tracked test files were found under `apps/mobile` or `firmware`.

## Current Implementation Inventory

| Area | Current repo state | PRD-ready status |
| --- | --- | --- |
| Mobile app | Expo Router prototype with report/history/help/settings tabs, BLE mock/native wrapper, AsyncStorage history/backlog, location helper, and burst uploader. | Prototype only; not PRD-compliant |
| Mobile workspace integration | `apps/mobile/package.json` exists, but root `package.json` workspaces do not include `apps/mobile`; no typecheck/test scripts in mobile package. | Missing |
| Decision tree | `packages/decision-tree` is still README-only. Mobile has a local keyword helper instead. | Not implemented |
| Firmware node | PlatformIO Arduino sketch with LoRa and partial NimBLE report/internet characteristics. | Prototype only; not protocol/routing compliant |
| Firmware gateway | PlatformIO Arduino sketch with LoRa, WiFi, and direct HTTP POST to backend. | Optional prototype; not the PRD primary mobile-bridge path |
| Firmware tests | No codec/routing/unit test harness. | Not implemented |
| Shared LoRa constants | Contracts and fixtures use `0x4C4D`; PRD requires `0xD15A`. | Blocking mismatch |
| Shared BLE contract | Mobile and firmware share three ad hoc UUIDs; missing required characteristics and schemas. | Incomplete |

## PRD Requirement Coverage Snapshot

### Mobile PRD Requirements

| Requirement | Current status |
| --- | --- |
| Works offline for compose/connect/local history | Partial. UI and AsyncStorage work offline, but connection is not trusted and storage statuses are non-PRD. |
| Discover nearby nodes through BLE | Partial. Scan exists, mock exists, native scan filters by name prefix rather than service UUID. |
| Validate node ID before trusted connection | Missing. Selecting a node immediately sets connected state. |
| Decision-tree compression for free text | Partial/failing. Local keyword helper exists but emits unsupported values and raw text is sent when provided. |
| Safe status fixed payload | Partial/failing. `aman` maps to `fine`, but payload shape is not PRD BLE contract and history stores Indonesian status labels. |
| Local sent history | Partial. AsyncStorage history exists with non-PRD statuses. |
| Receive backlog from node | Missing. No BLE backlog stream/read or ack. |
| Direct HTTP burst when internet available | Partial/failing. Uploader exists but request schema is wrong and response handling is unsafe. |
| Notify node when phone has internet | Partial/missing. Function exists but is not wired into app lifecycle; payload is a single byte rather than a documented contract. |

### Firmware PRD Requirements

| Requirement | Current status |
| --- | --- |
| Encode/decode HEARTBEAT exactly | Failing. Missing `heartbeatSeq`, wrong magic, little-endian fields, no isolated codec. |
| Encode/decode DATA exactly | Failing. Missing `latE6`/`lonE6`, wrong magic, little-endian fields, extra message length byte. |
| Heartbeat every 12 to 18 seconds | Failing. Node uses fixed 30 seconds; gateway fixed 15 seconds with no jitter. |
| Neighbor timeout after 60 seconds | Missing. |
| Route recompute every 5 seconds | Missing. |
| Use `ROUTE_INFINITY = 65535` when route unknown | Constant exists; behavior is incomplete. |
| Pending queue when no route exists | Missing. Node sends periodic data even with unknown route. |
| Forward only if closer to gateway | Partial. Comparison exists, but route state is not computed correctly and no tests exist. |
| Random forward delay 100 to 1000 ms | Missing. Forwarding is immediate. |
| Dedup cache with 30-minute expiry | Partial/failing. Tiny ring buffers exist with no expiry. |
| BLE/mobile handoff | Partial/failing. Only report write and internet status write exist. |
| Gateway-range behavior when phone online | Partial/failing. `hasInternet` is set, but it does not drive `rangeToGateway = 0` with timeout semantics. |

## Firmware Gap Analysis

### F-001: LoRa magic value conflicts with PRD

Evidence:

- PRD requires `MAGIC = 0xD15A`.
- `firmware/loom-node/src/main.cpp` defines `PKT_MAGIC 0x4C4D`.
- `firmware/loom-gateway/src/main.cpp` defines `PKT_MAGIC 0x4C4D`.
- `packages/contracts/src/constants/index.ts` exports `LORA_PACKET_MAGIC = 0x4c4d`.
- `packages/test-fixtures/src/index.ts` has heartbeat fixture `4c4d0100002a0001`.

Impact: Firmware packets cannot match the PRD or a future independent decoder. Shared tests would preserve the wrong behavior unless contracts and fixtures are corrected.

Required work:

- Change shared constants and fixtures to `0xD15A`.
- Update firmware packet codec to use that value.
- Add byte-for-byte firmware codec tests against shared fixtures.

### F-002: LoRa numeric fields use little-endian order

Evidence:

- PRD requires big-endian/network byte order.
- Node writes node ID, `seqId`, ranges, and timestamp least-significant byte first.
- Node and gateway parse IDs, ranges, and sequence values as little-endian.

Impact: Even with the correct magic value, packets remain incompatible with PRD.

Required work:

- Implement explicit big-endian helpers for uint16, uint24, uint32, and int32.
- Use codec functions for all HEARTBEAT and DATA encode/decode.
- Reject old little-endian prototype bytes in tests.

### F-003: HEARTBEAT packet shape is incomplete

Evidence:

- PRD HEARTBEAT is 10 bytes: magic, type, nodeId, rangeToGateway, `heartbeatSeq`.
- Node and gateway send only magic, type, nodeId, and range.
- There is no `heartbeatSeq` state or neighbor freshness tracking by heartbeat sequence.

Impact: Firmware fails packet acceptance criteria and cannot implement the specified neighbor table model.

Required work:

- Add `heartbeatSeq` incrementing per node.
- Encode/decode exactly 10-byte heartbeat packets.
- Store `heartbeatSeq` and `lastSeenMs` in neighbor entries.

### F-004: DATA packet shape is incomplete

Evidence:

- PRD DATA fixed header is 26 bytes: magic, type, senderNodeId, seqId, senderRangeToGateway, forwarderRangeToGateway, timestamp, `latE6`, `lonE6`, then message bytes.
- Node omits `latE6` and `lonE6`.
- Node adds a 1-byte message length that the PRD packet table does not include.
- Gateway discards packet timestamp and fabricates a 2026 timestamp.

Impact: Backend heatmaps/history will lack required location and timestamp fidelity. Packet offsets do not match PRD.

Required work:

- Add `latE6` and `lonE6` to DATA encode/decode.
- Treat `message` as remaining bytes after the 26-byte header unless a future ADR updates the PRD.
- Preserve original timestamp and location across forwarding and backlog/API handoff.

### F-005: Firmware is monolithic and not testable at PRD boundaries

Evidence:

- Codec, LoRa IO, BLE callbacks, routing, dedup, and scheduling all live in `main.cpp`.
- No `protocol`, `routing`, `dedup`, `pending_queue`, `backlog_store`, `ble_bridge`, or transport modules exist.

Impact: Hardware-free tests for codec, forwarding, dedup, pending queue, and stale-route behavior are blocked.

Required work:

- Extract testable modules under `firmware/loom-node/src`.
- Keep `setup()` and `loop()` as orchestration only.
- Add PlatformIO or host-runnable tests for non-hardware logic.

### F-006: BLE handoff is only partial

Evidence:

- Firmware exposes service `4fafc201-1fb5-459e-8fcc-c5c9c331914b`.
- Firmware exposes report write `beb5483e-36e1-4688-b7f5-ea07361b26a8`.
- Firmware exposes internet status write `cba1d466-344c-4be3-ab3f-189f80dd7518`.
- Firmware does not expose node identity, validation, backlog stream/read, backlog ack, or node status.

Impact: The app cannot validate a node, cannot receive node backlog, and cannot inspect firmware routing/backlog state.

Required work:

- Preserve current UUIDs or formally migrate them, then add missing characteristics.
- Implement node identity read.
- Implement validation challenge/response and reject message writes before validation.
- Implement backlog stream/read and ack.
- Implement node status read/notify.

### F-007: Mobile-origin message parsing is unsafe and incomplete

Evidence:

- `ReportCallback` extracts `"message":"` with substring search instead of JSON parsing.
- It ignores `clientMessageId`, timestamp, lat/lon, `latE6`/`lonE6`, and message kind.
- It accepts unsupported message values that backend will reject.
- It immediately calls `sendLoRaData()` without pending-route handling.

Impact: Firmware loses required metadata, can broadcast invalid categories, and cannot acknowledge queued vs broadcast state to mobile.

Required work:

- Parse and validate JSON with fixed bounds.
- Accept only canonical `MessageValue` values.
- Generate `seqId`, build a PRD DATA packet, and return a BLE ack with queued/broadcast state.
- Use mobile timestamp and location when valid.

### F-008: Internet path advertisement does not update routing state

Evidence:

- Internet status callback sets `hasInternet = (val[0] == 1)`.
- `hasInternet` is not used to set `rangeToGateway = 0`.
- There is no timeout if the phone disconnects or stops refreshing status.

Impact: Connected online phones do not reliably make their node a range-0 gateway as required by PRD.

Required work:

- Accept structured internet status payload.
- Set `internetPathActive` and `rangeToGateway = 0` while fresh.
- Expire the internet path after a timeout and resume normal route recompute.
- Notify mobile of node status changes.

### F-009: Neighbor table and route recompute are missing

Evidence:

- Node only sets `rangeToGateway = 1` when it hears a direct heartbeat with `srcRange == 0`.
- It does not store neighbors or route via non-gateway neighbors.
- No 60-second timeout or 5-second recompute loop exists.

Impact: Multi-hop range-to-gateway gradient does not work beyond one hop and stale routes can persist.

Required work:

- Add neighbor table keyed by node ID.
- Store `rangeToGateway`, `heartbeatSeq`, `lastSeenMs`, and optionally RSSI/SNR.
- Recompute every 5 seconds using fresh neighbors.
- Implement stale gateway protection before trusting child routes.

### F-010: Pending queue is missing

Evidence:

- PRD requires origin DATA to be queued when `rangeToGateway = 65535`.
- Node sends hardcoded `fine` every 5 seconds regardless of route.
- BLE-origin messages are broadcast immediately.

Impact: Unknown-route nodes waste airtime and violate acceptance criteria.

Required work:

- Remove periodic hardcoded DATA send.
- Add pending queue with 30-minute expiry and bounded capacity.
- Queue origin messages while route is unknown.
- Flush pending when route becomes known.

### F-011: Backlog store is missing

Evidence:

- PRD requires nodes to store received/backlog messages for mobile handoff.
- Node forwards received packets but does not retain them for mobile.
- No backlog IDs, delivered flags, mobile ack handling, or expiry policy exist.

Impact: Online mobile apps cannot burst LoRa backlog to the backend because firmware has no backlog to provide.

Required work:

- Store decoded received DATA after dedup.
- Store origin DATA if it needs mobile/backend upload.
- Stream backlog over BLE.
- Clear only after mobile confirms local receipt or after agreed retention.

### F-012: Forwarding has no random delay

Evidence:

- Node forwards immediately inside `receiveAndForward()`.
- PRD requires random 100 to 1000 ms forward delay.

Impact: Broadcast collisions and duplicates become more likely, and firmware fails acceptance criteria.

Required work:

- Schedule eligible forwards in a small delayed-forward queue.
- Send after randomized delay.
- Preserve original DATA fields except `forwarderRangeToGateway`.

### F-013: Dedup cache is too small and has no expiry

Evidence:

- Node cache size is 16; gateway cache size is 32.
- Entries have only sender and seq; no timestamp or expiry.
- Zero-initialized entry can collide with sender 0 seq 0 if that key is ever valid.

Impact: Duplicate suppression will fail under load and will not satisfy 30-minute expiry.

Required work:

- Store `expiresAtMs` and occupied flag.
- Expire entries after 30 minutes.
- Increase capacity within ESP32 memory budget.
- Add deterministic eviction.

### F-014: Gateway firmware is not the primary PRD uplink

Evidence:

- ADR 0003 and PRD make mobile direct burst the primary uplink path.
- `loom-gateway` uploads directly over WiFi from firmware.
- Gateway hardcodes WiFi credentials and bypasses mobile backlog behavior.

Impact: It can be retained as optional gateway-capable behavior, but it does not close the mobile/firmware PRD flow.

Required work:

- Prioritize `loom-node` BLE/mobile direct burst.
- Treat `loom-gateway` as optional or refactor it to share the same PRD codec.
- If retained, remove hardcoded secrets and align payload schema.

### F-015: Gateway API upload payload is incomplete

Evidence:

- Gateway omits `uploadedAt`.
- It omits lat/lon/latE6/lonE6.
- It fabricates timestamp from `millis()` instead of packet timestamp.
- It posts to hardcoded HTTPS URL while a separate constant says HTTP.

Impact: Data reaching backend from gateway is incomplete and operationally misleading.

Required work:

- Preserve packet timestamp and coordinates.
- Use the exact backend ingest request schema.
- Add retry/backlog for failed HTTP POST if gateway support remains.

### F-016: Firmware README is stale

Evidence:

- `firmware/README.md` still says the directory is a placeholder and references future project structure.
- Actual PlatformIO firmware projects now exist under `firmware/loom-node` and `firmware/loom-gateway`.

Impact: Future sessions may start from a wrong assumption.

Required work:

- Update firmware README after the implementation plan is accepted.

## Mobile Gap Analysis

### M-001: Mobile app is not included in root workspace

Evidence:

- Root `package.json` workspaces include API, E2E, web, contracts, and test-fixtures only.
- `apps/mobile/package.json` exists but has no workspace name such as `@loom/mobile`.
- Root `npm run typecheck` and `npm test` will not cover mobile.

Impact: Mobile can drift without CI visibility.

Required work:

- Add `apps/mobile` to workspaces or document why it is intentionally independent.
- Add mobile `typecheck`, `test`, and lint scripts.
- Ensure root checks include mobile when appropriate.

### M-002: Mobile TypeScript compilation currently fails

Evidence:

- `apps/mobile/tsconfig.json` has `"ignoreDeprecations": "6.0"`.
- `npx tsc --noEmit -p apps/mobile/tsconfig.json` fails with TS5103.

Impact: No reliable automated check can run for mobile.

Required work:

- Fix or remove invalid `ignoreDeprecations`.
- Add a mobile typecheck script and run it in mobile validation.

### M-003: App entrypoint is inconsistent

Evidence:

- `apps/mobile/package.json` uses `"main": "expo-router/entry"`.
- `apps/mobile/index.ts` registers `App.tsx`.
- `App.tsx` is still the default starter screen.

Impact: Future contributors may edit the wrong entrypoint or break startup assumptions.

Required work:

- Remove unused default `App.tsx`/`index.ts` path if Expo Router is canonical, or align package main to the registerRootComponent path.
- Document the app entry convention.

### M-004: Node discovery is partial and does not prove node identity

Evidence:

- Native scan calls `startDeviceScan(null, null, ...)` and filters by `device.name.startsWith('LOOM')`.
- Mock nodes use string IDs like `mock-A12`, not numeric PRD node IDs.
- No identity characteristic read exists.

Impact: Nearby device listing can include spoofed/incorrect devices and cannot support PRD node ID validation.

Required work:

- Scan by LOOM service UUID.
- Read node identity characteristic.
- Represent node ID as uint24 numeric plus BLE device ID separately.

### M-005: Node ID validation is missing

Evidence:

- `handleSelectNode()` immediately calls `setGlobalNode(node, true)`.
- `useSelectedNode` persists the selected BLE device ID/name but has no validation state.
- No challenge/response or user node ID prompt exists.

Impact: App violates the PRD requirement that a node is trusted only after node ID validation.

Required work:

- Add validation screen/modal.
- Require exact expected node ID match before trusted connection.
- Block message write, backlog subscription, and internet status write until validation succeeds.

### M-006: BLE client is ad hoc and lacks connection/session semantics

Evidence:

- `sendReportToNode()` writes to a characteristic on the raw scanned device object.
- There is no explicit connect, service discovery, disconnect, ack wait, notification subscription, or error state machine.
- Mock mode always reports send success.

Impact: The app cannot distinguish scanned, connected, validated, sent, queued, or failed states.

Required work:

- Add a `BleClient` abstraction with real and mock implementations.
- Implement connect/discover/read/write/notify/timeout behavior.
- Add tests for scan, validation, send ack, backlog receive, and disconnect.

### M-007: BLE UUID contract is incomplete

Evidence:

- Mobile defines only service, report write, and internet status UUIDs.
- PRD requires identity, validation, message write, backlog read/stream, internet status, and mobile receipt acknowledgement.

Impact: Mobile cannot implement full PRD handoff.

Required work:

- Freeze BLE UUID table and payload schemas in a shared contract doc/module.
- Preserve the existing working UUIDs unless an ADR intentionally migrates them.
- Add constants for missing characteristics.

### M-008: Free-text compression is not PRD-compliant

Evidence:

- `buildPayloadMessage()` returns unsupported values: `critical_medical`, `critical_collapse`, `critical_flood`, `critical_fire`, `critical_emergency`, `need_water`, `need_food`, `need_evacuation`, and `need_assistance`.
- Backend accepts only `messageValueValues` from `packages/contracts`.
- `packages/decision-tree` remains placeholder-only.

Impact: Backend rejects or cannot filter most mobile emergency values.

Required work:

- Implement `@loom/decision-tree` using canonical message values.
- Make mobile import the package rather than using local ad hoc mapping.
- Add compression tests for Indonesian and expected emergency phrases.

### M-009: Mobile sends raw text to firmware

Evidence:

- In `app/index.tsx`, `payload = buildPayloadMessage(...)` is computed.
- BLE payload uses `message: message || payload`, so any typed text bypasses canonical compression.
- History retry also sends `message: report.message`.

Impact: Raw arbitrary user text enters firmware/LoRa path, violating PRD payload constraints and backend schema.

Required work:

- Send only canonical `message` values to firmware.
- Store raw text locally for sent history only.
- Block send when compression is unsupported or ambiguous until user chooses a category.

### M-010: Mobile BLE message payload shape does not match PRD integration needs

Evidence:

- Current BLE JSON is `{ id, status, message, lat, lon, ts }`.
- It does not include `clientMessageId`, canonical `kind`, ISO timestamp, `latE6`, `lonE6`, or schema version.
- Firmware cannot send a structured ack with `senderNodeId`, `seqId`, and queued state.

Impact: Firmware cannot build full PRD DATA packets or update local sent history accurately.

Required work:

- Define and validate `BleMobileMessage` payload.
- Include ISO timestamp and optional coordinates/E6 coordinates.
- Implement ack notification and timeout handling.

### M-011: Safe status is only partially implemented

Evidence:

- `aman` maps to `fine` only when message text is empty.
- If a user selects `aman` and enters optional text, raw text is sent as `message`.
- Safe status is a general report option, not a fixed safe action with guaranteed bypass of compression.

Impact: Safe status can violate the fixed `fine` payload rule.

Required work:

- Implement safe send as a fixed `fine` payload regardless of optional local note.
- Store optional note locally if needed, but do not send it to firmware/backend.

### M-012: Local storage model is too weak for PRD sync

Evidence:

- `ReportStatus` is `diterima_node | terkirim | gagal`, not `draft | sent_to_node | queued | synced | failed`.
- Backlog is a plain array with no dedup, per-item status, attempts, rejection reason, or synced state.
- `clearBacklog()` removes all backlog.

Impact: Mobile cannot handle partial accepted/duplicate/rejected responses or inspect rejected items offline.

Required work:

- Add durable local schema for sent messages and backlog items.
- Upsert backlog by `senderNodeId + ":" + seqId`.
- Track `pending`, `syncing`, `synced`, `rejected`, and `failed`.
- Add migration/versioning.

### M-013: Burst upload request schema is wrong

Evidence:

- `BurstMessage.timestamp` is a number, while backend requires ISO datetime string.
- Request uses `clientCreatedAt`; backend schema expects optional `uploadedAt`.
- `message` is typed as unrestricted string.
- `latE6` and `lonE6` are required locally even though backend allows optional/null.

Impact: Valid mobile backlog can be rejected by backend validation; invalid message values are not caught locally.

Required work:

- Import or mirror `BurstIngestRequest` and `BurstIngestMessage` types from `@loom/contracts`.
- Send `uploadedAt`.
- Use ISO timestamps and canonical message values.
- Omit/null no-fix location fields correctly.

### M-014: Burst response handling is unsafe

Evidence:

- `burstBacklogToBackend()` returns success after parsing JSON without checking `response.ok`.
- `_layout.tsx` clears all backlog on any `result.success`.
- It does not inspect `accepted`, `duplicate`, or `rejected`.

Impact: Rejected or failed items can be lost permanently.

Required work:

- Check HTTP status and validate response shape.
- Mark accepted and duplicate items as synced.
- Retain rejected items with reason.
- Retry failed network/server errors with backoff.

### M-015: Node backlog receive is missing

Evidence:

- `saveToBacklog()` exists but no code subscribes to firmware backlog or calls it.
- Firmware does not expose backlog characteristic.
- Mobile settings show backlog count but nothing can populate it from a real node.

Impact: The core PRD flow "node sends received/backlog messages to mobile, mobile bursts them" is absent.

Required work:

- Subscribe to backlog notifications/read queue after validation.
- Store each item before acknowledging it to firmware.
- Show sync/backlog status in UI.

### M-016: Internet status advertisement is not wired into lifecycle

Evidence:

- `notifyNodeInternetStatus()` exists but no app flow calls it.
- It writes a single byte instead of a structured/freshness-aware payload.
- No periodic refresh or offline write exists.

Impact: Firmware cannot reliably advertise `rangeToGateway = 0` while a phone has internet.

Required work:

- Observe network state while connected/validated.
- Write online/offline status and refresh while online.
- Stop/expire gateway path on disconnect or stale refresh.

### M-017: Permission/status UI is decorative rather than authoritative

Evidence:

- Settings has Bluetooth and location switches backed by component state, not real OS permission state.
- BLE permission flow occurs only inside scan hook.

Impact: UI can claim permissions are enabled/disabled inaccurately.

Required work:

- Read real permission/network/BLE adapter state.
- Link settings actions to OS settings or request flows.
- Keep send flow usable if location permission is denied.

### M-018: Mobile tests are missing

Evidence:

- No tracked mobile test files exist.
- `apps/mobile/package.json` has no test script.

Impact: Compression, storage transitions, BLE validation, and sync response handling can regress silently.

Required work:

- Add unit tests for decision tree, storage, BLE mock, payload validation, and sync handling.
- Add render/flow tests for critical screens if practical.

### M-019: UI language and text encoding need cleanup

Evidence:

- Several files display mojibake such as `âœ…`, `ðŸ“¡`, and `Â±`.
- Some help text implies "laporan gagal dapat dikirim ulang" via BLE only, but PRD also needs backlog sync status.

Impact: App quality and emergency usability suffer, and UI copy can misrepresent delivery guarantees.

Required work:

- Normalize source encoding to UTF-8 or replace with ASCII/icons from component libraries.
- Keep copy clear that LoRa delivery is best-effort and backend sync occurs when internet returns.

## Cross-Cutting Integration Gaps

### X-001: PRD, ADR, contracts, fixtures, and firmware disagree on LoRa V2

The PRD is the requested source of truth for this report. Therefore implementation should converge code to:

- `MAGIC = 0xD15A`
- big-endian numeric fields
- HEARTBEAT with `heartbeatSeq`
- DATA fixed header with `latE6` and `lonE6`
- message bytes as remaining packet payload after the 26-byte header

### X-002: BLE contract is not documented as a shared source of truth

Mobile and firmware currently coordinate by matching three UUID string literals. The full PRD handoff needs:

- service UUID
- identity read characteristic
- validation challenge/response characteristic
- message write characteristic
- message ack behavior
- backlog stream/read characteristic
- backlog ack characteristic
- internet status characteristic
- node status characteristic
- JSON payload schemas and max-size rules

### X-003: Canonical message taxonomy is split

Backend/shared contracts have the canonical taxonomy, while mobile local compression and firmware `sanitizeMessage()` add noncanonical categories. This must be collapsed to one source of truth before end-to-end sync testing.

### X-004: Backend ingest mapping is not implemented on mobile/firmware boundary

Backend expects `senderNodeId`, `seqId`, `senderRangeToGateway`, `lastForwarderRangeToGateway`, ISO `timestamp`, optional coordinates, canonical `message`, optional `receivedByNodeId`, and `source`. Current firmware/mobile do not preserve all of those fields through BLE, LoRa, backlog, and burst.

### X-005: Test ownership is absent

PRD scenarios 24 through 40 require mobile BLE, mobile sync, firmware codec, route recompute, stale gateway timeout, forwarding, dedup, and pending queue coverage. No firmware/mobile test harness currently covers these.

## Acceptance Criteria Status

### Mobile

| PRD acceptance criterion | Status |
| --- | --- |
| App discovers nearby BLE nodes | Partial |
| App validates node ID before connection is accepted | Missing |
| App sends safe-status fixed payload | Partial/failing |
| App compresses free-text into one canonical `message` value | Failing |
| App stores sent history offline | Partial |
| App receives backlog from node | Missing |
| App bursts backlog directly to backend API when internet returns | Partial/failing |
| App handles partial accepted/duplicate/rejected ingest response | Missing |
| App informs node when internet is available | Partial/missing |

### Firmware

| PRD acceptance criterion | Status |
| --- | --- |
| Firmware encodes and decodes HEARTBEAT exactly | Failing |
| Firmware encodes and decodes DATA exactly | Failing |
| Firmware uses big-endian byte order | Failing |
| Firmware sends heartbeat every 12 to 18 seconds | Failing |
| Firmware drops duplicate DATA by dedup cache | Partial/failing |
| Firmware does not forward when `rangeToGateway = 65535` | Partial/untested |
| Firmware forwards only when self range is lower | Partial/untested |
| Firmware only updates `forwarderRangeToGateway` when forwarding | Partial/untested |
| Firmware recomputes route after neighbor timeout | Missing |
| Firmware handles stale gateway timeout before trusting child routes | Missing |
| Firmware queues origin messages when no route exists | Missing |

## Recommended Implementation Order

1. Fix shared contracts first: LoRa constants/fixtures, canonical message values, BLE UUID/payload documentation.
2. Fix mobile build and workspace visibility so typecheck/test can run.
3. Extract firmware protocol codec and add byte-for-byte tests.
4. Implement firmware dedup, neighbor table, route recompute, pending queue, backlog store, and delayed forwarding.
5. Replace ad hoc firmware BLE with validated identity, validation, message write/ack, backlog, internet status, and node status.
6. Replace mobile local compression with `packages/decision-tree`.
7. Replace mobile BLE wrapper with a session-oriented client and mock.
8. Replace mobile storage/sync with PRD statuses and per-item burst response handling.
9. Run one-node BLE integration, then three-node LoRa gradient integration, then mobile/backend burst integration.

## Open Decisions To Close Before Coding

- Whether to update existing ADR 0002 with exact byte-level fixtures or add a new ADR for finalized LoRa fixture bytes.
- Whether to keep current BLE service/report/internet UUIDs and add missing characteristics, or migrate to a new namespace. Current code already aligns on the existing three UUIDs, so keeping them is lower risk.
- Exact no-location sentinel at LoRa level. Recommended for MVP: `latE6 = 0` and `lonE6 = 0` means "no fix" and mobile omits/nulls backend coordinate fields when both are zero.
- Whether `firmware/loom-gateway` remains optional gateway-capable firmware or is paused until node/mobile PRD flow is complete.
- Storage backend for mobile local data: AsyncStorage can work for prototype, but SQLite with migrations is safer for backlog/status queries.
