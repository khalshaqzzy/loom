import { z } from "zod";
import { nodeStatusSchema } from "../enums";
import {
  birthDateSchema,
  isoDateTimeSchema,
  latitudeSchema,
  longitudeSchema,
  nodeIdNumericSchema,
  ownerFullNameSchema,
  routeRangeSchema
} from "./primitives";

export const registerNodeRequestSchema = z.object({
  nodeId: nodeIdNumericSchema,
  ownerFullName: ownerFullNameSchema,
  ownerBirthDate: birthDateSchema
});

export const registeredNodeSchema = z.object({
  nodeId: z.string(),
  nodeIdNumeric: nodeIdNumericSchema,
  ownerFullName: ownerFullNameSchema,
  lastKnownLat: latitudeSchema.nullable(),
  lastKnownLon: longitudeSchema.nullable(),
  lastSeenAt: isoDateTimeSchema.nullable(),
  lastRangeToGateway: routeRangeSchema.nullable(),
  lastMessageAt: isoDateTimeSchema.nullable(),
  status: nodeStatusSchema,
  createdAt: isoDateTimeSchema,
  updatedAt: isoDateTimeSchema
});

export const nodeListQuerySchema = z.object({
  search: z.string().trim().max(160).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50)
});

export const nodeListResponseSchema = z.object({
  nodes: z.array(registeredNodeSchema)
});

export type RegisterNodeRequest = z.infer<typeof registerNodeRequestSchema>;
export type RegisteredNodeResponse = z.infer<typeof registeredNodeSchema>;
