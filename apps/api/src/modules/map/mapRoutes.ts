import { heatmapQuerySchema } from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { validateQuery } from "../../http/validation";
import { Router } from "express";
import { requireAdmin } from "../auth/authMiddleware";
import { aggregateHeatmapPoints } from "./heatmapService";

export const createPublicMapRouter = (context: AppContext): Router => {
  const router = Router();

  router.get(
    "/heatmap",
    validateQuery(heatmapQuerySchema),
    asyncHandler(async (request, response) => {
      const filter = buildMessageFilter(request.validatedQuery as HeatmapQuery);
      const messages = await context.mongo.collections.meshMessages
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(2_000)
        .toArray();
      response.json({ points: aggregateHeatmapPoints(messages) });
    })
  );

  router.get(
    "/markers",
    asyncHandler(async (_request, response) => {
      const nodes = await context.mongo.collections.registeredNodes.find({}).limit(2_000).toArray();
      response.json({
        markers: nodes.map((node) => ({
          nodeId: node.nodeId,
          nodeIdNumeric: node.nodeIdNumeric,
          lat: node.lastKnownLat,
          lon: node.lastKnownLon,
          status: node.status,
          lastSeenAt: node.lastSeenAt?.toISOString() ?? null,
          lastMessageAt: node.lastMessageAt?.toISOString() ?? null,
          lastRangeToGateway: node.lastRangeToGateway
        }))
      });
    })
  );

  return router;
};

export const createAdminMapRouter = (context: AppContext): Router => {
  const router = Router();
  router.use(requireAdmin(context));

  router.get(
    "/heatmap",
    validateQuery(heatmapQuerySchema),
    asyncHandler(async (request, response) => {
      const filter = buildMessageFilter(request.validatedQuery as HeatmapQuery);
      const messages = await context.mongo.collections.meshMessages
        .find(filter)
        .sort({ timestamp: -1 })
        .limit(2_000)
        .toArray();
      response.json({ points: aggregateHeatmapPoints(messages) });
    })
  );

  router.get(
    "/markers",
    asyncHandler(async (_request, response) => {
      const nodes = await context.mongo.collections.registeredNodes.find({}).limit(2_000).toArray();
      response.json({
        markers: nodes.map((node) => ({
          nodeId: node.nodeId,
          nodeIdNumeric: node.nodeIdNumeric,
          lat: node.lastKnownLat,
          lon: node.lastKnownLon,
          status: node.status,
          lastSeenAt: node.lastSeenAt?.toISOString() ?? null,
          lastMessageAt: node.lastMessageAt?.toISOString() ?? null,
          lastRangeToGateway: node.lastRangeToGateway,
          ownerFullName: node.ownerFullName
        }))
      });
    })
  );

  return router;
};

interface HeatmapQuery {
  message?: string;
  from?: string;
  to?: string;
}

export const buildMessageFilter = (query: HeatmapQuery): Record<string, unknown> => {
  const filter: Record<string, unknown> = {};
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

  return filter;
};
