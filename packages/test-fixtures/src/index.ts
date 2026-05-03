import type { BurstIngestMessage, BurstIngestRequest, MessageValue } from "@loom/contracts";

export const fixtureAdmin = {
  username: "admin",
  password: "change-me-test-password",
  displayName: "LOOM Admin"
};

export const fixtureNodeOwner = {
  nodeId: 42,
  ownerFullName: "Ayu Lestari",
  ownerBirthDate: "1990-04-21"
};

export const fixtureSecondNodeOwner = {
  nodeId: 77,
  ownerFullName: "Bima Pratama",
  ownerBirthDate: "1988-08-11"
};

export const validMeshMessage = (overrides: Partial<BurstIngestMessage> = {}): BurstIngestMessage => ({
  senderNodeId: 42,
  seqId: 1,
  senderRangeToGateway: 2,
  lastForwarderRangeToGateway: 1,
  timestamp: "2026-05-04T00:00:00.000Z",
  lat: -6.2,
  lon: 106.816666,
  latE6: -6_200_000,
  lonE6: 106_816_666,
  message: "fine",
  receivedByNodeId: 77,
  source: "lora_mesh",
  ...overrides
});

export const duplicateMeshMessage = (): BurstIngestMessage =>
  validMeshMessage({
    senderNodeId: 42,
    seqId: 1,
    lastForwarderRangeToGateway: 0
  });

export const burstRequest = (
  messages: BurstIngestMessage[] = [validMeshMessage()],
  overrides: Partial<BurstIngestRequest> = {}
): BurstIngestRequest => ({
  uploaderType: "mobile_app",
  mobileInstallationId: "mobile-test-1",
  uploadedAt: "2026-05-04T00:01:00.000Z",
  messages,
  ...overrides
});

export const heatmapFixturePoint = {
  lat: -6.2,
  lon: 106.816666,
  weight: 1,
  message: "fine" as MessageValue,
  count: 1,
  latestTimestamp: "2026-05-04T00:00:00.000Z"
};

export const markerFixture = {
  nodeId: "42",
  nodeIdNumeric: 42,
  lat: -6.2,
  lon: 106.816666,
  status: "active",
  lastSeenAt: "2026-05-04T00:00:00.000Z",
  lastMessageAt: "2026-05-04T00:00:00.000Z",
  lastRangeToGateway: 1
};

export const publicLookupSuccessFixture = {
  ownerFullName: fixtureNodeOwner.ownerFullName,
  ownerBirthDate: fixtureNodeOwner.ownerBirthDate
};

export const publicLookupFailureFixture = {
  ownerFullName: fixtureNodeOwner.ownerFullName,
  ownerBirthDate: "1999-01-01"
};

export const loraV2PacketFixture = {
  heartbeatHex: "4c4d0100002a0001",
  dataDedupKey: "42:1"
};
