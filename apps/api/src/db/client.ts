import type { AppConfig } from "../config/env";
import type {
  AdminUserDocument,
  AuditLogDocument,
  MeshMessageDocument,
  MessageIngestBatchDocument,
  RegisteredNodeDocument,
  UserSessionDocument
} from "./documents";
import { Collection, Db, MongoClient } from "mongodb";

export interface MongoCollections {
  adminUsers: Collection<AdminUserDocument>;
  userSessions: Collection<UserSessionDocument>;
  registeredNodes: Collection<RegisteredNodeDocument>;
  meshMessages: Collection<MeshMessageDocument>;
  messageIngestBatches: Collection<MessageIngestBatchDocument>;
  auditLogs: Collection<AuditLogDocument>;
}

export interface MongoContext {
  client: MongoClient;
  db: Db;
  collections: MongoCollections;
}

export const getCollections = (db: Db): MongoCollections => ({
  adminUsers: db.collection<AdminUserDocument>("adminUsers"),
  userSessions: db.collection<UserSessionDocument>("userSessions"),
  registeredNodes: db.collection<RegisteredNodeDocument>("registeredNodes"),
  meshMessages: db.collection<MeshMessageDocument>("meshMessages"),
  messageIngestBatches: db.collection<MessageIngestBatchDocument>("messageIngestBatches"),
  auditLogs: db.collection<AuditLogDocument>("auditLogs")
});

export const connectMongo = async (config: AppConfig): Promise<MongoContext> => {
  const client = new MongoClient(config.MONGO_URI);
  await client.connect();
  const db = client.db(config.MONGO_DB_NAME);
  const collections = getCollections(db);
  await ensureIndexes(collections);
  return { client, db, collections };
};

export const ensureIndexes = async (collections: MongoCollections): Promise<void> => {
  await Promise.all([
    collections.adminUsers.createIndex({ username: 1 }, { unique: true }),
    collections.adminUsers.createIndex({ adminId: 1 }, { unique: true }),
    collections.userSessions.createIndex({ tokenHash: 1 }, { unique: true }),
    collections.userSessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    collections.registeredNodes.createIndex({ nodeIdNumeric: 1 }, { unique: true }),
    collections.registeredNodes.createIndex({ ownerNormalizedName: 1 }),
    collections.meshMessages.createIndex({ dedupKey: 1 }, { unique: true }),
    collections.meshMessages.createIndex({ senderNodeId: 1 }),
    collections.meshMessages.createIndex({ message: 1 }),
    collections.meshMessages.createIndex({ receivedByBackendAt: -1 }),
    collections.auditLogs.createIndex({ action: 1, createdAt: -1 })
  ]);
};

export const checkReadiness = async (context: MongoContext): Promise<{ mongo: boolean; indexes: boolean }> => {
  try {
    await context.db.command({ ping: 1 });
    const messageIndexes = await context.collections.meshMessages.indexExists("dedupKey_1");
    const nodeIndexes = await context.collections.registeredNodes.indexExists("nodeIdNumeric_1");
    return { mongo: true, indexes: messageIndexes && nodeIndexes };
  } catch {
    return { mongo: false, indexes: false };
  }
};
