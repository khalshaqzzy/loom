import { PUBLIC_LOOKUP_GENERIC_FAILURE, publicHistoryLookupRequestSchema } from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { validateBody } from "../../http/validation";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { hashBirthDate, normalizeOwnerName } from "../nodes/nodeIdentity";
import { serializeMessage } from "../messages/messageSerializers";

export const createPublicLookupRouter = (context: AppContext): Router => {
  const router = Router();
  const lookupLimiter = rateLimit({
    windowMs: 60_000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false
  });

  router.post(
    "/history/lookup",
    lookupLimiter,
    validateBody(publicHistoryLookupRequestSchema),
    asyncHandler(async (request, response) => {
      const ownerNormalizedName = normalizeOwnerName(request.body.ownerFullName);
      const ownerBirthDateHash = hashBirthDate(context.config, request.body.ownerBirthDate);
      const node = await context.mongo.collections.registeredNodes.findOne({
        ownerNormalizedName,
        ownerBirthDateHash
      });

      if (!node) {
        await context.audit.write({
          action: "public.lookup",
          outcome: "failure",
          metadata: { ownerNormalizedName }
        });
        response.status(404).json({ ok: false, message: PUBLIC_LOOKUP_GENERIC_FAILURE });
        return;
      }

      const messages = await context.mongo.collections.meshMessages
        .find({ senderNodeId: node.nodeIdNumeric })
        .sort({ timestamp: -1 })
        .limit(50)
        .toArray();

      await context.audit.write({
        action: "public.lookup",
        subject: node.nodeId,
        outcome: "success",
        metadata: { ownerNormalizedName }
      });
      response.json({ ok: true, messages: messages.map(serializeMessage), nextCursor: null });
    })
  );

  return router;
};
