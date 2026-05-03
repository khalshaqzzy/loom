import type { RegisteredNodeDocument } from "../../db/documents";
import type { RegisteredNodeResponse } from "@loom/contracts";

export const serializeNode = (node: RegisteredNodeDocument): RegisteredNodeResponse => ({
  nodeId: node.nodeId,
  nodeIdNumeric: node.nodeIdNumeric,
  ownerFullName: node.ownerFullName,
  lastKnownLat: node.lastKnownLat,
  lastKnownLon: node.lastKnownLon,
  lastSeenAt: node.lastSeenAt?.toISOString() ?? null,
  lastRangeToGateway: node.lastRangeToGateway,
  lastMessageAt: node.lastMessageAt?.toISOString() ?? null,
  status: node.status,
  createdAt: node.createdAt.toISOString(),
  updatedAt: node.updatedAt.toISOString()
});
