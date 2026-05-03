import { nodeIdNumericSchema, nodeListQuerySchema, registerNodeRequestSchema } from "@loom/contracts";
import type { AppContext } from "../../http/appContext";
import { asyncHandler } from "../../http/asyncHandler";
import { HttpError, isDuplicateKeyError } from "../../http/errors";
import { validateBody, validateQuery } from "../../http/validation";
import { Router } from "express";
import { ObjectId } from "mongodb";
import { requireAdmin } from "../auth/authMiddleware";
import { hashBirthDate, normalizeOwnerName, toNodeIdString } from "./nodeIdentity";
import { serializeNode } from "./nodeSerializers";

export const createNodeRouter = (context: AppContext): Router => {
  const router = Router();
  router.use(requireAdmin(context));

  router.post(
    "/",
    validateBody(registerNodeRequestSchema),
    asyncHandler(async (request, response) => {
      const now = new Date();
      const body = request.body;
      try {
        await context.mongo.collections.registeredNodes.insertOne({
          _id: new ObjectId(),
          nodeId: toNodeIdString(body.nodeId),
          nodeIdNumeric: body.nodeId,
          ownerFullName: body.ownerFullName.trim(),
          ownerNormalizedName: normalizeOwnerName(body.ownerFullName),
          ownerBirthDateHash: hashBirthDate(context.config, body.ownerBirthDate),
          ownerBirthDateEncrypted: null,
          registeredByAdminId: request.admin?.adminId ?? "unknown",
          lastKnownLat: null,
          lastKnownLon: null,
          lastSeenAt: null,
          lastRangeToGateway: null,
          lastMessageAt: null,
          status: "registered",
          createdAt: now,
          updatedAt: now
        });
      } catch (error) {
        if (isDuplicateKeyError(error)) {
          await context.audit.write({
            action: "node.register",
            actorAdminId: request.admin?.adminId,
            subject: toNodeIdString(body.nodeId),
            outcome: "failure",
            metadata: { reason: "duplicate_node_id" }
          });
          throw new HttpError(409, "duplicate_node_id", "Node ID is already registered.");
        }
        throw error;
      }

      const node = await context.mongo.collections.registeredNodes.findOne({
        nodeIdNumeric: body.nodeId
      });
      if (!node) {
        throw new HttpError(500, "node_registration_failed", "Node registration failed.");
      }

      await context.audit.write({
        action: "node.register",
        actorAdminId: request.admin?.adminId,
        subject: node.nodeId,
        outcome: "success"
      });
      response.status(201).json({ node: serializeNode(node) });
    })
  );

  router.get(
    "/",
    validateQuery(nodeListQuerySchema),
    asyncHandler(async (request, response) => {
      const query = request.validatedQuery as { search?: string; limit: number };
      const filter = buildNodeSearchFilter(query.search);
      const nodes = await context.mongo.collections.registeredNodes
        .find(filter)
        .sort({ createdAt: -1 })
        .limit(query.limit)
        .toArray();
      response.json({ nodes: nodes.map(serializeNode) });
    })
  );

  router.get(
    "/:nodeId",
    asyncHandler(async (request, response) => {
      const parsedNodeId = nodeIdNumericSchema.safeParse(Number(request.params.nodeId));
      if (!parsedNodeId.success) {
        throw new HttpError(400, "invalid_node_id", "Invalid node ID.");
      }

      const node = await context.mongo.collections.registeredNodes.findOne({
        nodeIdNumeric: parsedNodeId.data
      });
      if (!node) {
        throw new HttpError(404, "node_not_found", "Node not found.");
      }

      response.json({ node: serializeNode(node) });
    })
  );

  return router;
};

const buildNodeSearchFilter = (search: string | undefined): Record<string, unknown> => {
  if (!search) {
    return {};
  }

  const numeric = Number(search);
  if (Number.isInteger(numeric)) {
    return { nodeIdNumeric: numeric };
  }

  return {
    ownerNormalizedName: {
      $regex: escapeRegex(normalizeOwnerName(search)),
      $options: "i"
    }
  };
};

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
