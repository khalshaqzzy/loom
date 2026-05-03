import { messageHistoryQuerySchema, nodeIdNumericSchema } from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { HttpError } from "../../http/errors";
import { validateQuery } from "../../http/validation";
import { Router } from "express";
import { requireAdmin } from "../auth/authMiddleware";
import { normalizeOwnerName } from "../nodes/nodeIdentity";
import { serializeMessage } from "./messageSerializers";

export const createMessageRouter = (context: AppContext): Router => {
  const router = Router();
  router.use(requireAdmin(context));

  router.get(
    "/",
    validateQuery(messageHistoryQuerySchema),
    asyncHandler(async (request, response) => {
      const query = request.validatedQuery as MessageQuery;
      const filter = await buildMessageQuery(context, query);
      const messages = await context.mongo.collections.meshMessages
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(query.limit)
        .toArray();
      response.json({ messages: messages.map(serializeMessage), nextCursor: null });
    })
  );

  return router;
};

export const createNodeMessagesRouter = (context: AppContext): Router => {
  const router = Router({ mergeParams: true });
  router.use(requireAdmin(context));

  router.get(
    "/",
    validateQuery(messageHistoryQuerySchema.pick({ limit: true, cursor: true, message: true, from: true, to: true })),
    asyncHandler(async (request, response) => {
      const parsedNodeId = nodeIdNumericSchema.safeParse(Number(request.params.nodeId));
      if (!parsedNodeId.success) {
        throw new HttpError(400, "invalid_node_id", "Invalid node ID.");
      }

      const query = request.validatedQuery as MessageQuery;
      const filter = await buildMessageQuery(context, { ...query, nodeId: parsedNodeId.data });
      const messages = await context.mongo.collections.meshMessages
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(query.limit)
        .toArray();
      response.json({ messages: messages.map(serializeMessage), nextCursor: null });
    })
  );

  return router;
};

interface MessageQuery {
  nodeId?: number;
  ownerName?: string;
  message?: string;
  from?: string;
  to?: string;
  limit: number;
}

export const buildMessageQuery = async (
  context: AppContext,
  query: MessageQuery
): Promise<Record<string, unknown>> => {
  const filter: Record<string, unknown> = {};
  if (query.nodeId !== undefined) {
    filter.senderNodeId = query.nodeId;
  }
  if (query.message) {
    filter.message = query.message;
  }

  const timestamp: Record<string, Date> = {};
  if (query.from) {
    timestamp.$gte = new Date(query.from);
  }
  if (query.to) {
    timestamp.$lte = new Date(query.to);
  }
  if (Object.keys(timestamp).length > 0) {
    filter.timestamp = timestamp;
  }

  if (query.ownerName) {
    const ownerRegex = escapeRegex(normalizeOwnerName(query.ownerName));
    const nodes = await context.mongo.collections.registeredNodes
      .find({ ownerNormalizedName: { $regex: ownerRegex, $options: "i" } })
      .project<{ nodeIdNumeric: number }>({ nodeIdNumeric: 1 })
      .toArray();
    filter.senderNodeId = { $in: nodes.map((node) => node.nodeIdNumeric) };
  }

  return filter;
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
