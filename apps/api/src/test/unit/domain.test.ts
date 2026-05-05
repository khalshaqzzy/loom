import { MAX_NODE_ID, PUBLIC_LOOKUP_GENERIC_FAILURE, nodeIdNumericSchema } from "@loom/contracts";
import { describe, expect, it } from "vitest";
import { loadConfig } from "../../config/env";
import { createDedupKey } from "../../modules/ingest/dedup";
import { aggregateHeatmapPoints } from "../../modules/map/heatmapService";
import { hashBirthDate, normalizeOwnerName } from "../../modules/nodes/nodeIdentity";
import { ObjectId } from "mongodb";
import type { MeshMessageDocument } from "../../db/documents";

describe("backend domain utilities", () => {
  it("validates required config values", () => {
    expect(() =>
      loadConfig({
        SESSION_SECRET: "short",
        OWNER_BIRTHDATE_HASH_SECRET: "test-birthdate-secret-000000000000000"
      })
    ).toThrow();
  });

  it("validates node IDs as uint24", () => {
    expect(nodeIdNumericSchema.parse(MAX_NODE_ID)).toBe(MAX_NODE_ID);
    expect(() => nodeIdNumericSchema.parse(MAX_NODE_ID + 1)).toThrow();
    expect(() => nodeIdNumericSchema.parse(-1)).toThrow();
  });

  it("normalizes owner names deterministically", () => {
    expect(normalizeOwnerName("  Ayu   Lestari  ")).toBe("ayu lestari");
  });

  it("matches birth-date hashes for the same secret and date", () => {
    const config = { OWNER_BIRTHDATE_HASH_SECRET: "test-birthdate-secret-000000000000000" };
    expect(hashBirthDate(config, "1990-04-21")).toBe(hashBirthDate(config, "1990-04-21"));
    expect(hashBirthDate(config, "1990-04-21")).not.toBe(hashBirthDate(config, "1990-04-22"));
  });

  it("generates the canonical dedup key", () => {
    expect(createDedupKey(42, 7)).toBe("42:7");
  });

  it("aggregates heatmap points by coordinate and message", () => {
    const messages = [
      meshMessage({ messageId: "1", seqId: 1 }),
      meshMessage({ messageId: "2", seqId: 2 }),
      meshMessage({ messageId: "3", seqId: 3, message: "medical_help" })
    ];

    expect(aggregateHeatmapPoints(messages)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ message: "fine", count: 2, weight: 2 }),
        expect.objectContaining({ message: "medical_help", count: 1, weight: 1 })
      ])
    );
  });

  it("keeps public lookup failure generic", () => {
    expect(PUBLIC_LOOKUP_GENERIC_FAILURE).not.toMatch(/birth|name|exists/i);
  });
});

const meshMessage = (overrides: Partial<MeshMessageDocument>): MeshMessageDocument => ({
  _id: new ObjectId(),
  messageId: overrides.messageId ?? "1",
  dedupKey: `42:${overrides.seqId ?? 1}`,
  senderNodeId: 42,
  seqId: overrides.seqId ?? 1,
  senderRangeToGateway: 2,
  lastForwarderRangeToGateway: 1,
  timestamp: new Date("2026-05-04T00:00:00.000Z"),
  lat: -6.2,
  lon: 106.816666,
  latE6: -6_200_000,
  lonE6: 106_816_666,
  message: overrides.message ?? "fine",
  receivedByNodeId: 77,
  receivedByUploaderId: "mobile-test-1",
  uploaderType: "mobile_app",
  source: "lora_mesh",
  receivedByBackendAt: new Date("2026-05-04T00:01:00.000Z")
});
