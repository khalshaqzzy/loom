import type {
  BleBacklogItem,
  BleInternetStatus,
  BleMessageAck,
  BleMobileMessage,
  BleNodeIdentity,
  BleNodeStatus,
  BleValidationChallenge,
  BleValidationResponse
} from "@loom/contracts";

export type DiscoveredNode = {
  deviceId: string;
  name: string;
  rssi: number | null;
  distance: "dekat" | "sedang" | "jauh";
  nodeId?: number;
  rawDevice?: unknown;
};

export type Unsubscribe = () => void;

export type BleClient = {
  isMock: boolean;
  requestPermissions(): Promise<boolean>;
  scanForNodes(onNode: (node: DiscoveredNode) => void): Promise<Unsubscribe>;
  connect(deviceId: string, rawDevice?: unknown): Promise<void>;
  disconnect(): Promise<void>;
  readNodeIdentity(): Promise<BleNodeIdentity>;
  readValidationChallenge(): Promise<BleValidationChallenge>;
  validateNode(nodeId: number, challenge: string): Promise<BleValidationResponse>;
  writeMessage(payload: BleMobileMessage): Promise<BleMessageAck>;
  subscribeBacklog(onItem: (item: BleBacklogItem) => void): Unsubscribe;
  ackBacklog(ids: string[]): Promise<void>;
  writeInternetStatus(payload: BleInternetStatus): Promise<void>;
  subscribeNodeStatus(onStatus: (status: BleNodeStatus) => void): Unsubscribe;
};

export const rssiToDistance = (rssi: number | null): "dekat" | "sedang" | "jauh" => {
  if (rssi === null) return "jauh";
  if (rssi >= -65) return "dekat";
  if (rssi >= -80) return "sedang";
  return "jauh";
};

export const rssiToMeters = (rssi: number | null): string => {
  if (rssi === null) return "> 50 m";
  const meters = Math.round(Math.pow(10, (-59 - rssi) / 20));
  return `~ ${meters} m`;
};
