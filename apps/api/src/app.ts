import "./http/requestTypes";
import type { AppConfig } from "./config/env";
import type { MongoContext } from "./db/client";
import type { AppContext } from "./http/appContext";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type ErrorRequestHandler } from "express";
import helmet from "helmet";
import pino from "pino";
import pinoHttp from "pino-http";
import { createAuditWriter } from "./modules/audit/auditService";
import { createAuthRouter } from "./modules/auth/authRoutes";
import { createHealthRouter } from "./modules/health/healthRoutes";
import { createIngestRouter } from "./modules/ingest/ingestRoutes";
import { createAdminMapRouter, createPublicMapRouter } from "./modules/map/mapRoutes";
import { createMessageRouter, createNodeMessagesRouter } from "./modules/messages/messageRoutes";
import { createNodeRouter } from "./modules/nodes/nodeRoutes";
import { createPublicLookupRouter } from "./modules/publicLookup/publicLookupRoutes";
import { createWebRouter } from "./modules/web/webRoutes";
import { HttpError } from "./http/errors";

export const createApp = (config: AppConfig, mongo: MongoContext): express.Express => {
  const logger = pino({ level: config.NODE_ENV === "test" ? "silent" : "info" });
  const context: AppContext = {
    config,
    mongo,
    logger,
    audit: createAuditWriter(mongo.collections)
  };
  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: config.CORS_ORIGIN,
      credentials: true
    })
  );
  app.use(express.json({ limit: "256kb" }));
  app.use(cookieParser());
  app.use(
    pinoHttp({
      logger,
      genReqId: (request) => String(request.headers["x-request-id"] ?? cryptoRandomId())
    })
  );

  app.use(createHealthRouter(context));
  app.use("/api/web", createWebRouter());
  app.use("/api/admin/auth", createAuthRouter(context));
  app.use("/api/admin/nodes", createNodeRouter(context));
  app.use("/api/admin/nodes/:nodeId/messages", createNodeMessagesRouter(context));
  app.use("/api/ingest", createIngestRouter(context));
  app.use("/api/map", createPublicMapRouter(context));
  app.use("/api/public/map", createPublicMapRouter(context));
  app.use("/api/admin/map", createAdminMapRouter(context));
  app.use("/api/admin/messages", createMessageRouter(context));
  app.use("/api/public", createPublicLookupRouter(context));
  app.use(errorHandler);

  return app;
};

const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof HttpError) {
    response.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }

  response.status(500).json({
    error: {
      code: "internal_error",
      message: "Unexpected server error."
    }
  });
};

const cryptoRandomId = (): string => Math.random().toString(36).slice(2);
