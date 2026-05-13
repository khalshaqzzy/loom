import * as Network from 'expo-network';

export interface BurstMessage {
  senderNodeId: number;
  seqId: number;
  senderRangeToGateway: number;
  lastForwarderRangeToGateway: number;
  timestamp: number;
  latE6: number;
  lonE6: number;
  message: string;
  receivedByNodeId?: number;
}

export async function burstBacklogToBackend(
  backlogItems: BurstMessage[], 
  uploaderNodeId: number, 
  installationId: string
) {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return { success: false, reason: 'offline' };
  }

  try {
    const response = await fetch('https://api.loomnetwork.site/api/ingest/burst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploaderType: 'mobile_app',
        uploaderNodeId: uploaderNodeId,
        mobileInstallationId: installationId,
        clientCreatedAt: new Date().toISOString(),
        messages: backlogItems
      })
    });

    const result = await response.json();
    // Kembalikan result untuk meng-update status lokal (accepted, duplicates, rejected)
    // Item yang accepted/duplicate bisa dihapus dari local backlog.
    return { success: true, data: result };
  } catch (error) {
    console.error("Burst upload failed:", error);
    return { success: false, reason: 'api_error' };
  }
}