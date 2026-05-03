import type { MeshMessageDocument } from "../../db/documents";
import type { MeshMessageResponse } from "@loom/contracts";

export const serializeMessage = (message: MeshMessageDocument): MeshMessageResponse => ({
  messageId: message.messageId,
  dedupKey: message.dedupKey,
  senderNodeId: message.senderNodeId,
  seqId: message.seqId,
  senderRangeToGateway: message.senderRangeToGateway,
  lastForwarderRangeToGateway: message.lastForwarderRangeToGateway,
  timestamp: message.timestamp.toISOString(),
  lat: message.lat,
  lon: message.lon,
  message: message.message,
  receivedByNodeId: message.receivedByNodeId,
  receivedByUploaderId: message.receivedByUploaderId,
  source: message.source,
  receivedByBackendAt: message.receivedByBackendAt.toISOString()
});
