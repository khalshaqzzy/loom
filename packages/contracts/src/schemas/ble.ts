import { z } from "zod";
import { messageSourceSchema, messageValueSchema } from "../enums";
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

export const loomBleUuids = {
  service: "7d3f9a10-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  nodeIdentity: "7d3f9a11-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  validation: "7d3f9a12-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  messageWrite: "7d3f9a13-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  messageAck: "7d3f9a14-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  backlogStream: "7d3f9a15-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  backlogAck: "7d3f9a16-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  internetStatus: "7d3f9a17-8f6e-4f7a-9c1b-2e4d8f0b6a01",
  nodeStatus: "7d3f9a18-8f6e-4f7a-9c1b-2e4d8f0b6a01"
} as const;

export const loomBleProtocol = "loom-ble-v1" as const;

export const bleNodeIdentitySchema = z.object({
  protocol: z.literal(loomBleProtocol),
  nodeId: nodeIdNumericSchema,
  firmwareVersion: z.string().trim().min(1).max(40),
  capabilities: z.array(z.string().trim().min(1).max(40)).default([])
});

export const bleValidationChallengeSchema = z.object({
  challenge: z.string().trim().min(8).max(32)
});

export const bleValidationRequestSchema = z.object({
  nodeId: nodeIdNumericSchema,
  challenge: z.string().trim().min(8).max(32)
});

export const bleValidationResponseSchema = z.discriminatedUnion("validated", [
  z.object({
    validated: z.literal(true),
    nodeId: nodeIdNumericSchema
  }),
  z.object({
    validated: z.literal(false),
    error: z.string().trim().min(1).max(80)
  })
]);

export const bleMobileMessageSchema = z.object({
  protocol: z.literal(loomBleProtocol),
  clientMessageId: z.string().trim().min(1).max(80),
  message: messageValueSchema,
  timestamp: isoDateTimeSchema,
  lat: latitudeSchema.optional(),
  lon: longitudeSchema.optional(),
  latE6: latE6Schema.optional(),
  lonE6: lonE6Schema.optional(),
  kind: z.enum(["safe", "emergency"])
});

export const bleMessageAckSchema = z.object({
  clientMessageId: z.string().trim().min(1).max(80),
  accepted: z.boolean(),
  senderNodeId: nodeIdNumericSchema.optional(),
  seqId: seqIdSchema.optional(),
  queued: z.boolean().optional(),
  rangeToGateway: routeRangeSchema.optional(),
  error: z.string().trim().min(1).max(120).optional()
});

export const bleBacklogItemSchema = z.object({
  backlogId: z.string().trim().min(3).max(80),
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

export const bleBacklogAckSchema = z.object({
  backlogIds: z.array(z.string().trim().min(3).max(80)).min(1).max(100),
  receipt: z.literal("stored_on_mobile")
});

export const bleInternetStatusSchema = z.object({
  online: z.boolean(),
  observedAt: isoDateTimeSchema,
  mobileInstallationId: z.string().trim().min(1).max(120)
});

export const bleNodeStatusSchema = z.object({
  nodeId: nodeIdNumericSchema,
  validated: z.boolean(),
  rangeToGateway: routeRangeSchema,
  neighborCount: z.number().int().min(0).max(255),
  pendingCount: z.number().int().min(0).max(1000),
  backlogCount: z.number().int().min(0).max(1000),
  internetPathActive: z.boolean()
});

export type BleNodeIdentity = z.infer<typeof bleNodeIdentitySchema>;
export type BleValidationChallenge = z.infer<typeof bleValidationChallengeSchema>;
export type BleValidationRequest = z.infer<typeof bleValidationRequestSchema>;
export type BleValidationResponse = z.infer<typeof bleValidationResponseSchema>;
export type BleMobileMessage = z.infer<typeof bleMobileMessageSchema>;
export type BleMessageAck = z.infer<typeof bleMessageAckSchema>;
export type BleBacklogItem = z.infer<typeof bleBacklogItemSchema>;
export type BleBacklogAck = z.infer<typeof bleBacklogAckSchema>;
export type BleInternetStatus = z.infer<typeof bleInternetStatusSchema>;
export type BleNodeStatus = z.infer<typeof bleNodeStatusSchema>;
