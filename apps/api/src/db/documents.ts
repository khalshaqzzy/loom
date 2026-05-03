import type { MessageSource, MessageValue, NodeStatus, UploaderType } from "@loom/contracts";
import type { ObjectId } from "mongodb";

export interface AdminUserDocument {
  _id: ObjectId;
  adminId: string;
  username: string;
  passwordHash: string;
  displayName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface UserSessionDocument {
  _id: ObjectId;
  sessionId: string;
  tokenHash: string;
  role: "admin";
  adminId: string;
  createdAt: Date;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface RegisteredNodeDocument {
  _id: ObjectId;
  nodeId: string;
  nodeIdNumeric: number;
  ownerFullName: string;
  ownerNormalizedName: string;
  ownerBirthDateHash: string;
  ownerBirthDateEncrypted: string | null;
  registeredByAdminId: string;
  lastKnownLat: number | null;
  lastKnownLon: number | null;
  lastSeenAt: Date | null;
  lastRangeToGateway: number | null;
  lastMessageAt: Date | null;
  status: NodeStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MeshMessageDocument {
  _id: ObjectId;
  messageId: string;
  dedupKey: string;
  senderNodeId: number;
  seqId: number;
  senderRangeToGateway: number;
  lastForwarderRangeToGateway: number;
  timestamp: Date;
  lat: number | null;
  lon: number | null;
  latE6: number | null;
  lonE6: number | null;
  message: MessageValue;
  receivedByNodeId: number | null;
  receivedByUploaderId: string | null;
  uploaderType: UploaderType;
  source: MessageSource;
  receivedByBackendAt: Date;
}

export interface MessageIngestBatchDocument {
  _id: ObjectId;
  batchId: string;
  uploaderType: UploaderType;
  uploaderId: string | null;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  createdAt: Date;
}

export interface AuditLogDocument {
  _id: ObjectId;
  action: string;
  actorAdminId: string | null;
  subject: string | null;
  outcome: "success" | "failure";
  metadata: Record<string, unknown>;
  createdAt: Date;
}
