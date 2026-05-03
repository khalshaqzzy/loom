import type { WebRouteManifestResponse } from "@loom/contracts";
import { Router } from "express";

const webRouteManifest: WebRouteManifestResponse = {
  landing: {
    home: "/",
    publicMap: "/public",
    publicHistory: "/public/history",
    adminLogin: "/admin/login"
  },
  public: {
    map: "/public",
    history: "/public/history"
  },
  admin: {
    dashboard: "/admin",
    map: "/admin/map",
    nodes: "/admin/nodes",
    messages: "/admin/messages",
    settings: "/admin/settings"
  },
  api: {
    publicHeatmap: "/api/public/map/heatmap",
    publicMarkers: "/api/public/map/markers",
    publicHistoryLookup: "/api/public/history/lookup",
    adminMarkers: "/api/admin/map/markers",
    adminMessages: "/api/admin/messages",
    adminNodes: "/api/admin/nodes"
  }
};

export const createWebRouter = (): Router => {
  const router = Router();

  router.get("/routes", (_request, response) => {
    response.json(webRouteManifest);
  });

  return router;
};
