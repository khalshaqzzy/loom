import type { BurstIngestRequest, BurstIngestResponse } from "@loom/contracts";
import { burstIngestResponseSchema } from "@loom/contracts";
import { getApiBaseUrl } from "../config/appConfig";

export const postBurstIngest = async (
  request: BurstIngestRequest
): Promise<BurstIngestResponse> => {
  const apiBaseUrl = await getApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}/api/ingest/burst`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request)
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(`Burst upload failed with HTTP ${response.status}`);
  }

  return burstIngestResponseSchema.parse(body);
};
