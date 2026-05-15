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

const BLE_RESPONSE_TIMEOUT_MS = 5000;
const BLE_NOTIFY_SUBSCRIBE_SETTLE_MS = 250;

const encodeJson = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

const isLikelyBase64 = (value: string): boolean => {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(trimmed);
};

const sanitizeJsonText = (value: string): string => {
  const withoutBomOrNulls = value.replace(/^\uFEFF/, '').replace(/\0/g, '').trim();
  const firstObject = withoutBomOrNulls.indexOf('{');
  const lastObject = withoutBomOrNulls.lastIndexOf('}');
  const firstArray = withoutBomOrNulls.indexOf('[');
  const lastArray = withoutBomOrNulls.lastIndexOf(']');

  if (firstObject !== -1 && lastObject > firstObject) {
    return withoutBomOrNulls.slice(firstObject, lastObject + 1);
  }

  if (firstArray !== -1 && lastArray > firstArray) {
    return withoutBomOrNulls.slice(firstArray, lastArray + 1);
  }

  return withoutBomOrNulls;
};

const decodeBlePayload = (value: string): string[] => {
  const candidates = [value];

  if (isLikelyBase64(value)) {
    candidates.unshift(Buffer.from(value, 'base64').toString('utf8'));
  }

  return [...new Set(candidates.map(sanitizeJsonText).filter(Boolean))];
};

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const decodeJson = <T,>(value: string | null, parse: (input: unknown) => T): T => {
  if (!value) throw new Error('BLE payload kosong.');

  const errors: string[] = [];
  for (const candidate of decodeBlePayload(value)) {
    try {
      return parse(JSON.parse(candidate));
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  throw new Error(`Payload BLE bukan JSON valid. ${errors[0] ?? 'Format tidak dikenali.'}`);
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
    return this.writeAndWaitForJsonNotification(
      loomBleUuids.validation,
      { nodeId, challenge },
      bleValidationResponseSchema.parse
    );
  }

  async writeMessage(payload: BleMobileMessage): Promise<BleMessageAck> {
    return this.writeAndWaitForJsonNotification(
      loomBleUuids.messageAck,
      payload,
      bleMessageAckSchema.parse,
      loomBleUuids.messageWrite
    );
  }

  subscribeBacklog(onItem: (item: BleBacklogItem) => void): Unsubscribe {
    if (!this.device) return () => {};
    const subscription = this.device.monitorCharacteristicForService(
      loomBleUuids.service,
      loomBleUuids.backlogStream,
      (_error, characteristic) => {
        if (!characteristic?.value) return;
        try {
          onItem(decodeJson(characteristic.value, bleBacklogItemSchema.parse));
        } catch (error) {
          console.warn('[BLE] Backlog payload ignored.', error);
        }
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
        try {
          onStatus(decodeJson(characteristic.value, bleNodeStatusSchema.parse));
        } catch (error) {
          console.warn('[BLE] Node status payload ignored.', error);
        }
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

  private async writeAndWaitForJsonNotification<T>(
    notificationCharacteristicUuid: string,
    value: unknown,
    parse: (input: unknown) => T,
    writeCharacteristicUuid = notificationCharacteristicUuid
  ): Promise<T> {
    if (!this.device) throw new Error('BLE device belum terhubung.');

    let settled = false;
    let lastDecodeError: Error | null = null;

    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        if (settled) return;
        settled = true;
        subscription.remove();

        try {
          const fallbackValue = await this.read(notificationCharacteristicUuid);
          resolve(decodeJson(fallbackValue, parse));
        } catch (error) {
          reject(
            lastDecodeError ??
              (error instanceof Error ? error : new Error('Respons BLE tidak diterima dari node.'))
          );
        }
      }, BLE_RESPONSE_TIMEOUT_MS);

      const subscription = this.device!.monitorCharacteristicForService(
        loomBleUuids.service,
        notificationCharacteristicUuid,
        (error, characteristic) => {
          if (settled) return;

          if (error) {
            settled = true;
            clearTimeout(timeout);
            subscription.remove();
            reject(error instanceof Error ? error : new Error('Gagal menerima notifikasi BLE.'));
            return;
          }

          if (!characteristic?.value) return;

          try {
            const parsed = decodeJson(characteristic.value, parse);
            settled = true;
            clearTimeout(timeout);
            subscription.remove();
            resolve(parsed);
          } catch (decodeError) {
            lastDecodeError = decodeError instanceof Error ? decodeError : new Error(String(decodeError));
          }
        }
      );

      wait(BLE_NOTIFY_SUBSCRIBE_SETTLE_MS)
        .then(() => this.write(writeCharacteristicUuid, value))
        .catch(error => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          subscription.remove();
          reject(error instanceof Error ? error : new Error('Gagal menulis payload BLE.'));
        });
    });
  }
}
