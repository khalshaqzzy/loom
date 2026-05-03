# LOOM Technical PRD

Document status: Draft for implementation  
Last updated: 2026-05-04  
Primary timezone: Asia/Jakarta  
Scope type: MVP implementation-ready technical PRD

## 1. Product Summary

LOOM is an emergency communication system for disaster conditions where cellular service, internet connectivity, and centralized communication infrastructure cannot be trusted. The system combines ESP32 + LoRa field nodes, a React Native Expo mobile app for node owners, an Express.js backend API, MongoDB persistence, and a Next.js web dashboard for operational monitoring and public information access.

The core purpose is to let safety and emergency messages move through a LoRa multi-hop broadcast mesh until they reach any node that currently has an internet path through a connected phone or gateway-capable setup. When a node owner's phone regains internet access, the mobile app bursts received backlog directly to the backend API. The web dashboard then exposes heatmaps, node markers, and node message history to disaster-response admins and privacy-gated message history to public users.

The hosted software runtime is deployed as one VM monolith:

- Backend API: Express.js, Node.js, TypeScript, MongoDB.
- Web frontend: Next.js, TypeScript.
- Mobile app: React Native Expo.
- Edge firmware: ESP32 + LoRa + BLE.
- Deployment: Docker Compose on a VM, Caddy for reverse proxy/TLS, GitHub Actions for CI/CD.
- Public domains:
  - Backend API: `https://api.loomnetwork.site`
  - Web frontend: `https://loomnetwork.site`

All server-side data mutations must go through the backend API. The web frontend and mobile app must never receive direct MongoDB access.

## 2. Goals, Success Metrics, and Non-goals

### 2.1 Primary goals

- Provide emergency and safety reporting that still works when the disaster area has no cellular or internet service.
- Forward messages through LoRa broadcast multi-hop routing based on a range-to-gateway gradient without any target receiver in the LoRa payload.
- Run decision-tree message compression in the mobile app before sending the payload to the ESP32 node.
- Provide a web dashboard with condition heatmaps, node markers, node details, and message history per node.
- Provide a public portal without login where users can view heatmaps and search message history using full-name plus birth-date validation.
- Provide an admin dashboard for node registration, full registered-node visibility, heatmaps, and message-history lookup.
- Provide a hosted deployment model that is simple, repeatable, rollbackable, and suitable for a self-hosted VM monolith.

### 2.2 Success metrics

- Mobile users can discover a nearby node, validate node ID, and send a message to the node in no more than three main interaction steps after local connectivity is available.
- Safe-status reports use a fixed payload and do not require compression.
- Free-text reports are compressed in the mobile app into one canonical `message` payload value before being sent to the ESP32.
- ESP32 nodes forward DATA only when `self.rangeToGateway < packet.forwarderRangeToGateway`.
- Backend ingest is idempotent by `senderNodeId + seqId`.
- Burst uploads from mobile apps or gateway-capable nodes do not create duplicate database messages, even when the same LoRa message is uploaded by multiple phones.
- The web dashboard updates heatmaps, markers, and history after backend ingest.
- Public lookup does not reveal message history unless full name and birth date match.
- Hosted deployment automatically rolls back to the previous release when smoke/readiness checks fail.

### 2.3 Non-goals for MVP

- No target receiver field in LoRa DATA payloads.
- No RF propagation simulation in the web Digital Twin.
- No RSSI/SNR-based signal coverage prediction in the MVP frontend.
- Mobile phone bursting is a direct HTTPS API upload from the mobile app to the Node.js/Express backend.
- No CI/CD or distribution pipeline for the mobile app.
- No multi-tenant organization management.
- No public self-service node registration.
- No public OTP, social login, or account system.
- No ACK-based guaranteed delivery in LoRa protocol V2.
- No LoRa packet TTL, next-hop routing, version field, or flags in protocol V2.
- No direct database access from any client.

## 3. Confirmed Decisions

- Backend uses Express.js, Node.js, TypeScript, and MongoDB.
- Web frontend uses Next.js and TypeScript.
- Mobile app uses React Native Expo.
- Hosted runtime uses a monolithic deployment on one VM with Docker Compose.
- Caddy is used as the reverse proxy and TLS terminator.
- Backend domain is `api.loomnetwork.site`.
- Web frontend domain is `loomnetwork.site`.
- Google Maps API is used for heatmaps and marker map views.
- The MVP web Digital Twin shows condition heatmaps, node markers, and message history only.
- Heatmaps can be filtered by the canonical `message` payload value, such as a decision-tree category or fixed `fine` status.
- A marker-only simplified view is available as an alternative to the heatmap.
- Admin users can register nodes with node ID, owner full name, and owner birth date.
- Admin users can see all registered nodes.
- Public users do not need to log in.
- Public users can view heatmaps.
- Public users can view node-owner message history only after entering the owner's full name and validating with birth date.
- The mobile app is the owner interface for connecting a phone to its node.
- Node discovery happens from the mobile app against nearby detected nodes.
- A user must validate node ID before connecting to a node.
- Decision-tree compression happens in the mobile app before sending data to the ESP32.
- Safe status uses a fixed payload and does not require compression.
- The mobile app stores the user's sent-message history.
- All messages received by a node are sent to the mobile app when local connection is available.
- When the phone has internet, the mobile app bursts directly to the backend API.
- If a phone has internet and notifies its connected node, that node has `rangeToGateway = 0`.
- ESP32 nodes receive messages, send messages, heartbeat to nearby nodes, maintain neighbor tables, and forward LoRa V2 packets.
- LoRa DATA is sent as broadcast.
- A node only forwards DATA when it is closer to a gateway than the last forwarder.
- Hosted CI/CD is relevant to backend, web, and deployment only; it does not deploy the mobile app.
- Hosted deployment does not use an image registry. GitHub Actions uploads a source release archive to the VM over SSH, and the VM runs `docker compose up -d --build`.

## 4. Constraints and Product Risks

### 4.1 Product constraints

- LoRa bandwidth is narrow, so payloads must remain small and canonical message values must be constrained.
- Public history lookup uses full name and birth date. This has lower friction than login, but requires strict rate limiting and non-enumerating responses.
- Mobile phones are part of the uplink path. Cloud visibility may be delayed until at least one relevant phone gains internet access.
- The system does not guarantee every LoRa packet reaches the backend because protocol V2 does not use ACK.
- VM monolith deployment simplifies operations, but backend, web, database, reverse proxy, and host share the same operational blast radius.
- Google Maps API requires API key management, quota/billing management, and a fallback UI when the map provider fails.

### 4.2 Technical risks

- Duplicate packets can occur because LoRa forwarding is broadcast-based; firmware and backend must both deduplicate.
- The same packet can be collected by more than one phone and uploaded concurrently; backend ingest must be concurrency-safe and treat cross-phone duplicates as successful duplicates, not errors.
- Stale neighbor routes can create false routes if gateway timeout behavior is implemented incorrectly.
- Large bursts from many phones after internet recovery can stress backend ingest and frontend rendering.
- Public lookup can be abused for identity enumeration if errors or timings are too specific.
- Owner birth dates are sensitive data and must be treated as confidential.
- BLE compatibility can vary across Android and iOS devices and must be tested on real hardware.

## 5. Users and Roles

### 5.1 Admin / Disaster-response operator

Admin users are command-center operators, SAR teams, official volunteers, or disaster-response personnel with login access.

Capabilities:

- Log in to the admin dashboard.
- Register nodes using unique node ID, owner full name, and owner birth date.
- View all registered nodes.
- View condition heatmaps.
- Switch map modes such as roadmap, satellite, terrain, or hybrid when supported by Google Maps API.
- View markers for each node.
- Open node details from markers.
- Search by node ID.
- Search by node owner name.
- View full message history per node.
- View message metadata such as canonical message value, location, timestamp, seqId, sender range, and last forwarder range.

### 5.2 Public user

Public users are family members, citizens, non-admin volunteers, or general public visitors.

Capabilities:

- Access `loomnetwork.site` without login.
- View public heatmaps.
- Switch safe public map modes.
- Search message history by full name.
- Validate the lookup using birth date.
- View message history for the matched node owner after validation succeeds.

Limitations:

- Cannot register nodes.
- Cannot view the full registered-node list with complete identity data.
- Cannot mutate data.
- Cannot access admin endpoints.
- Does not receive specific failure reasons when name or birth date is wrong.

### 5.3 Mobile node owner

The mobile node owner is the owner of an ESP32 node who uses the React Native Expo app.

Capabilities:

- Open the app offline.
- Discover nearby nodes through BLE.
- Select a node and validate node ID.
- Connect phone to node.
- Input emergency text messages.
- Send safe status using a fixed payload.
- View sent-message history.
- Receive backlog messages from the node.
- Burst backlog directly to the backend API when the phone has internet.
- Notify the connected node that an internet path exists, allowing the node to advertise `rangeToGateway = 0`.

### 5.4 ESP32 node

The ESP32 node is a field device using LoRa and BLE.

Responsibilities:

- Receive payloads from the mobile app.
- Send LoRa DATA broadcasts.
- Receive LoRa DATA broadcasts.
- Forward DATA when its range-to-gateway is lower than the packet's last forwarder range.
- Send periodic HEARTBEAT packets.
- Maintain a neighbor table.
- Compute `rangeToGateway`.
- Store a dedup cache.
- Store a pending queue when no route exists.
- Send received/backlog messages to the mobile app when BLE is available.

## 6. Scope Overview

### 6.1 Backend API scope

- Admin authentication and session.
- Node registration.
- Node listing and search.
- Message ingest from mobile burst and gateway-capable sender.
- Message deduplication.
- Message history query.
- Public privacy-gated lookup.
- Heatmap query.
- Marker/detail query.
- Audit log for sensitive actions.
- Health and readiness endpoints.

### 6.2 Web frontend scope

- Public first screen exposes the operational map, not a marketing-only landing page.
- Admin login.
- Admin dashboard.
- Node registration form.
- Registered node table.
- Google Maps heatmap.
- Category filter.
- Map type control.
- Marker-only simplified mode.
- Node detail drawer/panel.
- Message history panel.
- Public lookup form with full name and birth date.

### 6.3 Mobile app scope

- BLE permission flow.
- Nearby node discovery.
- Node ID validation.
- Connection status.
- Emergency message input.
- Decision-tree compression.
- Safe-status fixed payload.
- Local sent history.
- Local received backlog storage.
- Internet detection.
- Direct burst upload to backend API.
- Node internet-status notification through BLE.

### 6.4 Firmware scope

- LoRa protocol V2 packet encode/decode.
- HEARTBEAT send/receive.
- DATA send/receive.
- Neighbor table.
- Range-to-gateway recompute.
- Dedup cache.
- Pending queue.
- Random forward delay.
- BLE/mobile handoff.
- Gateway-range behavior when phone is online.

## 7. End-to-End User Flows

### 7.1 Admin registers node

1. Admin logs in.
2. Admin opens Registered Nodes.
3. Admin selects Register Node.
4. Admin enters unique ESP node ID, owner full name, and owner birth date.
5. Backend validates unique `nodeId`.
6. Backend normalizes the name and stores the birth date securely for validation.
7. Node appears in registered nodes.
8. The action is recorded in the audit log.

### 7.2 Mobile owner connects phone to node

1. User opens the mobile app.
2. App requests Bluetooth and location permissions when required by the platform.
3. App scans for nearby BLE nodes.
4. App displays detected nodes.
5. User selects a node.
6. App requests node ID validation.
7. App considers the node connected only when node ID matches.
8. App displays connected status.

### 7.3 Mobile owner sends emergency message

1. User opens the message composer.
2. User writes a short message.
3. App captures timestamp and GPS when available.
4. App runs decision-tree compression.
5. App builds a compact payload.
6. App sends the payload to ESP32 through BLE.
7. Node creates a LoRa DATA packet with sender metadata.
8. If the node knows a route, it broadcasts DATA.
9. If `rangeToGateway = 65535`, the node stores DATA in the pending queue.
10. App stores local sent history.

### 7.4 Mobile owner confirms safe status

1. User selects the safe-status action.
2. App builds a fixed safe payload.
3. App adds timestamp and GPS when available.
4. App sends the payload to the node through BLE.
5. Node processes it as regular DATA.
6. App stores local sent history without running compression.

### 7.5 LoRa message hops to an internet-capable phone

1. Origin node creates DATA with `forwarderRangeToGateway = senderRangeToGateway`.
2. DATA is broadcast.
3. Receiving nodes deduplicate by `senderNodeId + seqId`.
4. Receiving nodes forward only when `self.rangeToGateway < packet.forwarderRangeToGateway`.
5. During forward, only `forwarderRangeToGateway` changes.
6. The packet descends by range until it reaches a node with `rangeToGateway = 0`.
7. The range-0 node sends backlog to its online mobile app.
8. The mobile app bursts directly to the backend API.

### 7.6 Mobile app bursts backlog to backend

1. App detects internet availability.
2. App reads local received backlog.
3. App sends a batch to the backend API.
4. Backend validates schema, node registration, idempotency key, and timestamp.
5. Backend stores new messages and ignores duplicates.
6. Backend returns accepted/duplicate/rejected summary.
7. App marks accepted or duplicate items as synced.
8. App retains rejected items for local observability.

### 7.7 Admin views heatmap and node history

1. Admin logs in to the dashboard.
2. Admin opens the map.
3. Web requests heatmap data from backend with message-value filters.
4. Web renders Google Maps heatmap.
5. Admin switches map type if needed.
6. Admin selects a marker or searches node ID/owner name.
7. Web displays node details and message history.

### 7.8 Public views history with privacy validation

1. Public user opens `loomnetwork.site`.
2. User sees the public heatmap.
3. User opens history lookup.
4. User enters full name.
5. User enters birth date.
6. Backend validates the full-name and birth-date pair.
7. If valid, web shows message history for the matched node owner.
8. If invalid, web shows a generic error.

## 8. Functional Requirements by Module

### 8.1 Backend API

- Backend must expose REST APIs using Express.js and TypeScript.
- Backend must use MongoDB as the primary database.
- Backend must validate all request bodies, query strings, and route params server-side.
- Backend must store node owner identity for admin workflows and public privacy lookup.
- Backend must store complete message history required by the dashboard.
- Backend must deduplicate messages by `senderNodeId + seqId`.
- Backend must expose aggregate heatmap data filtered by canonical `message` payload value.
- Backend must expose marker data based on viewer role.
- Backend must distinguish admin sessions from public access.
- Backend must expose `/health` and `/ready`.

### 8.2 Admin web

- Admin web must require login.
- Admin web must provide node registration.
- Admin web must reject duplicate node IDs.
- Admin web must show all registered nodes.
- Admin web must support search by node ID.
- Admin web must support search by owner full name.
- Admin web must show heatmaps.
- Admin web must provide decision-tree message-value filters.
- Admin web must provide marker-only simplified view.
- Admin web must show full message history per node.
- Admin web must use a dense, clear, operational dashboard design.

### 8.3 Public web

- Public web must not require login.
- Public web must show heatmaps.
- Public web may show markers that do not leak sensitive identity before validation.
- Public web must provide lookup by full name and birth date.
- Public web must use generic errors for failed lookup.
- Public web must show message history only after validation succeeds.
- Public web must remain responsive on mobile viewports.

### 8.4 Mobile app

- Mobile app must work offline for compose, connect, and local history.
- Mobile app must discover nearby nodes through BLE.
- Mobile app must validate node ID before treating connection as trusted.
- Mobile app must run decision-tree compression for free-text messages.
- Mobile app must send safe status as a fixed payload.
- Mobile app must store local sent history.
- Mobile app must receive backlog from the node.
- Mobile app must perform direct HTTP burst to the backend API when internet is available.
- Mobile app must notify the node when the phone has internet so the node can set `rangeToGateway = 0`.

### 8.5 ESP32 firmware

- Firmware must encode/decode HEARTBEAT and DATA packets according to protocol V2.
- Firmware must use big-endian/network byte order.
- Firmware must send heartbeat every 15 seconds with +/- 3 seconds jitter.
- Firmware must timeout neighbors after 60 seconds.
- Firmware must recompute routes every 5 seconds.
- Firmware must use `ROUTE_INFINITY = 65535` when it does not know a gateway path.
- Firmware must keep pending messages when `rangeToGateway = 65535`.
- Firmware must forward DATA only when closer to gateway than the previous forwarder.
- Firmware must use random forward delay from 100 to 1000 ms.
- Firmware must store dedup cache entries with 30-minute expiry.

## 9. Domain Model

### 9.1 UserSession

Core fields:

- `sessionId`
- `role`
- `adminId`
- `createdAt`
- `expiresAt`
- `revokedAt`

Notes:

- Sessions are only for admins.
- Public users do not have persistent login sessions in MVP.

### 9.2 AdminUser

Core fields:

- `adminId`
- `username`
- `passwordHash`
- `displayName`
- `createdAt`
- `updatedAt`
- `lastLoginAt`
- `isActive`

Notes:

- MVP can support one or multiple admin users.
- Passwords must never be stored as plaintext.

### 9.3 RegisteredNode

Core fields:

- `nodeId`
- `nodeIdNumeric`
- `ownerFullName`
- `ownerNormalizedName`
- `ownerBirthDateHash`
- `ownerBirthDateEncrypted`
- `registeredByAdminId`
- `lastKnownLat`
- `lastKnownLon`
- `lastSeenAt`
- `lastRangeToGateway`
- `lastMessageAt`
- `status`
- `createdAt`
- `updatedAt`

Expected `status` values:

- `registered`
- `active`
- `inactive`
- `unknown`

Notes:

- `nodeIdNumeric` must be in the range `0..16777215`.
- `ownerBirthDateHash` is used for lookup.
- `ownerBirthDateEncrypted` is used only if birth date must later be available to privileged admin workflows. MVP can avoid displaying birth date after registration.

### 9.4 MeshMessage

Core fields:

- `messageId`
- `dedupKey`
- `senderNodeId`
- `seqId`
- `senderRangeToGateway`
- `lastForwarderRangeToGateway`
- `timestamp`
- `lat`
- `lon`
- `latE6`
- `lonE6`
- `message`
- `receivedByNodeId`
- `receivedByUploaderId`
- `receivedByBackendAt`
- `source`
- `createdAt`

Expected `source` values:

- `mobile_burst`
- `gateway_api`
- `manual_seed`

Notes:

- `dedupKey = senderNodeId + ":" + seqId`.
- Backend must enforce uniqueness on `dedupKey`.
- `message` stores the only user payload value sent by mobile/node burst. For free-text reports, this is the compressed decision-tree category/code. For safe status, this is the fixed `fine` payload. Backend must not require a separate raw message, compressed message, or category field for MVP heatmap/history behavior.

### 9.5 MessageIngestBatch

Core fields:

- `batchId`
- `uploaderType`
- `uploaderNodeId`
- `mobileInstallationId`
- `messageCount`
- `acceptedCount`
- `duplicateCount`
- `rejectedCount`
- `receivedAt`
- `clientCreatedAt`
- `status`
- `errors`

Expected `uploaderType` values:

- `mobile_app`
- `gateway_node`

### 9.6 HeatmapPoint

Core fields:

- `lat`
- `lon`
- `weight`
- `message`
- `messageCount`
- `latestMessageAt`
- `nodeId`

Notes:

- Heatmap points can be computed on read or stored as denormalized aggregates.
- Public heatmap data must not require owner identity fields.

### 9.7 AuditLog

Core fields:

- `auditId`
- `actorType`
- `actorId`
- `action`
- `targetType`
- `targetId`
- `summary`
- `metadata`
- `createdAt`

Expected audited actions:

- `admin_login`
- `node_registered`
- `node_registration_failed_duplicate`
- `message_ingest_batch_received`
- `public_lookup_attempt`
- `public_lookup_success`
- `public_lookup_failed`

## 10. API and Data Contracts

### 10.1 API conventions

- Base URL: `https://api.loomnetwork.site`
- Request and response format: JSON.
- API responses use ISO 8601 timestamps.
- LoRa-origin packet timestamps may be accepted as Unix seconds.
- API coordinates use decimal latitude/longitude.
- `latE6` and `lonE6` are preserved when received.
- Public identity lookup validation errors must be generic.
- Admin endpoints require authenticated admin session.

### 10.2 Admin auth/session

`POST /api/admin/auth/login`

Request:

```json
{
  "username": "admin",
  "password": "secret"
}
```

Response:

```json
{
  "admin": {
    "adminId": "adm_123",
    "username": "admin",
    "displayName": "Operator"
  }
}
```

`POST /api/admin/auth/logout`

- Revokes current session.

`GET /api/admin/auth/session`

- Returns current admin session or 401.

### 10.3 Node registration and listing

`POST /api/admin/nodes`

Request:

```json
{
  "nodeId": "123456",
  "ownerFullName": "Budi Santoso",
  "ownerBirthDate": "1990-05-17"
}
```

Response:

```json
{
  "node": {
    "nodeId": "123456",
    "ownerFullName": "Budi Santoso",
    "status": "registered",
    "createdAt": "2026-05-04T10:00:00.000+07:00"
  }
}
```

Requirements:

- `nodeId` is required and unique.
- `nodeId` must parse to the uint24 range.
- `ownerFullName` is required.
- `ownerBirthDate` is required, must be a valid date, and must be stored securely.

`GET /api/admin/nodes?query=&status=&page=&limit=`

- Lists registered nodes.
- `query` matches node ID or owner normalized name.

`GET /api/admin/nodes/:nodeId`

- Returns node detail and latest operational metadata.

### 10.4 Message ingest

`POST /api/ingest/burst`

Request:

```json
{
  "uploaderType": "mobile_app",
  "uploaderNodeId": "123456",
  "mobileInstallationId": "mob_abc",
  "clientCreatedAt": "2026-05-04T10:00:00.000+07:00",
  "messages": [
    {
      "senderNodeId": 123456,
      "seqId": 42,
      "senderRangeToGateway": 5,
      "lastForwarderRangeToGateway": 1,
      "timestamp": 1710000123,
      "lat": -6.208763,
      "lon": 106.845599,
      "latE6": -6208763,
      "lonE6": 106845599,
      "message": "medical_help",
      "receivedByNodeId": 900001
    }
  ]
}
```

Response:

```json
{
  "batchId": "batch_123",
  "accepted": [
    {
      "senderNodeId": 123456,
      "seqId": 42,
      "dedupKey": "123456:42"
    }
  ],
  "duplicates": [],
  "rejected": []
}
```

Requirements:

- Endpoint accepts mobile app direct bursts and gateway-capable direct API uploads.
- Endpoint receives direct HTTPS uploads from the mobile app or gateway-capable sender.
- Each message item has exactly one payload field named `message`.
- For free-text reports, `message` is the compressed decision-tree category/code produced by the mobile app.
- For safe-status reports, `message` is the fixed value `fine`.
- Backend heatmap and history features use this same `message` value; burst payloads must not send separate raw-text, compressed-message, or category fields.
- Each message must be deduplicated by `senderNodeId + seqId`.
- Deduplication must be global across all uploaders, not scoped to `mobileInstallationId`, `uploaderNodeId`, batch ID, or phone identity.
- Backend must use a database-enforced unique index on `dedupKey` and atomic insert/upsert behavior so concurrent bursts from different phones cannot create duplicate `MeshMessage` records.
- Duplicate messages return in `duplicates`, not as whole-batch failure.
- Cross-phone duplicates must be returned as `duplicates` with enough per-item identity for the mobile app to mark its local backlog item as synced.
- If two phones upload the same new message at the same time, exactly one request may classify the item as `accepted`; the other request must classify it as `duplicates` or an equivalent already-synced duplicate outcome.
- Invalid messages return in `rejected` with safe per-item reason codes.
- Batch size limit must be enforced.

### 10.5 Admin message history

`GET /api/admin/messages?nodeId=&ownerName=&message=&from=&to=&page=&limit=`

- Admin can query by node ID, owner name, canonical message value, and time range.
- Response includes canonical message payload value and operational metadata.

`GET /api/admin/nodes/:nodeId/messages?page=&limit=&message=`

- Returns history for a selected marker/node.

### 10.6 Public lookup

`POST /api/public/history/lookup`

Request:

```json
{
  "ownerFullName": "Budi Santoso",
  "ownerBirthDate": "1990-05-17"
}
```

Success response:

```json
{
  "matched": true,
  "node": {
    "nodeId": "123456",
    "ownerFullName": "Budi Santoso"
  },
  "messages": [
    {
      "timestamp": "2026-05-04T10:00:00.000+07:00",
      "message": "fine",
      "lat": -6.208763,
      "lon": 106.845599
    }
  ]
}
```

Failure response:

```json
{
  "matched": false,
  "message": "Data not found or does not match."
}
```

Requirements:

- Failure response must be generic.
- Endpoint must be rate-limited by IP and normalized name.
- Public response must not expose unrelated nodes.

### 10.7 Heatmap and marker data

`GET /api/map/heatmap?message=&from=&to=`

- Returns public-safe heatmap points.
- Message filter supports decision-tree category/code values and fixed `fine` status.

`GET /api/map/markers?mode=public|admin`

- Public mode returns safe marker fields.
- Admin mode requires session and returns owner/detail fields.

`GET /api/admin/map/markers`

- Returns admin marker data for all registered nodes.

### 10.8 Health and readiness

`GET /health`

- Returns process liveness.

`GET /ready`

Readiness must validate:

- API process is running.
- MongoDB is reachable.
- Required environment variables are present.
- Schema/index initialization has completed.

## 11. LoRa Disaster Mesh Protocol V2

### 11.1 Purpose

Protocol V2 allows regular nodes to send messages through LoRa multi-hop toward a node that has an internet path. Routing does not use `nextHopId`, ACK, TTL, version, or flags.

DATA is sent as broadcast. A node that receives DATA may only forward it when it is closer to the gateway than the last forwarder.

### 11.2 Core principles

- Internet gateway has `rangeToGateway = 0`.
- A node one hop from gateway has `rangeToGateway = 1`.
- A node two hops from gateway has `rangeToGateway = 2`.
- A node that does not know a gateway path has `rangeToGateway = 65535`.
- Smaller `rangeToGateway` means closer to gateway.
- DATA packets move from larger range to smaller range.
- DATA is forwarded only if `self.rangeToGateway < packet.forwarderRangeToGateway`.
- LoRa payloads do not contain a target receiver.
- All DATA moves toward a gateway-capable path and may continue hopping until reaching a phone with internet.

### 11.3 Constants

| Name | Value |
| --- | --- |
| `MAGIC` | `0xD15A` |
| `TYPE_HEARTBEAT` | `0x01` |
| `TYPE_DATA` | `0x02` |
| `ROUTE_INFINITY` | `65535` |
| `GATEWAY_RANGE` | `0` |
| `NODE_ID_SIZE` | 3 byte / uint24 |
| `MAX_NODE_ID` | `16777215` |
| `HEARTBEAT_INTERVAL` | 15 seconds with random jitter +/- 3 seconds |
| `NEIGHBOR_TIMEOUT` | 60 seconds |
| `ROUTE_RECOMPUTE` | 5 seconds |
| `SEEN_CACHE_EXPIRY` | 30 minutes |
| `PENDING_EXPIRY` | 30 minutes |
| `DEFAULT_TARGET_PAYLOAD` | 64 to 128 bytes |

### 11.4 HEARTBEAT format

HEARTBEAT is sent periodically by every node.

| Offset | Field | Size |
| --- | --- | --- |
| 0 | `magic` | 2 byte |
| 2 | `packetType` | 1 byte |
| 3 | `nodeId` | 3 byte |
| 6 | `rangeToGateway` | 2 byte |
| 8 | `heartbeatSeq` | 2 byte |

Total: 10 byte.

Field meanings:

- `magic`: protocol identity, `0xD15A`.
- `packetType`: `0x01` for HEARTBEAT.
- `nodeId`: heartbeat sender node ID.
- `rangeToGateway`: sender distance to gateway.
- `heartbeatSeq`: monotonically increasing heartbeat sequence.

Examples:

- Gateway heartbeat: `nodeId = 900001`, `rangeToGateway = 0`, `heartbeatSeq = 120`.
- Routed regular node: `nodeId = 123456`, `rangeToGateway = 3`, `heartbeatSeq = 55`.
- Unknown-route node: `nodeId = 123456`, `rangeToGateway = 65535`, `heartbeatSeq = 55`.

### 11.5 DATA message format

DATA is a user message that should move toward a gateway.

V2 field rules:

- `senderNodeId` and `senderRangeToGateway` store the origin sender.
- `senderNodeId` and `senderRangeToGateway` are not changed during hopping.
- `forwarderRangeToGateway` stores the range of the node that last forwarded the packet.
- When a message is created, `forwarderRangeToGateway = senderRangeToGateway`.
- When a node forwards, it changes `forwarderRangeToGateway` to its own range.

| Offset | Field | Size |
| --- | --- | --- |
| 0 | `magic` | 2 byte |
| 2 | `packetType` | 1 byte |
| 3 | `senderNodeId` | 3 byte |
| 6 | `seqId` | 4 byte |
| 10 | `senderRangeToGateway` | 2 byte |
| 12 | `forwarderRangeToGateway` | 2 byte |
| 14 | `timestamp` | 4 byte |
| 18 | `latE6` | 4 byte |
| 22 | `lonE6` | 4 byte |
| 26 | `message` | variable |

Fixed header: 26 byte.

Field meanings:

- `magic`: protocol identity, `0xD15A`.
- `packetType`: `0x02` for DATA.
- `senderNodeId`: original node that created the message.
- `seqId`: sequence number from `senderNodeId`.
- `senderRangeToGateway`: origin node range when message was created.
- `forwarderRangeToGateway`: range of the last node that sent/forwarded the packet.
- `timestamp`: message creation timestamp.
- `latE6`: latitude multiplied by 1,000,000, stored as int32.
- `lonE6`: longitude multiplied by 1,000,000, stored as int32.
- `message`: canonical payload value. For MVP this is either a compressed decision-tree category/code or the fixed `fine` safe-status value.

Naming notes:

- `senderNodeId` = origin node.
- `senderRangeToGateway` = origin node range at creation time.
- `forwarderRangeToGateway` = last broadcasting hop range.

### 11.6 Message size

DATA header = 26 byte.

| Target total payload | Max message bytes |
| --- | --- |
| 64 byte | 38 byte |
| 128 byte | 102 byte |
| 200 byte | 174 byte |
| 255 byte | 229 byte |

Recommendation:

- Target total payload should be 64 to 128 byte.
- Ideal message length is 38 to 102 ASCII characters.
- Avoid emoji because UTF-8 can use 2 to 4 bytes per character.

### 11.7 GPS fixed-point format

Use fixed-point integer, not float.

- `latE6 = latitude * 1,000,000`
- `lonE6 = longitude * 1,000,000`

Example:

- latitude = `-6.208763`
- longitude = `106.845599`
- `latE6 = -6208763`
- `lonE6 = 106845599`

Both values are stored as int32, 4 byte each.

Benefits:

- Same size as float32.
- More deterministic.
- Independent from float formatting.
- Easy to send big-endian.
- Accurate enough for GPS.

### 11.8 Neighbor table

Each node stores neighbors from heartbeat.

Minimum fields per neighbor:

- `neighborId`
- `neighborRangeToGateway`
- `heartbeatSeq`
- `lastSeenMs`

RSSI and SNR are not required for minimal V2.

Example:

| Neighbor | nodeId | rangeToGateway | heartbeatSeq | lastSeenMs |
| --- | --- | --- | --- | --- |
| A | 111111 | 0 | 100 | fresh |
| B | 222222 | 2 | 90 | fresh |
| C | 333333 | 65535 | 70 | fresh |

### 11.9 Best neighbor

Best neighbor is the fresh neighbor with the smallest valid `rangeToGateway`.

A valid neighbor:

- has not timed out,
- has `rangeToGateway != 65535`.

If multiple neighbors have the same range, choose one. Minimal V2 does not need RSSI/SNR scoring.

### 11.10 Update range to gateway

Gateway:

- If node is a gateway and has internet: `rangeToGateway = 0`.
- If gateway loses internet: `rangeToGateway = 65535`.

Regular node:

- Self range is computed from the fresh best neighbor.
- If best valid neighbor exists: `self.rangeToGateway = bestNeighbor.rangeToGateway + 1`.
- If no valid best neighbor exists: `self.rangeToGateway = 65535`.

Important:

- Range must be recomputed from the fresh neighbor table.
- Do not only update when discovering a smaller range.
- Routes can die. If best neighbor timeout occurs, the node must search other fresh valid neighbors or return to 65535.

### 11.11 Best-neighbor timeout rule

If best neighbor timeout occurs, the node must recompute range from the neighbor table.

Important case:

- If the old best neighbor had range 0 and timed out, self must be set to 65535 before accepting a new route.

Reason:

- Initial topology: G range 0, A range 1, B range 2.
- A's best neighbor is G.
- G timeout occurs.
- A hears heartbeat from B with range 2.
- If A immediately accepts B, A computes range 3, but B may have learned range 2 from A's previous range 1.
- This can create a false route: A trusts B, B trusts A.

Minimal safe rule:

- If best neighbor timeout occurs, set `self.rangeToGateway = 65535`.
- Recompute from fresh neighbor table.
- If old best neighbor range was 0, do not immediately choose a neighbor with range > 0 in the same recompute.
- Wait until the next heartbeat cycle so the gradient stabilizes.

### 11.12 Practical route recompute

Every `ROUTE_RECOMPUTE` interval:

1. Remove or ignore timed-out neighbors.
2. If node is gateway and internet is active, set `self.rangeToGateway = 0` and finish.
3. If node is not gateway, find the fresh neighbor with the smallest valid range.
4. If no best neighbor exists, set `self.rangeToGateway = 65535`.
5. If best neighbor exists, set `self.rangeToGateway = bestNeighbor.rangeToGateway + 1`.

Anti-false-route addition:

- If previous best neighbor expired, set `self.rangeToGateway = 65535` first.
- If previous best neighbor range was 0, wait until the next heartbeat cycle before choosing neighbor range > 0.

### 11.13 Forwarding DATA

When a node receives DATA:

1. Check `magic`. If invalid, drop.
2. Check `packetType`. If not DATA, process according to type or drop.
3. Check dedup cache. Dedup key = `senderNodeId + seqId`. If seen, drop.
4. Store dedup key with expiry, for example 30 minutes.
5. If node is gateway and has internet, send DATA to API and finish.
6. If node is not gateway, compare receiver range with `packet.forwarderRangeToGateway`.
7. If `self.rangeToGateway == 65535`, do not forward.
8. If `self.rangeToGateway >= packet.forwarderRangeToGateway`, do not forward.
9. If `self.rangeToGateway < packet.forwarderRangeToGateway`, node may forward.
10. Before forwarding, only update `packet.forwarderRangeToGateway = self.rangeToGateway`.
11. Add random delay 100 to 1000 ms.
12. Send DATA again through LoRa broadcast.

Fields that must not change during forward:

- `senderNodeId`
- `senderRangeToGateway`
- `seqId`
- `timestamp`
- `latE6`
- `lonE6`
- `message`

Only changed field:

- `forwarderRangeToGateway`

### 11.14 Core forwarding rule

Receiver only forwards if:

```text
self.rangeToGateway < packet.forwarderRangeToGateway
```

Example:

- `packet.forwarderRangeToGateway = 4`
- Receiver A range 3: may forward, updates packet range to 3.
- Receiver B range 4: must not forward.
- Receiver C range 5: must not forward.
- Receiver D range 65535: must not forward.
- Gateway range 0: receives and sends to API or mobile burst path.

### 11.15 Why forwarder range is used for hopping

`senderRangeToGateway` records origin metadata:

- who created the message,
- how far the origin was from gateway when the message was created.

Forwarding needs last-hop range:

- A range 5 creates message: `senderRangeToGateway = 5`, `forwarderRangeToGateway = 5`.
- B range 4 receives: `4 < 5`, B forwards and sets `forwarderRangeToGateway = 4`.
- C range 3 receives: `3 < 4`, C forwards and sets `forwarderRangeToGateway = 3`.

This keeps packet movement descending: `5 -> 4 -> 3 -> 2 -> 1 -> 0`.

If forwarding compared against original sender range, many nodes with range 4, 3, 2, and 1 could repeatedly forward against value 5, increasing duplicates. `forwarderRangeToGateway` tightens forwarding criteria at each hop.

### 11.16 Dedup cache

Dedup key:

```text
senderNodeId + seqId
```

Example:

- `senderNodeId = 123456`
- `seqId = 42`
- identity = `123456:42`

If a node receives `123456:42` again, drop.

Minimal cache record:

- `hash32(senderNodeId + seqId)`: 4 byte
- `expiryMs`: 4 byte
- total: 8 byte per seen message

Estimated capacity:

| RAM | Seen messages |
| --- | --- |
| 8 KB | about 1024 |
| 16 KB | about 2048 |
| 32 KB | about 4096 |
| 64 KB | about 8192 |

ESP32 recommendation:

- `MAX_SEEN_CACHE = 2048` or `4096`.
- `SEEN_CACHE_EXPIRY = 30 minutes`.

### 11.17 Pending queue

If node creates a new message while `self.rangeToGateway == 65535`:

- Do not send immediately.
- Store in pending queue.
- Send pending message when a route to gateway is found.

Recommendation:

- `MAX_PENDING_MESSAGES = 50` to `200`.
- `PENDING_EXPIRY = 30 minutes`.

If pending queue is full:

- Drop oldest message, or
- prioritize emergency category if priority exists in a later version.

### 11.18 Sending new message from origin node

When user creates a message:

1. Increment `seqId`.
2. Get latest GPS.
3. Create DATA packet:
   - `magic = 0xD15A`
   - `packetType = TYPE_DATA`
   - `senderNodeId = self.nodeId`
   - `seqId = localSeqId`
   - `senderRangeToGateway = self.rangeToGateway`
   - `forwarderRangeToGateway = self.rangeToGateway`
   - `timestamp = current timestamp`
   - `latE6 = latitude * 1000000`
   - `lonE6 = longitude * 1000000`
   - `message = text or compressed payload from mobile app`
4. If `self.rangeToGateway == 65535`, store to pending queue.
5. If `self.rangeToGateway != 65535`, send LoRa broadcast.
6. Add own message to dedup cache so it is not processed again if heard later.

### 11.19 Receiving HEARTBEAT

When a node receives HEARTBEAT:

1. Check `magic`. If invalid, drop.
2. Check `packetType`. Must be HEARTBEAT.
3. Extract:
   - `nodeId`
   - `rangeToGateway`
   - `heartbeatSeq`
4. Update neighbor table.
5. If table is full, remove the neighbor with oldest `lastSeenMs`.
6. Recompute route periodically, not necessarily on every heartbeat.

### 11.20 Sending HEARTBEAT

Every node sends heartbeat periodically.

Heartbeat fields:

- `magic`
- `packetType = HEARTBEAT`
- `nodeId`
- `rangeToGateway`
- `heartbeatSeq`

Interval:

- 15 seconds +/- random jitter 3 seconds.
- Practical interval: 12 to 18 seconds.

Purpose:

- Prevent all nodes from transmitting at the same time and causing collisions.

### 11.21 Gateway and mobile bursting behavior

A gateway-capable path is any node/phone pair or gateway node that can send backlog to the backend API.

If internet is active:

- `rangeToGateway = 0`.

If internet is not active:

- `rangeToGateway = 65535`.

If gateway-capable node receives DATA and internet is active:

1. Check dedup `senderNodeId + seqId`.
2. Store dedup if new.
3. Convert payload to JSON.
4. Send to backend API.
5. If API fails, store in API pending queue or mobile local backlog.

Mobile-specific behavior:

- Node sends received messages/backlog to mobile app over BLE when connected.
- If mobile app has internet, mobile app bursts directly to backend API.
- This mobile burst is a direct HTTPS API upload to the Node.js/Express backend.
- Mobile app tells connected node when internet is available.
- Connected node may advertise `rangeToGateway = 0` while that internet path is valid.

Example API JSON from gateway/mobile:

```json
{
  "senderNodeId": 123456,
  "seqId": 42,
  "senderRangeToGateway": 5,
  "lastForwarderRangeToGateway": 1,
  "timestamp": 1710000123,
  "lat": -6.208763,
  "lon": 106.845599,
  "message": "medical_help",
  "receivedByGateway": 900001
}
```

### 11.22 Random forward delay

Forwarding must use random delay.

Example:

```text
forwardDelay = random 100..1000 ms
```

Purpose:

- If many nodes receive the same packet, they do not transmit together.

Optional optimization:

- Before delay finishes, if a node hears the same DATA already forwarded by another node with `forwarderRangeToGateway <= self.rangeToGateway`, it can cancel forward.

Minimal version:

- Receive DATA.
- If allowed to forward, wait random delay.
- Forward.

### 11.23 Optional suppression

To reduce duplicates:

1. When a node receives DATA and plans to forward, store `scheduledForward`.
2. Wait random delay.
3. If during the wait the node hears the same DATA already forwarded by a node with `forwarderRangeToGateway <= self.rangeToGateway`, cancel forward.
4. Otherwise forward.

This is optional but recommended to reduce airtime.

### 11.24 Endianness

Use big-endian / network byte order.

- `uint16`: high byte first, then low byte.
- `uint24`: highest byte first.
- `uint32` / `int32`: highest byte first.

Example node ID:

- decimal = `123456`
- hex = `0x01E240`
- bytes = `01 E2 40`

### 11.25 Example DATA message

Input:

- `senderNodeId = 123456`
- `seqId = 42`
- `senderRangeToGateway = 5`
- `forwarderRangeToGateway = 5`
- `timestamp = 1710000123`
- `lat = -6.208763`
- `lon = 106.845599`
- `message = medical_help`

Conversion:

- `latE6 = -6208763`
- `lonE6 = 106845599`

Conceptual payload:

- `magic = 0xD15A`
- `packetType = 0x02`
- `senderNodeId = 123456`
- `seqId = 42`
- `senderRangeToGateway = 5`
- `forwarderRangeToGateway = 5`
- `timestamp = 1710000123`
- `latE6 = -6208763`
- `lonE6 = 106845599`
- `message = medical_help`

Size:

- header = 26 byte
- message = 8 byte
- total = 34 byte

### 11.26 Example hopping

Topology:

- Gateway G range 0
- Node C range 1
- Node B range 2
- Node A range 3

A creates DATA:

- `senderNodeId = A`
- `senderRangeToGateway = 3`
- `forwarderRangeToGateway = 3`

B receives:

- B range = 2.
- `2 < 3`, so B may forward.
- B keeps sender fields unchanged.
- B updates `forwarderRangeToGateway = 2`.

C receives:

- C range = 1.
- `1 < 2`, so C may forward.
- C updates `forwarderRangeToGateway = 1`.

Gateway receives:

- G range = 0.
- Gateway sends to API or mobile/API burst path.

### 11.27 Example node does not forward

Given:

- `packet.forwarderRangeToGateway = 3`

Receivers:

- X range 3: `3 >= 3`, do not forward.
- Y range 4: `4 >= 3`, do not forward.
- Z range 65535: do not forward.

Only receivers with range 0, 1, or 2 may forward.

### 11.28 Pseudocode receive DATA

```text
onReceiveData(packet):

  if packet.magic != MAGIC:
      drop

  if packet.packetType != TYPE_DATA:
      drop

  key = packet.senderNodeId + packet.seqId

  if seenCache.contains(key):
      drop

  seenCache.add(key, expiry = now + SEEN_CACHE_EXPIRY)

  if isGateway and hasInternet:
      sendToApi(packet)
      return

  if self.rangeToGateway == ROUTE_INFINITY:
      drop

  if self.rangeToGateway >= packet.forwarderRangeToGateway:
      drop

  packet.forwarderRangeToGateway = self.rangeToGateway

  delay(random 100..1000 ms)

  sendLoRaBroadcast(packet)
```

### 11.29 Pseudocode route recompute

```text
recomputeRoute():

  if isGateway and hasInternet:
      self.rangeToGateway = 0
      return

  removeExpiredNeighbors()

  if previousBestNeighbor expired:
      self.rangeToGateway = ROUTE_INFINITY

      if previousBestNeighbor.rangeToGateway == 0:
          blockRouteAdoptionUntilNextHeartbeatCycle = true

  if blockRouteAdoptionUntilNextHeartbeatCycle:
      blockRouteAdoptionUntilNextHeartbeatCycle = false
      return

  bestRange = ROUTE_INFINITY
  bestNeighbor = NONE

  for each neighbor in neighborTable:
      if neighbor expired:
          continue

      if neighbor.rangeToGateway == ROUTE_INFINITY:
          continue

      if neighbor.rangeToGateway < bestRange:
          bestRange = neighbor.rangeToGateway
          bestNeighbor = neighbor

  if bestNeighbor == NONE:
      self.rangeToGateway = ROUTE_INFINITY
  else:
      self.rangeToGateway = bestRange + 1
      previousBestNeighbor = bestNeighbor
```

### 11.30 Pseudocode send HEARTBEAT

```text
sendHeartbeat():

  packet.magic = MAGIC
  packet.packetType = TYPE_HEARTBEAT
  packet.nodeId = self.nodeId
  packet.rangeToGateway = self.rangeToGateway
  packet.heartbeatSeq++

  sendLoRaBroadcast(packet)
```

### 11.31 Pseudocode receive HEARTBEAT

```text
onReceiveHeartbeat(packet):

  if packet.magic != MAGIC:
      drop

  if packet.packetType != TYPE_HEARTBEAT:
      drop

  updateNeighbor(
      nodeId = packet.nodeId,
      rangeToGateway = packet.rangeToGateway,
      heartbeatSeq = packet.heartbeatSeq,
      lastSeenMs = now
  )
```

## 12. Web Frontend UX/UI Requirements

### 12.1 General design requirements

- Web frontend must be built with Next.js and TypeScript.
- UI must feel operational, clear, responsive, and production-grade.
- Use a strong component system for buttons, forms, tables, panels, dialogs, filters, tabs, and toasts.
- Use icon buttons where appropriate for map controls and tools.
- Do not make the public landing page a marketing-only surface; the first screen should expose the usable map/lookup experience.
- Cards should be used for repeated items, panels, and dialogs, not nested decorative containers.
- Text must fit on mobile and desktop.
- Admin dashboard should optimize scanning, filtering, and repeated operational use.

### 12.2 Admin dashboard layout

Required surfaces:

- Top-level navigation for Map, Registered Nodes, Messages, and Settings.
- Global message-value filter.
- Search box that accepts node ID or owner name.
- Map area using Google Maps.
- Right-side or bottom detail panel for selected node.
- Message history table/list.
- Register node modal/page.
- Status indicators for API readiness and latest ingest time.

### 12.3 Public web layout

Required surfaces:

- Public map with heatmap.
- Category filter.
- Map type toggle.
- Public lookup panel.
- Result history panel after successful privacy validation.
- Empty/loading/error states.

### 12.4 Google Maps requirements

- Use Google Maps API for map rendering.
- Provide heatmap overlay.
- Provide map type switching, at minimum roadmap and satellite when available.
- Provide marker-only simplified view.
- Markers must be selectable.
- Selected marker must show latest known node condition and message summary according to current role.
- Heatmap filters must map to canonical `message` values.

### 12.5 History display requirements

Admin history must show:

- node ID,
- owner full name,
- canonical `message` payload value,
- timestamp,
- latitude/longitude,
- sender range,
- last forwarder range,
- seqId.

Public history must show:

- canonical `message` payload value,
- timestamp,
- approximate or exact coordinates depending on privacy decision,
- no unrelated owner data.

## 13. Mobile App Requirements

### 13.1 Platform

- React Native Expo.
- Offline-first local storage for sent history and received backlog.
- BLE support for node discovery and data transfer.
- Network status detection for direct API burst.

### 13.2 Main screens

- Connect Node screen.
- Nearby Nodes discovery list.
- Node ID validation prompt.
- Message composer.
- Safe status action.
- Sent history.
- Received/backlog sync status.
- Settings/permissions screen.

### 13.3 BLE node discovery

- App scans for nearby LOOM nodes.
- App displays detected node candidates.
- App must not treat a node as connected until node ID validation passes.
- App should show states:
  - scanning,
  - node found,
  - validating,
  - connected,
  - failed,
  - disconnected.

### 13.4 Message compression

- Free-text message must be compressed by decision tree in the mobile app.
- Compression output must be the canonical `message` value used by backend heatmap filtering.
- App must enforce target payload constraints before sending to ESP32.
- If message cannot be compressed safely, app must ask the user to shorten the text or choose a supported message category.

### 13.5 Safe status

- Safe status uses a fixed payload.
- Safe status bypasses compression.
- Safe status still includes node identity, timestamp, and GPS when available.

### 13.6 Local history

- App stores sent messages with local status:
  - draft,
  - sent_to_node,
  - queued,
  - synced,
  - failed.
- App stores received node backlog until backend accepts or marks duplicate.
- User can inspect sent history offline.

### 13.7 Direct backend burst

- When internet is detected, app sends batch to `POST /api/ingest/burst`.
- App retries failed burst with backoff.
- App must not delete local backlog until backend confirms accepted or duplicate.
- App must tolerate partial accepted/duplicate/rejected response.

### 13.8 Internet path advertisement to node

- While connected to node and app has internet, app informs node that gateway path is available.
- Node may set `rangeToGateway = 0` while this path remains valid.
- If app loses internet or disconnects, node must stop advertising gateway range after timeout.

## 14. Firmware and Gateway Behavior

### 14.1 ESP32 responsibilities

- Maintain local node ID as uint24.
- Receive mobile payload through BLE.
- Generate seqId for origin messages.
- Encode LoRa DATA packet.
- Decode received LoRa DATA packet.
- Decode received HEARTBEAT packet.
- Send HEARTBEAT with current `rangeToGateway`.
- Maintain neighbor table.
- Recompute route every 5 seconds.
- Store pending messages when route is unknown.
- Forward eligible DATA after random delay.
- Send received/backlog messages to mobile app over BLE.

### 14.2 BLE handoff

- Node exposes BLE service for:
  - node identity read,
  - mobile validation challenge/response,
  - message write,
  - backlog read/stream,
  - mobile internet status update.
- Node must reject or ignore message writes from unvalidated mobile sessions.
- Node must avoid clearing backlog before mobile confirms local receipt.

### 14.3 Gateway-capable state

- Node has a gateway path when the connected mobile app reports internet availability or the node itself has internet.
- Gateway path active means `rangeToGateway = 0`.
- Gateway path inactive means normal route recompute applies.
- If internet path disappears, node must advertise `65535` until route recompute finds another gateway path.

### 14.4 Pending and backlog behavior

- Pending queue stores locally created messages while no route exists.
- Backlog stores messages that need to be handed to a mobile/API path.
- Pending expiry is 30 minutes.
- Queue full behavior should drop the oldest non-critical message first.

## 15. Security and Privacy Requirements

### 15.1 Core security posture

- Backend API is the only component allowed to write MongoDB.
- MongoDB must not be exposed directly to the public internet.
- All public domains must use HTTPS.
- Server-side validation is required for every payload.
- Admin endpoints require authenticated session.
- Public endpoints must be rate-limited.

### 15.2 Admin security

- Passwords must use modern password hashing.
- Admin login must be rate-limited.
- Admin session cookies must be HTTP-only, secure, and same-site protected.
- Sensitive admin actions must create audit logs.

### 15.3 Public privacy

- Public lookup must require full name and birth date.
- Failed lookup must be generic.
- Public lookup must not disclose whether a name exists independently from birth date.
- Public map must not expose owner birth date.
- Public unauthenticated users cannot register or mutate node data.

### 15.4 API ingest safeguards

- Enforce batch size limits.
- Enforce item size limits.
- Enforce idempotency on `senderNodeId + seqId`.
- Enforce idempotency with a MongoDB unique index and concurrency-safe write path, because multiple phones can burst the same message.
- Reject impossible node ID values.
- Validate coordinate ranges.
- Reject invalid timestamps outside accepted skew window unless explicitly configured for disaster offline backlog.

### 15.5 Secrets

Hosted secrets include:

- VM SSH host, user, private key, known hosts, and port.
- Caddy email.
- MongoDB username, password, database, and replica key if replica set is used.
- Session secret.
- Admin bootstrap username/password.
- Google Maps API key.

## 16. Reporting and Analytics

### 16.1 Required operational metrics

- Total registered nodes.
- Active nodes by latest seen time.
- Messages received in selected time range.
- Messages by canonical message value.
- Safe status count.
- Emergency message value count.
- Latest ingest batch time.
- Duplicate message count.
- Rejected message count.
- Nodes with stale `lastSeenAt`.
- Distribution of `lastRangeToGateway`.

### 16.2 Heatmap basis

- Heatmap weight should be derived from message count, message severity, and recency.
- Heatmap filters must support decision-tree categories.
- Public heatmap must avoid exposing sensitive identity fields.
- Admin heatmap may allow deeper drilldown into node/message history.

### 16.3 Timezone

- UI reporting uses Asia/Jakarta by default.
- Backend stores timestamps in UTC-compatible format and renders localized boundaries where needed.

## 17. Operational Edge Cases

### 17.1 Duplicate LoRa packet

- Firmware dedup drops repeated `senderNodeId + seqId`.
- Backend dedup stores only one MeshMessage per `dedupKey`.

### 17.2 Node route unknown

- Node with `rangeToGateway = 65535` must not forward received DATA.
- Origin messages created while route is unknown go to pending queue.

### 17.3 Best gateway timeout

- If old best neighbor range 0 times out, node sets self range to 65535.
- Node waits until the next heartbeat cycle before trusting neighbor range > 0.

### 17.4 Mobile has no internet

- Mobile app can still connect, compose, send to node, and show local history.
- Received backlog remains local until internet returns.

### 17.5 Mobile gets internet after long offline period

- App bursts backlog to backend.
- Backend accepts new messages, marks duplicates, and rejects invalid messages per item.
- App keeps rejected items for user/developer inspection.

### 17.6 Public lookup abuse

- Backend rate-limits attempts.
- Response remains generic.
- Audit logs record lookup attempt metadata.

### 17.7 Google Maps unavailable

- Web displays fallback error state.
- Existing non-map history search should remain usable if API is reachable.

### 17.8 VM deployment fails

- Deploy workflow must keep previous release available.
- Failed post-deploy smoke/readiness check triggers rollback when previous release exists.
- Persistent MongoDB data under shared directory must not be deleted.

## 18. Non-Functional Requirements

### 18.1 Reliability

- Mesh local behavior must continue without cloud.
- Backend ingest must be idempotent.
- Backend ingest must be concurrency-safe for duplicate messages uploaded by different phones.
- Mobile burst must tolerate partial failures.
- Deploy must be rollbackable.

### 18.2 Performance

- Admin node search should respond within 2 seconds for the MVP dataset.
- Public lookup should respond within 3 seconds under normal load.
- Heatmap query should support time/message filters without blocking UI.
- Backend burst endpoint should handle at least 100 messages per batch for MVP.

### 18.3 Maintainability

- Backend must separate route handlers, validation, domain services, and persistence.
- Frontend must use reusable map, filter, table, form, and panel components.
- Mobile app must isolate BLE, compression, local storage, and API sync modules.
- Firmware must isolate packet codec, routing, dedup cache, pending queue, BLE bridge, and LoRa transport.

### 18.4 Observability

- Backend logs ingest batch summary.
- Backend logs readiness failures.
- Admin dashboard surfaces latest ingest and stale node indicators.
- Deployment logs release SHA, previous SHA, smoke check result, and rollback result.

### 18.5 Backup and recovery

- MongoDB data must be persisted outside release directories.
- Deploy scripts must never delete MongoDB persistent data.
- Backup policy may be added later, but deployment design must not block future backup integration.

## 19. Deployment Topology

### 19.1 Domains

- Web frontend: `https://loomnetwork.site`
- Backend API: `https://api.loomnetwork.site`

### 19.2 Hosting

- Hosted environment runs on one VM.
- Docker Compose manages:
  - `caddy`
  - `mongo`
  - `api`
  - `web`
- MongoDB runs as a single hosted MongoDB service inside Docker Compose.
- API and web are released together from the same git SHA.
- Mobile app is not deployed through this hosted CI/CD flow.

### 19.3 VM paths

Use release layout:

```text
/opt/loom/hosted/releases/<sha>
/opt/loom/hosted/current
/opt/loom/hosted/current_release
/opt/loom/hosted/shared/runtime.env
/opt/loom/hosted/shared/mongo-data
```

Requirements:

- Persistent data lives under `/opt/loom/hosted/shared`.
- Release directories are immutable per SHA.
- Keep latest five release directories.
- Never delete `shared/mongo-data` during deploy or rollback.

### 19.4 Reverse proxy

Caddy must:

- terminate TLS,
- route `loomnetwork.site` to web,
- route `api.loomnetwork.site` to api,
- expose only required public ports,
- keep MongoDB internal only.

## 20. CI/CD Requirements

### 20.1 CI gate

CI/CD is scoped to the `main` branch only.

CI runs on:

- pushes to `main` that touch hosted-runtime relevant paths,
- pull requests targeting `main` that touch hosted-runtime relevant paths.

Validation steps:

1. `npm ci`
2. install Playwright Chromium when web e2e exists
3. `npm run lint`
4. `npm run typecheck`
5. `npm test`
6. `npm run build`
7. `docker compose config`
8. `docker compose build`

Security steps:

- Gitleaks secret scan.
- Trivy filesystem scan for HIGH and CRITICAL findings.
- CodeQL analysis for JavaScript/TypeScript.
- Dependency Review on pull requests.

### 20.2 Path filters

Hosted CI/deploy should trigger only when relevant hosted runtime files change.

Do not trigger hosted deploy for docs-only changes such as:

- `internals/**`
- `docs/**`
- `*.md`

Do not trigger hosted deploy for mobile-app-only changes.

Mobile app CI/CD is not required for MVP.

### 20.3 Deploy hosted environment

Deploy workflow:

- Automatic after successful CI on `main`.
- Manual dispatch with selected `git_ref`.

Flow:

1. Checkout target ref.
2. Resolve `RELEASE_SHA`.
3. Validate required runtime secrets.
4. Connect to VM through SSH with pinned known hosts.
5. Create remote release directory.
6. Capture previous release SHA.
7. Upload source release archive generated from git SHA.
8. Render and upload `/opt/loom/hosted/shared/runtime.env`.
9. Run remote deploy script.
10. Run smoke checks.
11. Validate `/ready` semantically.
12. Roll back to previous release if post-deploy validation fails.

### 20.4 VM deploy mechanism

Remote deploy script must:

- load env values from `shared/runtime.env`,
- run Docker Compose for hosted stack,
- build images locally on VM,
- wait for `mongo`, `api`, `web`, and `caddy`,
- update `/opt/loom/hosted/current`,
- write `/opt/loom/hosted/current_release`,
- keep latest five releases.

### 20.5 Rollback

Rollback switches code/runtime back to a previous release. It does not reverse database mutations.

Rollback paths:

- automatic rollback from deploy workflow when validation fails and previous release exists,
- manual rollback with remote rollback script,
- rerun deploy workflow against known-good SHA.

### 20.6 Required hosted secrets

- VM SSH host.
- VM SSH user.
- VM SSH private key.
- VM SSH known hosts.
- VM SSH port.
- Caddy email.
- MongoDB username.
- MongoDB password.
- MongoDB database.
- MongoDB replica key if replica set is used.
- Session secret.
- Admin bootstrap username.
- Admin bootstrap password.
- Google Maps API key.

## 21. Acceptance Criteria

### 21.1 Backend

- Admin can log in and log out.
- Admin can register node with unique node ID, owner full name, and birth date.
- Duplicate node ID is rejected.
- Backend stores birth date securely.
- Burst ingest accepts valid batch from mobile app.
- Duplicate `senderNodeId + seqId` does not create duplicate message.
- Duplicate `senderNodeId + seqId` uploaded by different phones does not create duplicate message.
- Concurrent duplicate uploads for the same `senderNodeId + seqId` leave exactly one stored message.
- Invalid messages in a batch do not reject the whole batch.
- Admin can query message history by node ID, owner name, and canonical message value.
- Public lookup succeeds only when full name and birth date match.
- Public lookup failure is generic.
- `/ready` fails when MongoDB is unreachable.

### 21.2 Web frontend

- Public user can open heatmap without login.
- Public user can filter heatmap by canonical message value.
- Public user can switch map mode.
- Public user can use marker-only view.
- Public user can access history only after valid name and birth date.
- Admin can log in.
- Admin can register node.
- Admin can see all registered nodes.
- Admin can select marker and view node history.
- Admin can search by node ID and owner name.

### 21.3 Mobile app

- App discovers nearby BLE nodes.
- App validates node ID before connection is accepted.
- App sends safe-status fixed payload.
- App compresses free-text message into one canonical `message` value before sending to ESP32.
- App stores sent history offline.
- App receives backlog from node.
- App bursts backlog directly to backend API when internet returns.
- App handles partial accepted/duplicate/rejected ingest response.
- App informs node when internet is available.

### 21.4 Firmware

- Firmware encodes and decodes HEARTBEAT packet exactly.
- Firmware encodes and decodes DATA packet exactly.
- Firmware uses big-endian byte order.
- Firmware sends heartbeat every 12 to 18 seconds.
- Firmware drops duplicate DATA by dedup cache.
- Firmware does not forward when `rangeToGateway = 65535`.
- Firmware forwards only when `self.rangeToGateway < packet.forwarderRangeToGateway`.
- Firmware only updates `forwarderRangeToGateway` when forwarding.
- Firmware recomputes route after neighbor timeout.
- Firmware handles stale gateway timeout by returning to 65535 before trusting child routes.
- Firmware queues origin messages when no route exists.

### 21.5 Deployment

- CI runs lint, typecheck, tests, build, Docker Compose config, and Docker Compose build.
- Deploy runs only after CI success.
- Deploy uploads source release archive to VM.
- VM builds and runs Docker Compose locally.
- Release directory is keyed by git SHA.
- `/ready` is validated after deploy.
- Failed readiness triggers rollback to previous release if available.
- Deploy does not delete MongoDB persistent data.
- Hosted deploy is not triggered by docs-only or mobile-app-only changes.

## 22. Test Scenarios

Implementation must cover at minimum:

1. Admin login success.
2. Admin login failure rate limiting.
3. Register node with valid node ID.
4. Register node with duplicate node ID.
5. Register node with invalid uint24 node ID.
6. Admin list registered nodes.
7. Admin search node by node ID.
8. Admin search node by owner name.
9. Mobile burst ingest with one valid message.
10. Mobile burst ingest with duplicate `senderNodeId + seqId`.
11. Mobile burst ingest where two different phones upload the same `senderNodeId + seqId`.
12. Concurrent duplicate burst requests for the same message.
13. Mobile burst ingest with mixed valid and invalid items.
14. Heatmap query without message filter.
15. Heatmap query with decision-tree message value filter.
16. Public lookup with correct full name and birth date.
17. Public lookup with correct name and wrong birth date.
18. Public lookup with unknown name.
19. Public lookup abuse throttling.
20. Web map heatmap renders.
21. Web map switches to satellite view.
22. Web marker-only view renders markers.
23. Web marker select opens node detail/history.
24. Mobile BLE discovery finds node.
25. Mobile node ID validation rejects mismatch.
26. Mobile sends safe-status fixed payload.
27. Mobile compresses free-text message into one canonical `message` value.
28. Mobile stores sent history offline.
29. Mobile bursts backlog when internet returns.
30. Firmware heartbeat encode/decode.
31. Firmware DATA encode/decode.
32. Firmware GPS latE6/lonE6 conversion.
33. Firmware route recompute with valid best neighbor.
34. Firmware route recompute with no valid neighbor.
35. Firmware stale gateway timeout anti-false-route behavior.
36. Firmware forwarding allowed when receiver range is lower.
37. Firmware forwarding denied when receiver range is equal/higher.
38. Firmware forwarding denied when receiver range is 65535.
39. Firmware dedup cache drops duplicate.
40. Firmware pending queue stores message while route unknown.
41. Docker Compose config validates.
42. Docker Compose build succeeds.
43. Deploy smoke check detects failed API.
44. Deploy `/ready` detects MongoDB unreachable.
45. Rollback switches to previous release.
46. Path filter ignores `internals/**` only change for hosted deploy.
47. Path filter ignores mobile-app-only change for hosted deploy.

## 23. Suggested Implementation Notes

- Backend should use schema validation such as Zod for API contracts.
- Backend should create a unique index on `MeshMessage.dedupKey`.
- Backend should create indexes for:
  - `RegisteredNode.nodeIdNumeric`,
  - `RegisteredNode.ownerNormalizedName`,
  - `MeshMessage.senderNodeId`,
  - `MeshMessage.message`,
  - `MeshMessage.receivedByBackendAt`.
- Backend service boundaries should separate auth, nodes, ingest, map, messages, and public lookup.
- Web should isolate Google Maps integration behind map components so provider details do not leak through every page.
- Web should batch map rendering updates to avoid UI freeze during burst events.
- Mobile should isolate BLE transport, compression, local storage, and API sync.
- Firmware should isolate packet codec from LoRa radio IO so encode/decode can be unit-tested outside hardware.
- Deployment scripts must treat `/opt/loom/hosted/shared` as persistent and protected.

## 24. Deferred Decisions

- Exact decision tree category taxonomy and compressed code table.
- Exact BLE service UUIDs and characteristic UUIDs.
- Whether public history coordinates should be exact or privacy-rounded.
- Backup destination and retention policy for production MongoDB.
- Admin role granularity beyond MVP.
- Mobile app distribution process for Android/iOS.
- Optional LoRa suppression strategy after random forward delay.
- Optional message priority field for a future protocol version.
- Optional encryption scheme for LoRa payloads.
- Optional observability stack beyond application logs and readiness checks.
