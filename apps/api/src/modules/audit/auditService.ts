import type { MongoCollections } from "../../db/client";
import { ObjectId } from "mongodb";

export interface AuditWriter {
  write(input: {
    action: string;
    actorAdminId?: string | null | undefined;
    subject?: string | null | undefined;
    outcome: "success" | "failure";
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export const createAuditWriter = (collections: MongoCollections): AuditWriter => ({
  async write(input) {
    await collections.auditLogs.insertOne({
      _id: new ObjectId(),
      action: input.action,
      actorAdminId: input.actorAdminId ?? null,
      subject: input.subject ?? null,
      outcome: input.outcome,
      metadata: input.metadata ?? {},
      createdAt: new Date()
    });
  }
});
