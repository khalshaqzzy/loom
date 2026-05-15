import * as Network from "expo-network";
import type { BleMobileMessage, BleMessageAck } from "@loom/contracts";
import { bleInternetStatusSchema, loomBleUuids } from "@loom/contracts";
import { getOrCreateMobileInstallationId } from "../config/appConfig";
import type { DiscoveredNode } from "./client";
import { getBleClient } from "./bleClientFactory";

export const LOOM_SERVICE_UUID = loomBleUuids.service;
export const LOOM_REPORT_CHAR_UUID = loomBleUuids.messageWrite;
export const LOOM_INTERNET_STATUS_CHAR_UUID = loomBleUuids.internetStatus;

export type LoomBleManagerType = {
  isReady: boolean;
  isMockMode: boolean;
  manager: unknown | null;
};

export const getLoomBleManager = (): LoomBleManagerType => {
  const client = getBleClient();
  return {
    isReady: !client.isMock,
    isMockMode: client.isMock,
    manager: client
  };
};

export const connectAndValidateNode = async (node: DiscoveredNode) => {
  const client = getBleClient();
  try {
    await client.connect(node.deviceId, node.rawDevice);
    const identity = await client.readNodeIdentity();
    const challenge = await client.readValidationChallenge();
    const validation = await client.validateNode(identity.nodeId, challenge.challenge);

    if (!validation.validated) {
      throw new Error("Validasi node gagal.");
    }

    return {
      ...node,
      nodeId: identity.nodeId,
      name: node.name || `LOOM-Node-${identity.nodeId}`,
      validated: true as const
    };
  } catch (error) {
    await client.disconnect().catch(() => undefined);
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("JSON") ||
      message.includes("BLE payload") ||
      message.includes("Payload BLE") ||
      message.includes("Log BLE") ||
      message.includes("Respons validasi")
    ) {
      throw new Error(
        `Validasi node gagal. Respons BLE node tidak valid atau belum siap.\n\n${message}`
      );
    }
    throw error;
  }
};

export const sendMobileMessageToNode = async (payload: BleMobileMessage): Promise<BleMessageAck> =>
  getBleClient().writeMessage(payload);

export const notifyNodeInternetStatus = async (): Promise<void> => {
  const networkState = await Network.getNetworkStateAsync();
  const mobileInstallationId = await getOrCreateMobileInstallationId();
  const payload = bleInternetStatusSchema.parse({
    online: Boolean(networkState.isConnected && networkState.isInternetReachable),
    observedAt: new Date().toISOString(),
    mobileInstallationId
  });

  await getBleClient().writeInternetStatus(payload);
};

export const disconnectNode = async (): Promise<void> => {
  await getBleClient().disconnect();
};
