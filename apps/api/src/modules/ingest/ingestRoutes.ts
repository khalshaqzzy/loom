import {
  burstIngestMessageSchema,
  ingestAcceptedItemSchema,
  MAX_INGEST_BATCH_SIZE,
  uploaderTypeSchema
} from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { HttpError, isDuplicateKeyError } from "../../http/errors";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { z } from "zod";
import { createDedupKey } from "./dedup";

const burstEnvelopeSchema = z.object({
  uploaderType: uploaderTypeSchema,
  mobileInstallationId: z.string().trim().min(1).max(120).optional(),
  uploaderNodeId: z.number().int().optional(),
  uploadedAt: z.string().datetime({ offset: true }).optional(),
  messages: z.array(z.unknown()).min(1).max(MAX_INGEST_BATCH_SIZE)
});

export const createIngestRouter = (context: AppContext): Router => {
  const router = Router();

  router.post(
    "/burst",
    asyncHandler(async (request, response) => {
      const parsedEnvelope = burstEnvelopeSchema.safeParse(request.body);
      if (!parsedEnvelope.success) {
        throw new HttpError(
          400,
          "invalid_ingest_batch",
          parsedEnvelope.error.issues[0]?.message ?? "Invalid ingest batch."
        );
      }

      const envelope = parsedEnvelope.data;
      const batchObjectId = new ObjectId();
      const batchId = batchObjectId.toHexString();
      const accepted: z.infer<typeof ingestAcceptedItemSchema>[] = [];
      const duplicate: z.infer<typeof ingestAcceptedItemSchema>[] = [];
      const rejected: { senderNodeId?: number; seqId?: number; index: number; reason: string }[] =
        [];
      const uploaderId =
        envelope.mobileInstallationId ?? envelope.uploaderNodeId?.toString() ?? null;

      for (const [index, rawMessage] of envelope.messages.entries()) {
        const parsedMessage = burstIngestMessageSchema.safeParse(rawMessage);
        if (!parsedMessage.success) {
          rejected.push({
            index,
            reason: parsedMessage.error.issues[0]?.message ?? "Invalid message."
          });
          continue;
        }

        const message = parsedMessage.data;
        const registeredNode = await context.mongo.collections.registeredNodes.findOne({
          nodeIdNumeric: message.senderNodeId
        });
        if (!registeredNode) {
          rejected.push({
            index,
            senderNodeId: message.senderNodeId,
            seqId: message.seqId,
            reason: "sender_node_not_registered"
          });
          continue;
        }

        const dedupKey = createDedupKey(message.senderNodeId, message.seqId);
        const receivedByBackendAt = new Date();
        try {
          await context.mongo.collections.meshMessages.insertOne({
            _id: new ObjectId(),
            messageId: new ObjectId().toHexString(),
            dedupKey,
            senderNodeId: message.senderNodeId,
            seqId: message.seqId,
            senderRangeToGateway: message.senderRangeToGateway,
            lastForwarderRangeToGateway: message.lastForwarderRangeToGateway,
            timestamp: new Date(message.timestamp),
            lat: message.lat ?? null,
            lon: message.lon ?? null,
            latE6: message.latE6 ?? null,
            lonE6: message.lonE6 ?? null,
            message: message.message,
            receivedByNodeId: message.receivedByNodeId ?? null,
            receivedByUploaderId: uploaderId,
            uploaderType: envelope.uploaderType,
            source: message.source,
            receivedByBackendAt
          });
          accepted.push({ senderNodeId: message.senderNodeId, seqId: message.seqId, dedupKey });
          await updateNodeLatestMetadata(context, message, receivedByBackendAt);
        } catch (error) {
          if (isDuplicateKeyError(error)) {
            duplicate.push({ senderNodeId: message.senderNodeId, seqId: message.seqId, dedupKey });
            continue;
          }
          throw error;
        }
      }

      await context.mongo.collections.messageIngestBatches.insertOne({
        _id: batchObjectId,
        batchId,
        uploaderType: envelope.uploaderType,
        uploaderId,
        acceptedCount: accepted.length,
        duplicateCount: duplicate.length,
        rejectedCount: rejected.length,
        createdAt: new Date()
      });

      await context.audit.write({
        action: "ingest.burst",
        outcome: rejected.length > 0 ? "failure" : "success",
        subject: batchId,
        metadata: {
          accepted: accepted.length,
          duplicate: duplicate.length,
          rejected: rejected.length,
          uploaderType: envelope.uploaderType
        }
      });

      response.status(202).json({ batchId, accepted, duplicate, rejected });
    })
  );

  return router;
};

type ParsedIngestMessage = z.infer<typeof burstIngestMessageSchema>;

const updateNodeLatestMetadata = async (
  context: AppContext,
  message: ParsedIngestMessage,
  receivedByBackendAt: Date
): Promise<void> => {
  await context.mongo.collections.registeredNodes.updateOne(
    { nodeIdNumeric: message.senderNodeId },
    {
      $set: {
        lastKnownLat: message.lat ?? null,
        lastKnownLon: message.lon ?? null,
        lastSeenAt: receivedByBackendAt,
        lastRangeToGateway: message.senderRangeToGateway,
        lastMessageAt: new Date(message.timestamp),
        status: "active",
        updatedAt: receivedByBackendAt
      }
    }
  );
};
