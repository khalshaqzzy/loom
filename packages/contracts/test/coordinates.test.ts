import { describe, expect, it } from "vitest";
import {
  burstIngestMessageSchema,
  normalizeMeshCoordinates,
  type BurstIngestMessage
} from "../src";

const baseMessage: Omit<BurstIngestMessage, "lat" | "lon" | "latE6" | "lonE6"> = {
  senderNodeId: 42,
  seqId: 1,
  senderRangeToGateway: 2,
  lastForwarderRangeToGateway: 1,
  timestamp: "2026-05-04T00:00:00.000Z",
  message: "fine",
  receivedByNodeId: 77,
  source: "lora_mesh"
};

describe("mesh coordinate normalization", () => {
  it("derives decimal coordinates from E6 values", () => {
    expect(normalizeMeshCoordinates({ latE6: -6_208_763, lonE6: 106_845_599 })).toEqual({
      lat: -6.208763,
      lon: 106.845599,
      latE6: -6_208_763,
      lonE6: 106_845_599
    });
  });

  it("derives E6 values from decimal coordinates", () => {
    expect(normalizeMeshCoordinates({ lat: -6.208763, lon: 106.845599 })).toEqual({
      lat: -6.208763,
      lon: 106.845599,
      latE6: -6_208_763,
      lonE6: 106_845_599
    });
  });

  it("accepts consistent decimal and E6 coordinates", () => {
    expect(
      normalizeMeshCoordinates({
        lat: -6.208763,
        lon: 106.845599,
        latE6: -6_208_763,
        lonE6: 106_845_599
      })
    ).toEqual({
      lat: -6.208763,
      lon: 106.845599,
      latE6: -6_208_763,
      lonE6: 106_845_599
    });
  });

  it("treats the zero-zero E6 sentinel as no location", () => {
    expect(normalizeMeshCoordinates({ latE6: 0, lonE6: 0 })).toEqual({
      lat: null,
      lon: null,
      latE6: null,
      lonE6: null
    });
  });

  it("rejects partial coordinate pairs", () => {
    expect(() => normalizeMeshCoordinates({ latE6: -6_208_763 })).toThrow(
      "Coordinate fixed-point pair must include both latE6 and lonE6."
    );
    expect(() => normalizeMeshCoordinates({ lat: -6.208763 })).toThrow(
      "Coordinate decimal pair must include both lat and lon."
    );
  });

  it("rejects inconsistent decimal and E6 coordinates in ingest messages", () => {
    expect(() =>
      burstIngestMessageSchema.parse({
        ...baseMessage,
        lat: -6.208763,
        lon: 106.845599,
        latE6: -6_200_000,
        lonE6: 106_845_599
      })
    ).toThrow("Coordinate decimal and fixed-point values are inconsistent.");
  });
});
