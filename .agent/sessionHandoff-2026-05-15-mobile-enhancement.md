# Session Handoff: Mobile Enhancement Final BLE Contract

## Date

2026-05-15

## Branch

`mobile-esp-integration`

## Scope Completed

Implemented the mobile enhancement phase from `.agent/integrationImpelentationPhase.md` and `.agent/firmwareMobileGapReport.md` with the user's constraints:

- No mobile test files or test suite were added.
- `apps/mobile` remains outside the root workspace and root scripts.
- Mobile is wired mock-first against the final firmware BLE contract.
- SQLite is now the canonical local store for sent messages and backlog items.

## Architecture Summary

### Shared Contracts

`packages/contracts/src/schemas/ble.ts` now defines:

- Existing service UUID.
- Existing report/message write UUID.
- Existing internet status UUID.
- New identity, validation, message ack, backlog stream, backlog ack, and node status UUIDs.
- Zod schemas and TypeScript types for final BLE payloads.

`packages/contracts/src/schemas/index.ts` exports the BLE schemas.

### Decision Tree

`packages/decision-tree` was added as a shared package with:

- `compressEmergencyText(input)`
- `isSupportedMessageValue(value)`
- Canonical metadata for:
  - `fine`
  - `needs_rescue`
  - `medical_help`
  - `food_water`
  - `shelter_needed`
  - `trapped`
  - `danger`
  - `unknown`

Safe status does not use the decision tree. Mobile always sends `fine` for safe status.

### Mobile Package

`apps/mobile/package.json` remains standalone and was updated with local file dependencies:

- `@loom/contracts`
- `@loom/decision-tree`

Only local mobile scripts were added:

- `prepare:shared`
- `prestart`
- `preandroid`
- `preios`
- `preweb`
- `typecheck`

Root package scripts/workspaces were not changed to include mobile.

### BLE Layer

New files:

- `apps/mobile/src/ble/client.ts`
- `apps/mobile/src/ble/mockClient.ts`
- `apps/mobile/src/ble/nativeClient.ts`
- `apps/mobile/src/ble/bleClientFactory.ts`

Updated files:

- `apps/mobile/src/ble/BleManager.ts`
- `apps/mobile/src/ble/useBleScanner.ts`
- `apps/mobile/src/hooks/useSelectedNode.ts`

The mobile BLE abstraction supports:

- Scan by LOOM service UUID.
- Connect/disconnect.
- Read node identity.
- Read/write validation challenge.
- Write mobile message and await ack.
- Subscribe backlog.
- Ack backlog after local storage.
- Write internet status.
- Subscribe node status.

Message writes, backlog subscription, and internet status writes are gated by successful validation.

### BLE Hardening Follow-Up

After firmware integration testing exposed node validation failures with JSON parse errors, mobile native BLE handling was hardened:

- Validation and message ack now use notify-first request/response handling with a bounded read fallback.
- BLE JSON decoding now accepts base64 or plain UTF-8 JSON and strips BOM/null/non-JSON padding before schema validation.
- Malformed backlog and node-status notifications are ignored and logged instead of crashing callbacks.
- Failed validation setup disconnects the active BLE connection and surfaces a user-safe validation error.

This is recorded in `docs/adr/0016-mobile-ble-notify-hardening.md`.

### SQLite Storage

New files:

- `apps/mobile/src/storage/database.ts`
- `apps/mobile/src/storage/sentMessages.ts`
- `apps/mobile/src/storage/backlogItems.ts`

Updated file:

- `apps/mobile/src/storage/localStore.ts`

SQLite tables:

- `sent_messages`
- `backlog_items`
- `schema_migrations`

Sent message statuses:

- `draft`
- `sent_to_node`
- `queued`
- `synced`
- `failed`

Backlog sync statuses:

- `pending`
- `syncing`
- `synced`
- `rejected`
- `failed`

Backlog key format:

`senderNodeId + ":" + seqId`

### Sync

New files:

- `apps/mobile/src/sync/burstClient.ts`
- `apps/mobile/src/sync/syncBacklog.ts`

Updated file:

- `apps/mobile/src/api/burst.ts`

Burst ingest sends:

- `uploaderType = "mobile_app"`
- `mobileInstallationId`
- `uploadedAt`
- ISO `timestamp`
- Canonical `message`

Backend `accepted` and `duplicate` results mark local backlog items as `synced`.

Backend `rejected` results remain stored as `rejected` with reason.

There is no global `clearBacklog()` after upload.

### Message and Location Services

New files:

- `apps/mobile/src/messages/buildMobileMessage.ts`
- `apps/mobile/src/location/locationService.ts`
- `apps/mobile/src/config/appConfig.ts`

Updated compatibility files:

- `apps/mobile/src/utils/compression.ts`
- `apps/mobile/src/utils/location.ts`

Emergency message behavior:

- Raw text is compressed locally via the decision tree.
- High confidence sends the canonical value.
- Medium confidence asks for confirmation.
- Unsupported or ambiguous input asks the user to choose a category or revise text.
- Raw free text is stored locally only and is not sent to firmware/backend.

Location behavior:

- GPS is optional.
- If location exists, mobile sends `latE6/lonE6`.
- If location is unavailable, mobile sends without lat/lon and firmware can use its no-fix sentinel behavior.

### Screens

Updated files:

- `apps/mobile/app/_layout.tsx`
- `apps/mobile/app/index.tsx`
- `apps/mobile/app/history.tsx`
- `apps/mobile/app/settings.tsx`

The UI now covers:

- Connect node.
- Nearby nodes.
- Node validation.
- Emergency composer.
- Safe status.
- Sent history.
- Sync status.
- Settings and permissions.

Copy was cleaned to avoid overclaiming delivery guarantees.

## Verification Completed

Commands that passed:

```powershell
npm run build -w @loom/contracts
npm run typecheck -w @loom/contracts
npm run build
npm run typecheck
npm run typecheck
npm run prepare:shared
npm run typecheck
npm run typecheck
npx expo config --type public
npm run typecheck
npx expo config --type public
```

Command context:

- The first two commands were run at repo root for `@loom/contracts`.
- The `npm run build` and `npm run typecheck` pair was run in `packages/decision-tree`.
- `npm run prepare:shared`, `npm run typecheck`, and `npx expo config --type public` were run in `apps/mobile`.
- Root `npm run typecheck` also passed and still does not include mobile.
- The final two commands were rerun in `apps/mobile` after BLE notify hardening.

Mobile test-file check:

```powershell
rg --files apps/mobile | rg "(test|spec|__tests__)"
```

No mobile test/spec files were found or added.

## Known Follow-Up Work

### Native BLE Hardware Validation

Firmware must be tested with:

- Identity read.
- Validation challenge/response.
- Message write and ack.
- Backlog notification and ack.
- Internet status write after validation.
- Node status notification.

The native BLE implementation is aligned to the planned contract, but read/notify timing may need adjustment if firmware exposes validation or ack as notify-only.

### Dependency Follow-Up

`npm install` in `apps/mobile` required:

```powershell
npm install --legacy-peer-deps
```

Reason:

- `@config-plugins/react-native-ble-plx` has an Expo peer range mismatch against the current Expo version.

NPM reports 4 moderate vulnerabilities in the mobile dependency tree. This handoff does not resolve them.

### Manual Scenario Checklist

Run these before release:

- App opens offline.
- Permission denied still allows send without GPS.
- Mock scan -> validate -> safe send -> emergency send -> backlog receive -> burst sync.
- Validation mismatch blocks trusted connection.
- Safe status always sends `fine`.
- Emergency text never sends raw text to firmware/backend.
- Accepted and duplicate backend results mark backlog as synced.
- Rejected backend results remain visible.
- Internet status writes only after validation.

## Files Changed

Primary changed areas:

- `.agent/adr-mobile-enhancement-final-ble-contract.md`
- `.agent/sessionHandoff-2026-05-15-mobile-enhancement.md`
- `docs/adr/0016-mobile-ble-notify-hardening.md`
- `packages/contracts/src/schemas/ble.ts`
- `packages/contracts/src/schemas/index.ts`
- `packages/decision-tree`
- `apps/mobile/package.json`
- `apps/mobile/package-lock.json`
- `apps/mobile/tsconfig.json`
- `apps/mobile/app`
- `apps/mobile/src/ble`
- `apps/mobile/src/config`
- `apps/mobile/src/location`
- `apps/mobile/src/messages`
- `apps/mobile/src/storage`
- `apps/mobile/src/sync`
- `apps/mobile/src/api/burst.ts`
- `apps/mobile/src/hooks/useSelectedNode.ts`
- `apps/mobile/src/utils`
