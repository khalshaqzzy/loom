import type {
  BleBacklogItem,
  BleInternetStatus,
  BleMessageAck,
  BleMobileMessage,
  BleNodeIdentity,
  BleNodeStatus,
  BleValidationChallenge,
  BleValidationResponse
} from '@loom/contracts';
import { loomBleProtocol } from '@loom/contracts';
import type { BleClient, DiscoveredNode, Unsubscribe } from './client';

const mockNodes: DiscoveredNode[] = [
  { deviceId: 'mock-node-2', name: 'LOOM-Node-2', nodeId: 2, rssi: -55, distance: 'dekat' },
  { deviceId: 'mock-node-7', name: 'LOOM-Node-7', nodeId: 7, rssi: -72, distance: 'sedang' },
  { deviceId: 'mock-node-12', name: 'LOOM-Node-12', nodeId: 12, rssi: -88, distance: 'jauh' }
];

export class MockBleClient implements BleClient {
  isMock = true;
  private connectedNode: DiscoveredNode | null = null;
  private validated = false;
  private challenge = 'MOCK-1234';
  private seqId = 1;

  async requestPermissions(): Promise<boolean> {
    return true;
  }

  async scanForNodes(onNode: (node: DiscoveredNode) => void): Promise<Unsubscribe> {
    const timers = mockNodes.map((node, index) =>
      setTimeout(() => onNode(node), 350 + index * 250)
    );

    return () => timers.forEach((timer) => clearTimeout(timer));
  }

  async connect(deviceId: string): Promise<void> {
    const node = mockNodes.find((candidate) => candidate.deviceId === deviceId);
    if (!node) throw new Error('Node tidak ditemukan.');
    this.connectedNode = node;
    this.validated = false;
    this.challenge = `MOCK-${node.nodeId ?? 0}-${Date.now().toString(36).slice(-4)}`;
  }

  async disconnect(): Promise<void> {
    this.connectedNode = null;
    this.validated = false;
  }

  async readNodeIdentity(): Promise<BleNodeIdentity> {
    if (!this.connectedNode?.nodeId) throw new Error('Node belum terhubung.');
    return {
      protocol: loomBleProtocol,
      nodeId: this.connectedNode.nodeId,
      firmwareVersion: 'mock-0.1.0',
      capabilities: ['lora_v2', 'backlog_stream', 'internet_status']
    };
  }

  async readValidationChallenge(): Promise<BleValidationChallenge> {
    return { challenge: this.challenge };
  }

  async validateNode(nodeId: number, challenge: string): Promise<BleValidationResponse> {
    const expected = this.connectedNode?.nodeId;
    this.validated = expected === nodeId && challenge === this.challenge;
    if (!this.validated) {
      return { validated: false, error: 'validation_failed' };
    }

    return { validated: true, nodeId };
  }

  async writeMessage(payload: BleMobileMessage): Promise<BleMessageAck> {
    if (!this.validated || !this.connectedNode?.nodeId) {
      return {
        clientMessageId: payload.clientMessageId,
        accepted: false,
        error: 'not_validated'
      };
    }

    const queued = payload.message !== 'fine' && this.seqId % 2 === 0;
    return {
      clientMessageId: payload.clientMessageId,
      accepted: true,
      senderNodeId: this.connectedNode.nodeId,
      seqId: this.seqId++,
      queued,
      rangeToGateway: queued ? 65535 : 1
    };
  }

  subscribeBacklog(onItem: (item: BleBacklogItem) => void): Unsubscribe {
    if (!this.validated || !this.connectedNode?.nodeId) return () => {};

    const timer = setTimeout(() => {
      onItem({
        backlogId: '42:1',
        senderNodeId: 42,
        seqId: 1,
        senderRangeToGateway: 2,
        lastForwarderRangeToGateway: 1,
        timestamp: new Date().toISOString(),
        lat: -6.2,
        lon: 106.816666,
        latE6: -6200000,
        lonE6: 106816666,
        message: 'medical_help',
        receivedByNodeId: this.connectedNode?.nodeId ?? 0,
        source: 'lora_mesh'
      });
    }, 1500);

    return () => clearTimeout(timer);
  }

  async ackBacklog(ids: string[]): Promise<void> {
    console.log('[BLE MOCK] backlog ack', ids);
  }

  async writeInternetStatus(payload: BleInternetStatus): Promise<void> {
    if (!this.validated) return;
    console.log('[BLE MOCK] internet status', payload.online);
  }

  subscribeNodeStatus(onStatus: (status: BleNodeStatus) => void): Unsubscribe {
    if (!this.connectedNode?.nodeId) return () => {};
    const status: BleNodeStatus = {
      nodeId: this.connectedNode.nodeId,
      validated: this.validated,
      rangeToGateway: this.validated ? 1 : 65535,
      neighborCount: 1,
      pendingCount: 0,
      backlogCount: 1,
      internetPathActive: false
    };
    const timer = setTimeout(() => onStatus(status), 250);
    return () => clearTimeout(timer);
  }
}
