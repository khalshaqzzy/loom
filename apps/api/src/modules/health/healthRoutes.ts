import type { AppContext } from "../../http/appContext";
import { checkReadiness } from "../../db/client";
import { asyncHandler } from "../../http/asyncHandler";
import { Router } from "express";

export const createHealthRouter = (context: AppContext): Router => {
  const router = Router();

  router.get("/health", (_request, response) => {
    response.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  router.get(
    "/ready",
    asyncHandler(async (_request, response) => {
      const readiness = await checkReadiness(context.mongo);
      const ready = readiness.mongo && readiness.indexes;
      response.status(ready ? 200 : 503).json({
        status: ready ? "ready" : "not_ready",
        ...readiness,
        timestamp: new Date().toISOString()
      });
    })
  );

  return router;
};
