import { z } from "zod";
import { messageSourceSchema, messageValueSchema } from "../enums";
import {
  isoDateTimeSchema,
  latitudeSchema,
  latE6Schema,
  lonE6Schema,
  longitudeSchema,
  nodeIdNumericSchema,
  paginationQuerySchema,
  routeRangeSchema,
  seqIdSchema
} from "./primitives";

export const messageHistoryQuerySchema = paginationQuerySchema.extend({
  nodeId: z.coerce.number().int().optional(),
  ownerName: z.string().trim().max(160).optional(),
  message: messageValueSchema.optional(),
  from: isoDateTimeSchema.optional(),
  to: isoDateTimeSchema.optional()
});

export const meshMessageSchema = z.object({
  messageId: z.string(),
  dedupKey: z.string(),
  senderNodeId: nodeIdNumericSchema,
  seqId: seqIdSchema,
  senderRangeToGateway: routeRangeSchema,
  lastForwarderRangeToGateway: routeRangeSchema,
  timestamp: isoDateTimeSchema,
  lat: latitudeSchema.nullable(),
  lon: longitudeSchema.nullable(),
  latE6: latE6Schema.nullable(),
  lonE6: lonE6Schema.nullable(),
  message: messageValueSchema,
  receivedByNodeId: nodeIdNumericSchema.nullable(),
  receivedByUploaderId: z.string().nullable(),
  source: messageSourceSchema,
  receivedByBackendAt: isoDateTimeSchema
});

export const messageHistoryResponseSchema = z.object({
  messages: z.array(meshMessageSchema),
  nextCursor: z.string().nullable()
});

export type MeshMessageResponse = z.infer<typeof meshMessageSchema>;
