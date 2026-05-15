import { PermissionsAndroid, Platform } from 'react-native';
import { Buffer } from 'buffer';
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
import {
  bleBacklogItemSchema,
  bleMessageAckSchema,
  bleNodeIdentitySchema,
  bleNodeStatusSchema,
  bleValidationChallengeSchema,
  bleValidationResponseSchema,
  loomBleUuids
} from '@loom/contracts';
import type { BleClient, DiscoveredNode, Unsubscribe } from './client';
import { rssiToDistance } from './client';

type NativeDevice = {
  id: string;
  name?: string | null;
  rssi?: number | null;
  connect(): Promise<NativeDevice>;
  discoverAllServicesAndCharacteristics(): Promise<NativeDevice>;
  readCharacteristicForService(serviceUuid: string, characteristicUuid: string): Promise<{ value: string | null }>;
  writeCharacteristicWithResponseForService(serviceUuid: string, characteristicUuid: string, value: string): Promise<unknown>;
  monitorCharacteristicForService(
    serviceUuid: string,
    characteristicUuid: string,
    listener: (error: unknown, characteristic: { value: string | null } | null) => void
  ): { remove(): void };
  cancelConnection(): Promise<unknown>;
};

const encodeJson = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

const decodeJson = <T,>(value: string | null, parse: (input: unknown) => T): T => {
  if (!value) throw new Error('BLE payload kosong.');
  return parse(JSON.parse(Buffer.from(value, 'base64').toString('utf8')));
};

export class NativeBleClient implements BleClient {
  isMock = false;
  private manager: any;
  private device: NativeDevice | null = null;

  constructor(manager: any) {
    this.manager = manager;
  }

  async requestPermissions(): Promise<boolean> {
    if (Platform.OS !== 'android') return true;

    if ((Platform.Version as number) >= 31) {
      const result = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
        PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
      ]);

      return (
        result['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
        result['android.permission.BLUETOOTH_CONNECT'] === 'granted'
      );
    }

    const result = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
    return result === 'granted';
  }

  async scanForNodes(onNode: (node: DiscoveredNode) => void): Promise<Unsubscribe> {
    const permitted = await this.requestPermissions();
    if (!permitted) return () => {};

    this.manager.startDeviceScan([loomBleUuids.service], null, (error: unknown, device: NativeDevice | null) => {
      if (error || !device) return;
      const name = device.name || 'LOOM Node';
      onNode({
        deviceId: device.id,
        name,
        rssi: device.rssi ?? null,
        distance: rssiToDistance(device.rssi ?? null),
        rawDevice: device
      });
    });

    return () => this.manager.stopDeviceScan();
  }

  async connect(deviceId: string, rawDevice?: unknown): Promise<void> {
    const device = (rawDevice as NativeDevice | undefined) ?? (await this.manager.connectToDevice(deviceId));
    this.device = await (await device.connect()).discoverAllServicesAndCharacteristics();
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    await this.device.cancelConnection();
    this.device = null;
  }

  async readNodeIdentity(): Promise<BleNodeIdentity> {
    const value = await this.read(loomBleUuids.nodeIdentity);
    return decodeJson(value, bleNodeIdentitySchema.parse);
  }

  async readValidationChallenge(): Promise<BleValidationChallenge> {
    const value = await this.read(loomBleUuids.validation);
    return decodeJson(value, bleValidationChallengeSchema.parse);
  }

  async validateNode(nodeId: number, challenge: string): Promise<BleValidationResponse> {
    await this.write(loomBleUuids.validation, { nodeId, challenge });
    const value = await this.read(loomBleUuids.validation);
    return decodeJson(value, bleValidationResponseSchema.parse);
  }

  async writeMessage(payload: BleMobileMessage): Promise<BleMessageAck> {
    await this.write(loomBleUuids.messageWrite, payload);
    const value = await this.read(loomBleUuids.messageAck);
    return decodeJson(value, bleMessageAckSchema.parse);
  }

  subscribeBacklog(onItem: (item: BleBacklogItem) => void): Unsubscribe {
    if (!this.device) return () => {};
    const subscription = this.device.monitorCharacteristicForService(
      loomBleUuids.service,
      loomBleUuids.backlogStream,
      (_error, characteristic) => {
        if (!characteristic?.value) return;
        onItem(decodeJson(characteristic.value, bleBacklogItemSchema.parse));
      }
    );
    return () => subscription.remove();
  }

  async ackBacklog(ids: string[]): Promise<void> {
    await this.write(loomBleUuids.backlogAck, { backlogIds: ids, receipt: 'stored_on_mobile' });
  }

  async writeInternetStatus(payload: BleInternetStatus): Promise<void> {
    await this.write(loomBleUuids.internetStatus, payload);
  }

  subscribeNodeStatus(onStatus: (status: BleNodeStatus) => void): Unsubscribe {
    if (!this.device) return () => {};
    const subscription = this.device.monitorCharacteristicForService(
      loomBleUuids.service,
      loomBleUuids.nodeStatus,
      (_error, characteristic) => {
        if (!characteristic?.value) return;
        onStatus(decodeJson(characteristic.value, bleNodeStatusSchema.parse));
      }
    );
    return () => subscription.remove();
  }

  private async read(characteristicUuid: string): Promise<string | null> {
    if (!this.device) throw new Error('BLE device belum terhubung.');
    const result = await this.device.readCharacteristicForService(loomBleUuids.service, characteristicUuid);
    return result.value;
  }

  private async write(characteristicUuid: string, value: unknown): Promise<void> {
    if (!this.device) throw new Error('BLE device belum terhubung.');
    await this.device.writeCharacteristicWithResponseForService(
      loomBleUuids.service,
      characteristicUuid,
      encodeJson(value)
    );
  }
}
