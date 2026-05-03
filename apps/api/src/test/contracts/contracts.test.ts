import {
  burstIngestResponseSchema,
  healthResponseSchema,
  markerResponseSchema,
  registeredNodeSchema
} from "@loom/contracts";
import { describe, expect, it } from "vitest";

describe("API contract snapshots", () => {
  it("freezes critical response shapes", () => {
    expect(
      healthResponseSchema.parse({
        status: "ok",
        timestamp: "2026-05-04T00:00:00.000Z"
      })
    ).toMatchInlineSnapshot(`
      {
        "status": "ok",
        "timestamp": "2026-05-04T00:00:00.000Z",
      }
    `);

    expect(
      registeredNodeSchema.parse({
        nodeId: "42",
        nodeIdNumeric: 42,
        ownerFullName: "Ayu Lestari",
        lastKnownLat: null,
        lastKnownLon: null,
        lastSeenAt: null,
        lastRangeToGateway: null,
        lastMessageAt: null,
        status: "registered",
        createdAt: "2026-05-04T00:00:00.000Z",
        updatedAt: "2026-05-04T00:00:00.000Z"
      })
    ).toMatchInlineSnapshot(`
      {
        "createdAt": "2026-05-04T00:00:00.000Z",
        "lastKnownLat": null,
        "lastKnownLon": null,
        "lastMessageAt": null,
        "lastRangeToGateway": null,
        "lastSeenAt": null,
        "nodeId": "42",
        "nodeIdNumeric": 42,
        "ownerFullName": "Ayu Lestari",
        "status": "registered",
        "updatedAt": "2026-05-04T00:00:00.000Z",
      }
    `);

    expect(
      burstIngestResponseSchema.parse({
        batchId: "batch-1",
        accepted: [{ senderNodeId: 42, seqId: 1, dedupKey: "42:1" }],
        duplicate: [],
        rejected: []
      })
    ).toMatchInlineSnapshot(`
      {
        "accepted": [
          {
            "dedupKey": "42:1",
            "senderNodeId": 42,
            "seqId": 1,
          },
        ],
        "batchId": "batch-1",
        "duplicate": [],
        "rejected": [],
      }
    `);

    expect(
      markerResponseSchema.parse({
        markers: [
          {
            nodeId: "42",
            nodeIdNumeric: 42,
            lat: -6.2,
            lon: 106.8,
            status: "active",
            lastSeenAt: "2026-05-04T00:00:00.000Z",
            lastMessageAt: "2026-05-04T00:00:00.000Z",
            lastRangeToGateway: 1
          }
        ]
      })
    ).toMatchInlineSnapshot(`
      {
        "markers": [
          {
            "lastMessageAt": "2026-05-04T00:00:00.000Z",
            "lastRangeToGateway": 1,
            "lastSeenAt": "2026-05-04T00:00:00.000Z",
            "lat": -6.2,
            "lon": 106.8,
            "nodeId": "42",
            "nodeIdNumeric": 42,
            "status": "active",
          },
        ],
      }
    `);
  });
});
