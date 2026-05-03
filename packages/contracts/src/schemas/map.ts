import { z } from "zod";
import { messageValueSchema } from "../enums";
import {
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  nodeIdNumericSchema,
  routeRangeSchema
} from "./primitives";

export const heatmapQuerySchema = z.object({
  message: messageValueSchema.optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional()
});

export const heatmapPointSchema = z.object({
  lat: latitudeSchema,
  lon: longitudeSchema,
  weight: z.number().min(0),
  message: messageValueSchema,
  count: z.number().int().min(1),
  latestTimestamp: isoDateTimeSchema
});

export const heatmapResponseSchema = z.object({
  points: z.array(heatmapPointSchema)
});

export const markerModeSchema = z.enum(["public", "admin"]).default("public");

export const markerSchema = z.object({
  nodeId: z.string(),
  nodeIdNumeric: nodeIdNumericSchema,
  lat: latitudeSchema.nullable(),
  lon: longitudeSchema.nullable(),
  status: z.string(),
  lastSeenAt: isoDateTimeSchema.nullable(),
  lastMessageAt: isoDateTimeSchema.nullable(),
  lastRangeToGateway: routeRangeSchema.nullable(),
  ownerFullName: z.string().optional()
});

export const markerResponseSchema = z.object({
  markers: z.array(markerSchema)
});

export type HeatmapPoint = z.infer<typeof heatmapPointSchema>;
