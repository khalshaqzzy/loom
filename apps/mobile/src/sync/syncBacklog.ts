import * as Network from "expo-network";
import type { BurstIngestMessage, BurstIngestRequest } from "@loom/contracts";
import {
  burstIngestRequestSchema,
  MAX_INGEST_BATCH_SIZE,
  normalizeMeshCoordinates
} from "@loom/contracts";
import { getOrCreateMobileInstallationId } from "../config/appConfig";
import {
  listBacklogItems,
  markBacklogFailed,
  markBacklogRejected,
  markBacklogSyncing,
  markBacklogSynced,
  type LocalBacklogItem
} from "../storage/backlogItems";
import { postBurstIngest } from "./burstClient";

export type SyncResult = {
  attempted: number;
  accepted: number;
  duplicate: number;
  rejected: number;
  skippedReason?: "offline" | "empty";
};

const toBurstMessage = (item: LocalBacklogItem): BurstIngestMessage => {
  const coordinates = normalizeMeshCoordinates(item);
  return {
    senderNodeId: item.senderNodeId,
    seqId: item.seqId,
    senderRangeToGateway: item.senderRangeToGateway,
    lastForwarderRangeToGateway: item.lastForwarderRangeToGateway,
    timestamp: item.timestamp,
    lat: coordinates.lat,
    lon: coordinates.lon,
    latE6: coordinates.latE6,
    lonE6: coordinates.lonE6,
    message: item.message,
    receivedByNodeId: item.receivedByNodeId ?? null,
    source: item.source
  };
};

export const syncPendingBacklog = async (): Promise<SyncResult> => {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return { attempted: 0, accepted: 0, duplicate: 0, rejected: 0, skippedReason: "offline" };
  }

  const items = (await listBacklogItems(["pending", "failed"])).slice(0, MAX_INGEST_BATCH_SIZE);
  if (items.length === 0) {
    return { attempted: 0, accepted: 0, duplicate: 0, rejected: 0, skippedReason: "empty" };
  }

  const ids = items.map((item) => item.backlogId);
  await markBacklogSyncing(ids);

  try {
    const mobileInstallationId = await getOrCreateMobileInstallationId();
    const request: BurstIngestRequest = burstIngestRequestSchema.parse({
      uploaderType: "mobile_app",
      mobileInstallationId,
      uploadedAt: new Date().toISOString(),
      messages: items.map(toBurstMessage)
    });

    const response = await postBurstIngest(request);
    for (const item of response.accepted) {
      await markBacklogSynced(item.senderNodeId, item.seqId);
    }
    for (const item of response.duplicate) {
      await markBacklogSynced(item.senderNodeId, item.seqId);
    }
    for (const item of response.rejected) {
      const source = items[item.index];
      const rejectedKey: { senderNodeId?: number; seqId?: number; backlogId?: string } = {};
      if (item.senderNodeId !== undefined) rejectedKey.senderNodeId = item.senderNodeId;
      if (item.seqId !== undefined) rejectedKey.seqId = item.seqId;
      if (source?.backlogId) rejectedKey.backlogId = source.backlogId;
      await markBacklogRejected(rejectedKey, item.reason);
    }

    return {
      attempted: items.length,
      accepted: response.accepted.length,
      duplicate: response.duplicate.length,
      rejected: response.rejected.length
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "burst_sync_failed";
    await markBacklogFailed(ids, reason);
    return { attempted: items.length, accepted: 0, duplicate: 0, rejected: 0 };
  }
};
