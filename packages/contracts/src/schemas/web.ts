import { z } from "zod";

export const webRouteManifestResponseSchema = z.object({
  landing: z.object({
    home: z.literal("/"),
    publicMap: z.literal("/public"),
    publicHistory: z.literal("/public/history"),
    adminLogin: z.literal("/admin/login")
  }),
  public: z.object({
    map: z.literal("/public"),
    history: z.literal("/public/history")
  }),
  admin: z.object({
    dashboard: z.literal("/admin"),
    map: z.literal("/admin/map"),
    nodes: z.literal("/admin/nodes"),
    messages: z.literal("/admin/messages"),
    settings: z.literal("/admin/settings")
  }),
  api: z.object({
    publicHeatmap: z.literal("/api/public/map/heatmap"),
    publicMarkers: z.literal("/api/public/map/markers"),
    publicHistoryLookup: z.literal("/api/public/history/lookup"),
    adminMarkers: z.literal("/api/admin/map/markers"),
    adminMessages: z.literal("/api/admin/messages"),
    adminNodes: z.literal("/api/admin/nodes")
  })
});

export type WebRouteManifestResponse = z.infer<typeof webRouteManifestResponseSchema>;
