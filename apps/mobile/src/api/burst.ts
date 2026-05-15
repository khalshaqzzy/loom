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

const API_BASE = 'https://api.loomnetwork.site';

export async function burstBacklogToBackend(
  backlogItems: BurstMessage[],
  uploaderNodeId: number,
  installationId: string
): Promise<{ success: boolean; data?: any; reason?: string }> {
  const networkState = await Network.getNetworkStateAsync();
  if (!networkState.isConnected || !networkState.isInternetReachable) {
    return { success: false, reason: 'offline' };
  }

  try {
    const response = await fetch(`${API_BASE}/api/ingest/burst`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uploaderType: 'mobile_app',
        uploaderNodeId,
        mobileInstallationId: installationId,
        clientCreatedAt: new Date().toISOString(),
        messages: backlogItems,
      }),
    });

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('[API] Burst upload failed:', error);
    return { success: false, reason: 'api_error' };
  }
}
