# ADR: Mobile Enhancement Against Final BLE Contract

## Status

Accepted

## Date

2026-05-15

## Context

The LOOM mobile app must become PRD-compliant for offline-first field use while firmware is still converging on the final BLE protocol. The PRD and gap reports require mobile to support node discovery, node identity validation, safe and emergency messaging, backlog ingestion, internet status propagation, and sync to the existing backend ingest API.

Two implementation constraints apply:

- `apps/mobile` must remain standalone and must not be added to the root workspace or root scripts.
- No mobile test suite or mobile test files are added as part of this phase.

The prior mobile implementation mixed UI code with BLE JSON construction, AsyncStorage history arrays, backend request body construction, and optimistic delivery language. That made it difficult to align mobile with the firmware contract and backend ingest semantics.

## Decision Drivers

- Mobile must match the final firmware BLE contract from `.agent/integrationImpelentationPhase.md`.
- Existing BLE service, report/message write, and internet status UUIDs must remain stable.
- Missing BLE characteristics must be represented in shared contracts before firmware is ready.
- SQLite must become the canonical store for sent messages and backlog items.
- AsyncStorage is limited to settings, installation identity, and device hints.
- Emergency free text must never be sent to firmware or backend; only canonical messages are transmitted.
- Safe status is not decision-tree driven and must always send `fine`.
- Mobile development must remain possible without firmware by using a full mock BLE client.

## Considered Options

### Option 1: Continue Screen-Centric BLE and AsyncStorage Flow

Pros:

- Smallest short-term code movement.
- Easy to keep the existing prototype screens running.

Cons:

- Keeps BLE protocol, backend sync, and UI state coupled.
- Makes validation gating and backlog ack semantics fragile.
- AsyncStorage arrays are not appropriate for backlog durability, retries, or per-item status.
- Does not give firmware and mobile implementers a stable contract boundary.

### Option 2: Wait for Firmware Before Refactoring Mobile

Pros:

- Native BLE behavior could be validated directly against hardware.
- Less speculative native BLE code.

Cons:

- Blocks mobile progress on firmware availability.
- Leaves message, storage, sync, and UI gaps unresolved.
- Increases integration risk because mobile and firmware would converge late.

### Option 3: Mock-First Mobile Architecture Against Shared Final Contracts

Pros:

- Lets mobile implement the final app behavior now.
- Gives firmware a precise BLE schema and UUID target.
- Separates BLE, message building, persistence, sync, and UI concerns.
- Enables offline manual validation without hardware.
- Keeps mobile standalone as required.

Cons:

- Native BLE paths still need real-device validation once firmware finalizes.
- Some firmware notify/read timing details may require adjustment after hardware testing.
- Without mobile tests, regression control relies on typecheck and manual scenario verification.

## Decision

Adopt **Option 3: Mock-first mobile architecture against shared final contracts**.

The implementation adds:

- BLE schemas and UUID constants in `packages/contracts`.
- A shared `@loom/decision-tree` package for canonical emergency compression.
- A mobile `BleClient` interface with mock and native implementations.
- SQLite-backed sent message and backlog storage.
- Typed sync flow that preserves per-item backend outcomes.
- Screen refactors so React UI uses services instead of building raw BLE/backend payloads directly.

## Rationale

This keeps mobile and firmware aligned on a single protocol model while allowing both sides to move independently. The shared BLE schemas define the final contract surface, the mock client exercises the same mobile flows that native BLE will use, and SQLite gives backlog sync the durability needed by the PRD.

The decision also keeps the user's explicit constraints intact: mobile remains outside the root workspace, and no mobile test files or test scripts are introduced.

## Consequences

### Positive

- Mobile now has a clear protocol boundary for node identity, validation, message ack, backlog stream, backlog ack, internet status, and node status.
- Node trust is gated by validation before message write, backlog subscription, and internet status write.
- Safe status always emits `fine`.
- Emergency messages are compressed to canonical values before transmission.
- Backlog items are stored before firmware ack and are synced item-by-item without global clearing.
- Backend ingest payloads stay aligned with the existing API contract.

### Negative

- Native BLE is implemented before final firmware is available, so real-device behavior must still be verified.
- The app has no new automated mobile test coverage by design.
- `apps/mobile` uses local file dependencies to shared packages and builds them through local package scripts.

### Risks

- Firmware may implement validation or message acknowledgement as notify-only while mobile currently supports read/write paths that may need timing adjustments.
- `@config-plugins/react-native-ble-plx` has an Expo peer range mismatch in the current mobile dependency tree, requiring `npm install --legacy-peer-deps`.
- NPM reports moderate vulnerabilities in the mobile dependency tree; these were not addressed in this phase.

## Implementation Notes

- `packages/contracts/src/schemas/ble.ts` is the source of BLE UUIDs and payload schemas.
- `packages/decision-tree/src` owns canonical emergency metadata and compression.
- `apps/mobile/src/ble/client.ts` defines the mobile BLE abstraction.
- `apps/mobile/src/ble/mockClient.ts` provides firmware-independent manual flows.
- `apps/mobile/src/ble/nativeClient.ts` wires the final contract to `react-native-ble-plx`.
- `apps/mobile/src/storage` owns SQLite migrations and persistence.
- `apps/mobile/src/sync` owns backend burst ingest.
- `apps/mobile/src/messages/buildMobileMessage.ts` owns safe/emergency BLE payload construction.

## Verification

Completed checks:

- `npm run build -w @loom/contracts`
- `npm run typecheck -w @loom/contracts`
- `npm run build` in `packages/decision-tree`
- `npm run typecheck` in `packages/decision-tree`
- `npm run typecheck` in `apps/mobile`
- root `npm run typecheck`
- `npx expo config --type public` in `apps/mobile`
- Confirmed no mobile `test`, `spec`, or `__tests__` files were added.

## Related Documents

- `.agent/PRD.md`
- `.agent/rules.md`
- `.agent/firmwareMobileGapReport.md`
- `.agent/integrationImpelentationPhase.md`
- `.agent/sessionHandoff-2026-05-15-mobile-enhancement.md`
