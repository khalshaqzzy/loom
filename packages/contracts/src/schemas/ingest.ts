import { z } from "zod";
import { MAX_INGEST_BATCH_SIZE } from "../constants";
import { messageSourceSchema, messageValueSchema, uploaderTypeSchema } from "../enums";
import {
  isoDateTimeSchema,
  latE6Schema,
  latitudeSchema,
  lonE6Schema,
  longitudeSchema,
  nodeIdNumericSchema,
  routeRangeSchema,
  seqIdSchema
} from "./primitives";

export const burstIngestMessageSchema = z.object({
  senderNodeId: nodeIdNumericSchema,
  seqId: seqIdSchema,
  senderRangeToGateway: routeRangeSchema,
  lastForwarderRangeToGateway: routeRangeSchema,
  timestamp: isoDateTimeSchema,
  lat: latitudeSchema.optional().nullable(),
  lon: longitudeSchema.optional().nullable(),
  latE6: latE6Schema.optional().nullable(),
  lonE6: lonE6Schema.optional().nullable(),
  message: messageValueSchema,
  receivedByNodeId: nodeIdNumericSchema.optional().nullable(),
  source: messageSourceSchema.default("lora_mesh")
});

export const burstIngestRequestSchema = z.object({
  uploaderType: uploaderTypeSchema,
  mobileInstallationId: z.string().trim().min(1).max(120).optional(),
  uploaderNodeId: nodeIdNumericSchema.optional(),
  uploadedAt: isoDateTimeSchema.optional(),
  messages: z.array(burstIngestMessageSchema).min(1).max(MAX_INGEST_BATCH_SIZE)
});

export const ingestAcceptedItemSchema = z.object({
  senderNodeId: nodeIdNumericSchema,
  seqId: seqIdSchema,
  dedupKey: z.string()
});

export const ingestRejectedItemSchema = z.object({
  senderNodeId: nodeIdNumericSchema.optional(),
  seqId: seqIdSchema.optional(),
  index: z.number().int().min(0),
  reason: z.string()
});

export const burstIngestResponseSchema = z.object({
  batchId: z.string(),
  accepted: z.array(ingestAcceptedItemSchema),
  duplicate: z.array(ingestAcceptedItemSchema),
  rejected: z.array(ingestRejectedItemSchema)
});

export type BurstIngestMessage = z.infer<typeof burstIngestMessageSchema>;
export type BurstIngestRequest = z.infer<typeof burstIngestRequestSchema>;
export type BurstIngestResponse = z.infer<typeof burstIngestResponseSchema>;
