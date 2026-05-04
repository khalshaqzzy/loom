import {
  adminLoginResponseSchema,
  adminLogoutResponseSchema,
  adminSessionResponseSchema,
  heatmapResponseSchema,
  markerResponseSchema,
  messageHistoryResponseSchema,
  nodeListResponseSchema,
  publicHistoryLookupResponseSchema,
  registeredNodeSchema,
  type AdminLoginRequest,
  type MessageValue,
  type RegisterNodeRequest
} from "@loom/contracts";
import { z, type ZodSchema } from "zod";

export const apiBaseUrl = () =>
  (process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000").replace(/\/$/, "");

const requestJson = async <T>(
  path: string,
  schema: ZodSchema<T>,
  init?: RequestInit
): Promise<T> => {
  const response = await fetch(`${apiBaseUrl()}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const json: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      typeof json === "object" &&
      json !== null &&
      "error" in json &&
      typeof json.error === "object" &&
      json.error !== null &&
      "message" in json.error
        ? String(json.error.message)
        : "Request failed.";
    throw new Error(message);
  }
  return schema.parse(json);
};

export const api = {
  session: () => requestJson("/api/admin/auth/session", adminSessionResponseSchema),
  login: (body: AdminLoginRequest) =>
    requestJson("/api/admin/auth/login", adminLoginResponseSchema, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  logout: () =>
    requestJson("/api/admin/auth/logout", adminLogoutResponseSchema, {
      method: "POST",
      body: "{}"
    }),
  publicHeatmap: (message?: MessageValue | "") => {
    const query = message ? `?message=${encodeURIComponent(message)}` : "";
    return requestJson(`/api/public/map/heatmap${query}`, heatmapResponseSchema);
  },
  publicMarkers: () => requestJson("/api/public/map/markers", markerResponseSchema),
  adminHeatmap: (message?: MessageValue | "") => {
    const query = message ? `?message=${encodeURIComponent(message)}` : "";
    return requestJson(`/api/admin/map/heatmap${query}`, heatmapResponseSchema);
  },
  adminMarkers: () => requestJson("/api/admin/map/markers", markerResponseSchema),
  publicLookup: (body: { ownerFullName: string; ownerBirthDate: string }) =>
    requestJson("/api/public/history/lookup", publicHistoryLookupResponseSchema, {
      method: "POST",
      body: JSON.stringify(body)
    }),
  nodes: (search = "") => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return requestJson(`/api/admin/nodes${query}`, nodeListResponseSchema);
  },
  registerNode: (body: RegisterNodeRequest) =>
    requestJson(
      "/api/admin/nodes",
      z.object({ node: registeredNodeSchema }),
      {
        method: "POST",
        body: JSON.stringify(body)
      }
    ),
  node: (nodeId: string) =>
    requestJson(`/api/admin/nodes/${encodeURIComponent(nodeId)}`, z.object({ node: registeredNodeSchema })),
  nodeMessages: (nodeId: string, message?: MessageValue | "") => {
    const query = message ? `?message=${encodeURIComponent(message)}` : "";
    return requestJson(`/api/admin/nodes/${encodeURIComponent(nodeId)}/messages${query}`, messageHistoryResponseSchema);
  },
  adminMessages: (params: URLSearchParams) =>
    requestJson(`/api/admin/messages?${params.toString()}`, messageHistoryResponseSchema)
};
