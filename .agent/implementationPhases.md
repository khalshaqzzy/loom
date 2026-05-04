# LOOM Implementation Phases

Document status: Draft implementation roadmap  
Created: 2026-05-04  
Last updated: 2026-05-04  
Source of truth: `.agent/PRD.md`  
Purpose: full execution plan for implementing LOOM across backend, backend tests, frontend, frontend/backend integration, e2e tests, CI/CD, IoT firmware, mobile app, and final integration adjustments

## 1. Roadmap Summary

This roadmap converts the LOOM Technical PRD into an execution sequence. The order is intentionally backend-first so the API, persistence model, security model, and testable contracts are stable before the web frontend, IoT firmware, and mobile app depend on them.

Implementation order:

1. Product and architecture baseline.
2. Repository scaffold and shared contracts.
3. Full backend implementation.
4. Backend tests and API contract hardening.
5. Web frontend implementation.
6. Frontend/backend integration, including small backend adjustments if needed.
7. End-to-end tests for hosted API and web.
8. Full hosted CI/CD on `main` only.
9. IoT firmware for ESP32 + LoRa + BLE.
10. Mobile app implementation.
11. Mobile/backend/IoT integration, including minor backend adjustments if needed.
12. Final hardening, acceptance, and handoff.

Covered apps and runtimes:

- Express.js + Node.js + TypeScript backend API.
- MongoDB persistence.
- Next.js + TypeScript web frontend.
- ESP32 + LoRa + BLE firmware.
- React Native Expo mobile app.
- VM monolith deployment with Docker Compose and Caddy.
- GitHub Actions CI/CD triggered only for `main` branch hosted-runtime changes.

## 2. Cross-cutting Engineering Rules

- Keep backend domain logic out of route handlers.
- Keep web business policy out of React components; web should consume backend contracts.
- Keep mobile BLE, local storage, compression, and sync concerns separated.
- Keep firmware packet codec, routing, LoRa IO, BLE bridge, dedup cache, and pending queue separated.
- Use shared contracts for API payloads, enum values, decision-tree categories, and message metadata.
- Treat `senderNodeId + seqId` as the canonical idempotency key across firmware, mobile, and backend.
- Backend ingest idempotency must be global across all uploaders because multiple phones may burst the same LoRa message.
- Do not start web feature work until the backend APIs for that feature are implemented and covered by backend tests.
- Do not start mobile app feature work until backend ingest and web-hosted CI/CD are stable.
- Do not add mobile deployment to hosted CI/CD; mobile release/distribution remains deferred.
- Hosted CI/CD must trigger only on pushes to `main` and pull requests targeting `main`, with path filters excluding docs-only and mobile-app-only changes.
- Persistent hosted runtime data under `/opt/loom/hosted/shared` must never be deleted by deploy or rollback scripts.

## 3. Target Repository Layout

Use this layout unless implementation discovers a stronger existing convention:

```text
apps/
  api/
  web/
  mobile/
packages/
  contracts/
  decision-tree/
  test-fixtures/
firmware/
  loom-node/
deploy/
  caddy/
  compose/
  scripts/
.github/
  workflows/
.agent/
  PRD.md
  implementationPhases.md
```

Expected ownership:

- `apps/api`: Express API, MongoDB access, auth, ingest, map, messages, public lookup.
- `apps/web`: Next.js public and admin web.
- `apps/mobile`: Expo app, BLE, offline storage, compression, sync.
- `packages/contracts`: shared TypeScript schemas and constants.
- `packages/decision-tree`: mobile-consumable decision-tree compression module and fixtures.
- `packages/test-fixtures`: message, node, map, and ingest fixtures for backend/web/mobile tests.
- `firmware/loom-node`: ESP32 LoRa protocol V2, routing, dedup, pending queue, BLE bridge.
- `deploy`: Docker Compose, Caddyfile, remote deploy/rollback scripts, runtime env templates.

Current workspace status after Phase 0-4:

- Active npm workspaces are `apps/api`, `apps/web`, `packages/contracts`, and `packages/test-fixtures`.
- `apps/web` is the active Next.js frontend workspace.
- `apps/mobile`, `packages/decision-tree`, and `firmware/loom-node` are placeholder directories with README files only.
- Do not add placeholder `package.json` files to future directories. Add package manifests only when the phase implements a runnable package.

## 4. Phase 0 - Product Contract and Architecture Baseline

Status: Complete in repo as of 2026-05-04.

Goal: freeze the product, API, protocol, and deployment assumptions before implementation starts.

### 0.1 PRD and roadmap alignment

Execution list:

- Treat `.agent/PRD.md` as the canonical product and technical contract.
- Keep `api.loomnetwork.site` and `loomnetwork.site` as the only hosted public domains.
- Keep CI/CD scoped to `main` only.
- Keep mobile app CI/CD out of hosted deployment scope.
- Keep no-target-receiver LoRa V2 as the routing contract.
- Keep mobile direct burst to backend API as the uplink contract.
- Keep Google Maps API as the web map provider.

Exit criteria:

- PRD and this roadmap agree on stack, domains, protocol, app boundaries, and deployment topology.

### 0.2 Architecture records

Execution list:

- Add ADRs when implementation begins for:
  - monolithic VM runtime,
  - LoRa protocol V2,
  - mobile direct burst to the Node.js/Express backend API,
  - Google Maps API frontend map provider,
  - public lookup privacy model.

Exit criteria:

- Durable decisions are ready to be recorded before implementation narrows them further.

## 5. Phase 1 - Repository Scaffold and Shared Contracts

Status: Complete in repo as of 2026-05-04.

Goal: create the repo foundation used by backend first, then frontend, firmware, and mobile.

### 1.1 Workspace setup

Execution list:

- Initialize workspace package configuration.
- Add TypeScript base config.
- Add lint, format-check, typecheck, test, and build scripts.
- Add workspace scripts for:
  - API dev/build/test,
  - web dev/build/test,
  - mobile typecheck/test,
  - contracts build/test.
- Add root README or developer notes only if needed to run the repo.
- Keep future-only directories as README placeholders until they have real implementation.

Exit criteria:

- A single root command can typecheck and test all TypeScript packages that exist at this phase.

### 1.2 Shared contracts

Execution list:

- Create API schemas for:
  - admin login/session,
  - node registration/list/detail,
  - burst ingest,
  - admin message history,
  - public history lookup,
  - heatmap query,
  - marker query,
  - health/readiness response.
- Define shared enums:
  - `messageSource`,
  - `nodeStatus`,
  - `uploaderType`,
  - decision-tree message values, including fixed `fine`.
- Define shared constants:
  - `MAX_NODE_ID = 16777215`,
  - `ROUTE_INFINITY = 65535`,
  - LoRa packet constants mirrored from the PRD.

Exit criteria:

- Backend can import contract schemas and enum values before route implementation begins.

### 1.3 Test fixtures

Execution list:

- Add fixtures for valid and duplicate `MeshMessage`.
- Add fixtures for registered nodes with owner identity.
- Add fixtures for heatmap points and marker details.
- Add fixtures for public lookup success/failure.
- Add fixtures for LoRa V2 packet examples.

Exit criteria:

- Backend tests can use consistent sample data before frontend and mobile exist.

## 6. Phase 2 - Full Backend Implementation

Status: Complete in repo as of 2026-05-04.

Goal: complete backend runtime, persistence, auth, node registry, ingest, map, messages, public lookup, and readiness before frontend work starts.

### 2.1 Express runtime foundation

Execution list:

- Scaffold Express.js app with TypeScript.
- Add environment config loader.
- Add structured logging.
- Add request id correlation.
- Add global error handling.
- Add request validation middleware using shared schemas.
- Add body size limits.
- Add CORS policy for `loomnetwork.site`.
- Add route grouping for auth, nodes, ingest, map, messages, public lookup, web route manifest, and health/readiness.

Exit criteria:

- API starts locally and exposes `/health`.

### 2.2 MongoDB persistence

Execution list:

- Add MongoDB client module.
- Implement connection lifecycle.
- Implement index initialization.
- Add collections:
  - `adminUsers`,
  - `userSessions`,
  - `registeredNodes`,
  - `meshMessages`,
  - `messageIngestBatches`,
  - `auditLogs`.
- Add unique indexes:
  - `registeredNodes.nodeIdNumeric`,
  - `meshMessages.dedupKey`.
- Add query indexes for:
  - owner normalized name,
  - canonical message value,
  - sender node,
  - received backend time,
  - public lookup audit metadata where useful.

Exit criteria:

- `/ready` succeeds only when MongoDB is reachable and indexes are initialized.

### 2.3 Backend security baseline

Execution list:

- Implement admin password hashing.
- Implement secure admin session cookies.
- Implement admin auth middleware.
- Add admin login rate limiting.
- Add public lookup rate limiting by IP and normalized name.
- Add generic auth failure and public lookup failure messages.
- Add audit log writer for sensitive actions.

Exit criteria:

- Protected admin endpoints reject unauthenticated requests and public lookup cannot enumerate identities by response shape.

### 2.4 Admin authentication APIs

Execution list:

- Implement `POST /api/admin/auth/login`.
- Implement `POST /api/admin/auth/logout`.
- Implement `GET /api/admin/auth/session`.
- Add bootstrap admin creation from environment variables.
- Add audit logs for login success and relevant failed attempts.

Exit criteria:

- Admin can authenticate, fetch session, and log out through API.

### 2.5 Node registration APIs

Execution list:

- Implement `POST /api/admin/nodes`.
- Validate `nodeId` as uint24.
- Normalize owner full name.
- Hash and optionally encrypt owner birth date according to PRD model.
- Reject duplicate node IDs.
- Implement `GET /api/admin/nodes`.
- Implement `GET /api/admin/nodes/:nodeId`.
- Support search by node ID and owner name.
- Add audit logs for node registration attempts.

Exit criteria:

- Admin node registration/list/detail/search is fully functional through API.

### 2.6 Burst ingest APIs

Execution list:

- Implement `POST /api/ingest/burst`.
- Validate batch metadata.
- Validate each message item independently.
- Generate `dedupKey = senderNodeId + ":" + seqId`.
- Insert new messages idempotently using database-enforced uniqueness and atomic insert/upsert behavior.
- Return accepted, duplicate, and rejected arrays.
- Treat duplicates across different `mobileInstallationId` or `uploaderNodeId` values as synced duplicates, not errors.
- Ensure concurrent duplicate bursts from multiple phones leave exactly one stored `MeshMessage`.
- Store `MessageIngestBatch` summary.
- Update registered node latest metadata when matching node exists.
- Add ingest audit log.
- Keep endpoint implemented as a direct HTTPS API upload target for mobile and gateway-capable senders.

Exit criteria:

- Mixed valid/duplicate/invalid batches are handled without whole-batch failure, including cross-phone duplicates.

### 2.7 Map, marker, and message APIs

Execution list:

- Implement `GET /api/map/heatmap`.
- Implement `GET /api/map/markers?mode=public`.
- Implement `GET /api/admin/map/markers`.
- Implement `GET /api/admin/messages`.
- Implement `GET /api/admin/nodes/:nodeId/messages`.
- Add message-value filters.
- Add time filters.
- Add pagination for history APIs.
- Ensure public map responses do not expose birth date or admin-only identity fields.

Exit criteria:

- API can serve public/admin map data and node message history without frontend-specific assumptions.

### 2.8 Public lookup API

Execution list:

- Implement `POST /api/public/history/lookup`.
- Normalize submitted owner name.
- Hash submitted birth date using the same method as registration.
- Match only when full name and birth date pair is valid.
- Return generic failure for all invalid cases.
- Rate-limit by IP and normalized name.
- Add audit logs for lookup attempt, success, and failure.

Exit criteria:

- Public message history is accessible only after valid full-name plus birth-date validation.

## 7. Phase 3 - Backend Tests and Contract Hardening

Status: Complete in repo as of 2026-05-04.

Goal: lock backend behavior before frontend implementation begins.

### 3.1 Backend unit tests

Execution list:

- Test environment config validation.
- Test node ID uint24 validation.
- Test owner name normalization.
- Test birth-date hash matching.
- Test dedup key generation.
- Test heatmap aggregation helpers.
- Test public lookup generic failure helper.

Exit criteria:

- Core backend domain utilities have deterministic unit coverage.

### 3.2 Backend integration tests

Execution list:

- Test admin login success/failure.
- Test admin session fetch/logout.
- Test node registration success.
- Test duplicate node ID rejection.
- Test node listing and search.
- Test burst ingest with valid message.
- Test burst ingest with duplicate `senderNodeId + seqId`.
- Test burst ingest where two different phones upload the same `senderNodeId + seqId`.
- Test concurrent duplicate burst requests for the same `senderNodeId + seqId`.
- Test burst ingest with mixed valid/invalid items.
- Test admin message history filters.
- Test public heatmap filters.
- Test public lookup success.
- Test public lookup wrong birth date.
- Test public lookup unknown name.
- Test `/ready` with MongoDB reachable and unreachable.

Exit criteria:

- Backend API behavior required by web and mobile is covered before those apps are implemented.

### 3.3 API contract freeze

Execution list:

- Compare implemented request/response shapes against `packages/contracts`.
- Update contracts or backend only where behavior is still PRD-compliant.
- Add contract snapshots for critical API responses.
- Document any intentionally deferred backend endpoint.

Exit criteria:

- Frontend can start from stable backend contracts.

## 8. Phase 4 - Web Frontend Implementation

Status: Complete in repo as of 2026-05-04.

Goal: build the Next.js frontend after backend APIs and tests are complete.

### 4.1 Next.js foundation

Execution list:

- Scaffold Next.js TypeScript app.
- Add routing for public and admin surfaces.
- Use `/` for the landing page, `/public` for public heatmap operations, and `/public/history` for privacy-gated lookup.
- Add API client using shared contracts.
- Add session-aware admin route protection.
- Add environment config for `NEXT_PUBLIC_API_BASE_URL`.
- Add base layout, typography, and responsive shell.

Exit criteria:

- Web app runs locally and can call backend `/health` or `/ready`.

### 4.2 UI component system

Execution list:

- Add core components:
  - buttons,
  - icon buttons,
  - forms,
  - inputs,
  - date input,
  - table,
  - tabs,
  - segmented control,
  - map toolbar,
  - drawer/panel,
  - dialog,
  - toast,
  - loading skeleton,
  - empty/error states.
- Establish responsive layout primitives.
- Keep card radius restrained and avoid nested card layouts.
- Use map/tool icons where appropriate.

Exit criteria:

- Admin and public pages can be built from consistent reusable components.

### 4.3 Google Maps implementation

Execution list:

- Implement Google Maps provider loading.
- Create reusable map shell.
- Create heatmap overlay component.
- Create marker layer component.
- Create map type control.
- Create message-value filter binding.
- Add marker-only simplified mode.
- Add fallback state when Google Maps fails to load.

Exit criteria:

- Map can render heatmap, markers, and map type switching from backend or fixture data.

### 4.4 Public web

Execution list:

- Make `/` a polished landing page with clear navigation to `/public`, `/public/history`, and `/admin/login`.
- Make `/public` the unauthenticated public map/lookup operational surface.
- Render public heatmap.
- Add message-value filter.
- Add map type switcher.
- Add marker-only simplified view.
- Add public full-name and birth-date lookup form.
- Show matched history on success.
- Show generic failure on lookup failure.
- Ensure mobile responsive layout.

Exit criteria:

- Public user can view heatmap and access history only after valid privacy lookup.

### 4.5 Admin web

Execution list:

- Build admin login page.
- Implement session fetch and protected admin routes.
- Add logout.
- Build registered nodes table.
- Build register node form/modal.
- Validate node ID, full name, and birth date client-side.
- Show duplicate node ID errors from backend.
- Add search by node ID and owner name.
- Build admin map with heatmap and markers.
- Add message-value and time filters.
- Add selected node detail panel.
- Add node message history panel with PRD-required metadata.

Exit criteria:

- Admin can log in, register/search nodes, view heatmap/markers, and inspect node message history.

## 9. Phase 5 - Frontend/Backend Integration and Backend Adjustments

Goal: connect the completed frontend to the completed backend and make only necessary backend adjustments discovered during integration.

### 5.1 API integration pass

Execution list:

- Point web API client to local backend.
- Run every public and admin web flow against real backend APIs.
- Verify request/response shape compatibility.
- Verify auth cookies and CORS work from web to API.
- Verify pagination, filtering, and empty states.
- Verify backend error codes are sufficient for frontend UX without leaking private data.

Exit criteria:

- Web uses real backend APIs without fixture-only behavior.

### 5.2 Minor backend adjustments

Allowed adjustment scope:

- Add missing pagination metadata.
- Add missing sort options needed by UI.
- Adjust safe error codes without changing privacy guarantees.
- Add small read-model fields already derivable from existing backend data.
- Add indexes required by real UI query patterns.

Disallowed adjustment scope:

- Do not redesign core domain model.
- Do not weaken public lookup privacy.
- Do not add direct database access from frontend.
- Do not move business policy into frontend.

Exit criteria:

- Backend remains PRD-compliant and frontend needs no contract workarounds.

### 5.3 Web integration tests

Execution list:

- Test public heatmap from backend data.
- Test public message-value filter.
- Test map type switching.
- Test marker-only mode.
- Test public lookup success/failure.
- Test admin login/session.
- Test admin node registration.
- Test admin duplicate node error.
- Test admin node search.
- Test admin marker select and history panel.

Exit criteria:

- Frontend/backend integration is covered by automated tests.

## 10. Phase 6 - Hosted Web/API End-to-End Tests

Goal: validate the hosted backend and web behavior before CI/CD deployment automation is built.

### 6.1 Backend/web e2e harness

Execution list:

- Add e2e test setup for API + web + MongoDB.
- Seed admin user.
- Seed registered nodes.
- Ingest simulated message batches.
- Reset test data between scenarios.

Exit criteria:

- E2E tests can run repeatably in local or CI-like environment.

### 6.2 Public e2e scenarios

Execution list:

- Public opens heatmap without login.
- Public filters heatmap by canonical message value.
- Public switches to satellite view.
- Public uses marker-only mode.
- Public lookup succeeds with correct full name and birth date.
- Public lookup fails generically with wrong birth date.
- Public lookup fails generically with unknown name.

Exit criteria:

- Public web flows pass against real backend.

### 6.3 Admin e2e scenarios

Execution list:

- Admin logs in.
- Admin registers node.
- Admin sees node in registered node table.
- Admin searches by node ID.
- Admin searches by owner name.
- Admin views admin map.
- Admin selects marker.
- Admin sees full node message history with metadata.

Exit criteria:

- Admin web flows pass against real backend.

### 6.4 Ingest e2e scenarios

Execution list:

- Simulate mobile/gateway burst with one valid message.
- Simulate duplicate `senderNodeId + seqId`.
- Simulate two phones uploading the same LoRa message.
- Simulate concurrent duplicate upload race for one LoRa message.
- Simulate mixed valid and invalid batch.
- Verify heatmap updates after ingest.
- Verify admin history updates after ingest.
- Verify public lookup can see validated history.

Exit criteria:

- Backend ingest, web map, admin history, and public lookup work as one hosted system.

## 11. Phase 7 - Full Hosted CI/CD on Main Only

Goal: implement GitHub Actions and VM deployment for backend/web hosted runtime after backend and frontend e2e are stable.

### 7.1 Docker Compose runtime

Execution list:

- Add Compose services:
  - `mongo`,
  - `api`,
  - `web`,
  - `caddy`.
- Put MongoDB on internal Docker network.
- Expose only Caddy publicly.
- Persist MongoDB data under hosted shared path.
- Add health checks where practical.

Exit criteria:

- Full hosted stack runs locally or on VM using Docker Compose.

### 7.2 Caddy routing

Execution list:

- Route `loomnetwork.site` to web.
- Route `api.loomnetwork.site` to API.
- Configure TLS email.
- Add proxy headers.
- Keep MongoDB private.

Exit criteria:

- Domains route correctly through Caddy in hosted environment.

### 7.3 Remote deploy and rollback scripts

Execution list:

- Add remote deploy script.
- Add remote rollback script.
- Implement release directory layout:
  - `/opt/loom/hosted/releases/<sha>`,
  - `/opt/loom/hosted/current`,
  - `/opt/loom/hosted/current_release`,
  - `/opt/loom/hosted/shared/runtime.env`,
  - `/opt/loom/hosted/shared/mongo-data`.
- Build images locally on VM.
- Wait for `mongo`, `api`, `web`, and `caddy`.
- Keep latest five releases.
- Never delete shared MongoDB data.

Exit criteria:

- VM can deploy and rollback exact git SHA releases.

### 7.4 Main-only CI workflow

Execution list:

- Trigger CI only on:
  - `push` to `main`,
  - `pull_request` targeting `main`.
- Add hosted-runtime path filters.
- Exclude docs-only changes:
  - `.agent/**`,
  - `docs/**`,
  - `*.md`.
- Exclude mobile-app-only changes from hosted CI/deploy.
- Run:
  - `npm ci`,
  - lint,
  - typecheck,
  - tests,
  - e2e tests,
  - build,
  - Docker Compose config,
  - Docker Compose build.

Exit criteria:

- CI does not run for non-main branches or irrelevant paths.

### 7.5 Security workflow checks

Execution list:

- Add Gitleaks secret scan.
- Add Trivy filesystem scan for HIGH/CRITICAL findings.
- Add CodeQL for JavaScript/TypeScript.
- Add Dependency Review for pull requests targeting `main`.

Exit criteria:

- Security checks protect hosted runtime changes before merge/deploy.

### 7.6 Deploy workflow

Execution list:

- Trigger automatic deploy only after successful CI on `main`.
- Support manual dispatch with selected `git_ref`.
- Resolve `RELEASE_SHA`.
- Validate VM and runtime secrets.
- SSH using pinned known hosts.
- Upload git archive source release.
- Render remote `runtime.env`.
- Run remote deploy.
- Smoke test web and API.
- Semantically validate `/ready`.
- Roll back to previous release on failed validation.

Exit criteria:

- Main branch hosted runtime deploys automatically and safely.

## 12. Phase 8 - IoT Firmware for ESP32 + LoRa + BLE

Goal: implement ESP32 firmware after hosted backend/web/API contracts and CI/CD are stable.

### 8.1 Firmware project scaffold

Execution list:

- Create `firmware/loom-node`.
- Choose Arduino or PlatformIO project structure.
- Add compile configuration for ESP32 target.
- Preserve or migrate useful pin constants from existing sketches.
- Add configuration for LoRa frequency per target hardware/regulatory setting.

Exit criteria:

- Firmware project compiles with an empty or minimal loop.

### 8.2 LoRa V2 packet codec

Execution list:

- Implement big-endian read/write helpers.
- Implement uint24 node ID encode/decode.
- Implement HEARTBEAT encode/decode.
- Implement DATA encode/decode.
- Implement latE6/lonE6 conversion helpers.
- Validate codec against PRD examples and shared fixtures.

Exit criteria:

- Firmware codec matches PRD byte layout and example packet values.

### 8.3 Firmware routing state

Execution list:

- Implement dedup cache keyed by `senderNodeId + seqId`.
- Implement 30-minute dedup expiry.
- Implement pending queue with 30-minute expiry.
- Implement neighbor table with timeout.
- Implement oldest-neighbor eviction when table is full.

Exit criteria:

- Firmware routing state can be tested independently from LoRa radio.

### 8.4 Heartbeat and route recompute

Execution list:

- Send HEARTBEAT every 12 to 18 seconds using jitter.
- Receive HEARTBEAT and update neighbor table.
- Recompute route every 5 seconds.
- Implement gateway range behavior when mobile internet path is active.
- Implement stale best-gateway timeout rule.

Exit criteria:

- Multiple nodes can form a range gradient and recover when gateway disappears.

### 8.5 DATA forwarding

Execution list:

- Receive LoRa DATA.
- Validate magic and packet type.
- Deduplicate.
- Forward only when `self.rangeToGateway < packet.forwarderRangeToGateway`.
- Update only `forwarderRangeToGateway`.
- Add random forward delay 100 to 1000 ms.
- Add optional suppression only after minimal forwarding is stable.

Exit criteria:

- DATA moves down the range gradient and avoids equal/higher range forwarding.

### 8.6 BLE bridge for future mobile app

Execution list:

- Expose node identity characteristic.
- Implement validation handshake or node ID confirmation.
- Accept mobile message writes only after validation.
- Expose backlog read/stream.
- Accept mobile internet status update.
- Clear backlog only after mobile receipt confirmation.

Exit criteria:

- Firmware has the BLE surface required by the mobile app phase.

### 8.7 Firmware tests

Execution list:

- Test HEARTBEAT encode/decode.
- Test DATA encode/decode.
- Test GPS fixed-point conversion.
- Test dedup duplicate drop.
- Test pending queue behavior.
- Test route recompute with valid best neighbor.
- Test route recompute with no valid neighbor.
- Test stale gateway timeout anti-false-route behavior.
- Test forwarding allowed when receiver range is lower.
- Test forwarding denied when receiver range is equal/higher.
- Test forwarding denied when receiver range is 65535.
- Run hardware tests with two-node heartbeat and three-node gradient.

Exit criteria:

- Firmware is ready for mobile app integration and controlled hardware tests.

## 13. Phase 9 - Mobile App Implementation

Goal: implement the React Native Expo mobile app after backend and firmware BLE/API contracts are stable.

### 9.1 Expo app foundation

Execution list:

- Scaffold React Native Expo app.
- Add TypeScript.
- Add navigation.
- Add environment config for backend API base URL.
- Add screens:
  - Connect Node,
  - Nearby Nodes,
  - Message Composer,
  - Safe Status,
  - Sent History,
  - Sync Status,
  - Settings/Permissions.

Exit criteria:

- Mobile app runs in Expo dev environment with placeholder screens.

### 9.2 Local storage

Execution list:

- Implement local sent-message store.
- Implement received backlog store.
- Track statuses:
  - draft,
  - sent_to_node,
  - queued,
  - synced,
  - failed.
- Store sync result summaries.
- Retain backlog until backend accepts or marks duplicate.

Exit criteria:

- Mobile can create and display local history offline.

### 9.3 BLE connection flow

Execution list:

- Add BLE library suitable for Expo workflow or document required dev-client constraints.
- Implement permission flow.
- Implement scan lifecycle.
- Implement nearby node list.
- Implement node identity read.
- Implement node ID validation.
- Implement connection status state machine.
- Connect to firmware BLE bridge from Phase 8.

Exit criteria:

- App can discover, validate, and connect to simulated or real BLE nodes.

### 9.4 Decision-tree compression

Execution list:

- Implement canonical message-value taxonomy from PRD deferred decision when chosen.
- Implement deterministic compression function.
- Return one canonical `message` value for free-text reports.
- Add fixtures for representative emergency messages.
- Enforce target payload constraints before sending to ESP32.

Exit criteria:

- Mobile can compress free-text messages into supported canonical `message` values.

### 9.5 Message sending

Execution list:

- Build message composer.
- Attach timestamp and GPS when available.
- Send compressed payload through BLE write.
- Save local sent history.
- Implement safe-status fixed payload flow.
- Show clear local delivery state after node receipt.

Exit criteria:

- Mobile can send emergency and safe-status payloads to a connected node.

### 9.6 Backlog receive and direct backend burst

Execution list:

- Read or stream node backlog over BLE.
- Store received backlog locally.
- Detect internet availability.
- Call `POST /api/ingest/burst`.
- Handle accepted, duplicate, and rejected response items.
- Retry failed bursts with backoff.
- Notify connected node when internet is available.

Exit criteria:

- Mobile can bridge node backlog directly to the Node.js/Express backend API.

### 9.7 Mobile tests

Execution list:

- Test compression.
- Test local status transitions.
- Test burst response handling.
- Test BLE abstraction with mocks.
- Test node ID validation.
- Add manual hardware test checklist for real devices.

Exit criteria:

- Mobile core logic is tested without requiring physical BLE hardware for every run.

## 14. Phase 10 - Mobile/Backend/IoT Integration and Minor Backend Adjustments

Goal: integrate mobile app with firmware and backend, allowing only minor backend changes needed to support real mobile behavior.

### 10.1 Single-node mobile-to-backend path

Execution list:

- Register test node in admin web.
- Connect mobile app to ESP32 node over BLE.
- Validate node ID.
- Send safe status.
- Send compressed emergency message.
- Give phone internet.
- Burst to backend.
- Confirm admin and public web display expected results.

Exit criteria:

- One node owner can send messages and see them in backend/web.

### 10.2 Multi-node LoRa path

Execution list:

- Configure at least three ESP32 LoRa nodes.
- Establish heartbeat and range gradient.
- Send message from non-gateway range node.
- Verify forwarding sequence.
- Verify final gateway/mobile burst.
- Verify backend dedup and web display.

Exit criteria:

- Multi-hop message reaches backend through a gateway-capable node.

### 10.3 Minor backend adjustments for mobile realities

Allowed adjustment scope:

- Add mobile installation metadata fields if needed for diagnostics.
- Add safe per-item rejected reason codes needed by mobile sync UX.
- Preserve cross-phone duplicate handling so duplicate outcomes let every uploader mark local backlog items as synced.
- Add batch size tuning based on real phone behavior.
- Add accepted clock-skew handling for offline backlog timestamps.
- Add indexes required by real burst/history query patterns.

Disallowed adjustment scope:

- Do not redesign ingest idempotency.
- Do not scope deduplication to phone identity, uploader identity, or batch identity.
- Keep mobile bursting as direct HTTPS API upload to the Node.js/Express backend.
- Do not make mobile talk directly to MongoDB.
- Do not weaken public lookup privacy.
- Do not add mobile app deployment to hosted CI/CD.

Exit criteria:

- Mobile app can sync reliably without changing core backend architecture.

### 10.4 Failure-path validation

Execution list:

- Disable phone internet and verify backlog stays local.
- Restore internet and verify burst.
- Disconnect BLE mid-transfer and verify retry/local state.
- Disable gateway phone internet and verify firmware range timeout.
- Restore gateway path and verify range 0 advertisement.
- Kill intermediate node and verify route recompute.
- Send duplicate packet and verify firmware/backend duplicate handling.

Exit criteria:

- Core disaster failure modes behave according to PRD.

## 15. Phase 11 - Final Hardening and Observability

Goal: make the full system stable under burst traffic, operationally visible, and safer for public use.

### 11.1 Backend hardening

Execution list:

- Tune rate limits for public lookup and admin login.
- Tune burst batch size and payload size limits.
- Add structured logs for ingest, lookup, and readiness.
- Add slow query review for map/history APIs.
- Add MongoDB index verification in readiness.

Exit criteria:

- Backend remains stable under simulated burst and lookup abuse tests.

### 11.2 Web hardening

Execution list:

- Batch heatmap rendering updates.
- Debounce filters/search.
- Paginate history.
- Add loading and stale-data indicators.
- Verify mobile and desktop layouts.
- Validate Google Maps failure fallback.

Exit criteria:

- Web remains responsive with large message and marker fixture datasets.

### 11.3 Firmware hardening

Execution list:

- Test long-running heartbeat behavior.
- Test dedup cache expiry.
- Test pending queue expiry.
- Test memory use under backlog load.
- Verify random forward delay collision reduction.

Exit criteria:

- Firmware is stable enough for controlled field tests.

### 11.4 Mobile hardening

Execution list:

- Add retry/backoff around burst sync.
- Add local error states for BLE failures.
- Add safe handling for permission denial.
- Add local backlog storage limits.
- Add user-visible sync status.

Exit criteria:

- Mobile app handles offline, BLE failure, and partial backend failures without data loss.

## 16. Phase 12 - Acceptance Test Pass and Handoff

Goal: run PRD acceptance criteria across backend, web, CI/CD, IoT, mobile, and full integration.

### 12.1 Automated acceptance

Execution list:

- Run backend tests for validation, dedup, public privacy, and admin node registration.
- Run web tests for heatmap, map switching, marker view, search, and history.
- Run hosted e2e tests for backend/web.
- Run Docker Compose config/build.
- Run firmware codec/routing tests.
- Run mobile tests for BLE mocks, compression, local history, and burst sync.

Exit criteria:

- All automated tests required by PRD pass.

### 12.2 Manual acceptance

Execution list:

- Test real admin node registration.
- Test real public lookup.
- Test real mobile node validation.
- Test real safe-status payload.
- Test real compressed message value.
- Test two-hop LoRa forwarding.
- Test mobile direct backend burst.
- Test VM deploy and rollback.

Exit criteria:

- Manual acceptance checklist is complete and documented.

### 12.3 Release readiness handoff

Execution list:

- Update `.agent/PRD.md` if implemented behavior changed.
- Update `.agent/implementationPhases.md` phase statuses.
- Add deployment guide if live VM rollout is ready.
- Add environment matrix for local and hosted runtime.
- Add production readiness checklist before real disaster-response use.

Exit criteria:

- Future sessions can resume from documented state without rediscovering architecture.

## 17. Phase Dependency Matrix

| Phase                             | Depends on | Unlocks                        |
| --------------------------------- | ---------- | ------------------------------ |
| 0 Product baseline                | PRD        | All implementation             |
| 1 Scaffold/contracts              | 0          | Backend implementation         |
| 2 Full backend                    | 1          | Backend tests                  |
| 3 Backend tests                   | 2          | Frontend implementation        |
| 4 Web frontend                    | 3          | Frontend/backend integration   |
| 5 Frontend/backend integration    | 4          | Hosted e2e tests               |
| 6 Hosted e2e tests                | 5          | CI/CD                          |
| 7 Full hosted CI/CD               | 6          | Stable hosted web/API          |
| 8 IoT firmware                    | 7          | Mobile BLE integration         |
| 9 Mobile app                      | 8, 7       | Mobile/backend/IoT integration |
| 10 Mobile/backend/IoT integration | 9          | Full-system hardening          |
| 11 Hardening                      | 10         | Acceptance                     |
| 12 Acceptance/handoff             | 11         | Release readiness              |

## 18. Recommended First Execution Batch

Phases 0-4 are complete. The next recommended execution batch is Phase 5:

1. Run the real Next.js web app against a live local backend and MongoDB fixture set.
2. Verify public map, public lookup, admin login, node registration, admin marker select, and message history against real API responses.
3. Add frontend/backend integration tests and e2e coverage for those flows.
4. Make only small backend adjustments needed for frontend compatibility, while preserving privacy and ingest idempotency decisions.
5. Keep `.agent/designImages`, `.next`, and `output` artifacts out of commits.

The backend and initial web surfaces are now stable enough for integration work, with backend contract snapshots, Mongo-backed API tests, and web unit tests in place.
