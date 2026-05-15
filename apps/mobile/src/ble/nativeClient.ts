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
  connect(options?: unknown): Promise<NativeDevice>;
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
const BLE_LEGACY_STATUS_SETTLE_MS = 750;

const encodeJson = (value: unknown): string => Buffer.from(JSON.stringify(value), 'utf8').toString('base64');

const normalizeBase64 = (value: string): string | null => {
  const compact = value.replace(/\s/g, '').replace(/-/g, '+').replace(/_/g, '/');
  if (!compact || compact.length < 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(compact)) return null;

  const withoutPadding = compact.replace(/=+$/, '');
  const remainder = withoutPadding.length % 4;
  if (remainder === 1) return null;

  return withoutPadding.padEnd(withoutPadding.length + (4 - remainder) % 4, '=');
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
  const normalizedBase64 = normalizeBase64(value);

  if (normalizedBase64) {
    try {
      candidates.unshift(Buffer.from(normalizedBase64, 'base64').toString('utf8'));
    } catch {
      // Keep the raw candidate below; diagnostics will show why parsing failed.
    }
  }

  return [...new Set(candidates.map(sanitizeJsonText).filter(Boolean))];
};

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const stringifyForLog = (value: unknown): string => {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const truncateForLog = (value: string, maxLength = 500): string =>
  value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;

const hexPreview = (value: string, maxBytes = 80): string => {
  const normalizedBase64 = normalizeBase64(value);
  const bytes = normalizedBase64
    ? Buffer.from(normalizedBase64, 'base64')
    : Buffer.from(value, 'utf8');

  return bytes.subarray(0, maxBytes).toString('hex').replace(/(.{2})/g, '$1 ').trim();
};

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
    await this.manager.cancelDeviceConnection?.(deviceId).catch(() => undefined);
    await wait(300);
    const device = (rawDevice as NativeDevice | undefined) ?? (await this.manager.connectToDevice(deviceId));
    const connected = await device.connect({
      refreshGatt: Platform.OS === 'android' ? 'OnConnected' : undefined,
      requestMTU: Platform.OS === 'android' ? 256 : undefined,
      timeout: 10000
    });
    this.device = await connected.discoverAllServicesAndCharacteristics();
  }

  async disconnect(): Promise<void> {
    if (!this.device) return;
    await this.device.cancelConnection();
    this.device = null;
  }

  async readNodeIdentity(): Promise<BleNodeIdentity> {
    const value = await this.read(loomBleUuids.nodeIdentity);
    const debugLog = [`identity:read uuid=${loomBleUuids.nodeIdentity}`];
    const payload = this.parseJsonValue(value, 'identity:read', debugLog);
    return this.parseSchema(payload, bleNodeIdentitySchema.parse, 'identity:read', debugLog);
  }

  async readValidationChallenge(): Promise<BleValidationChallenge> {
    const value = await this.read(loomBleUuids.validation);
    const debugLog = [`validation:challenge-read uuid=${loomBleUuids.validation}`];
    const payload = this.parseJsonValue(value, 'validation:challenge-read', debugLog);
    return this.parseSchema(payload, bleValidationChallengeSchema.parse, 'validation:challenge-read', debugLog);
  }

  async validateNode(nodeId: number, challenge: string): Promise<BleValidationResponse> {
    const debugLog = [`validate:start nodeId=${nodeId} challenge=${challenge}`];
    return this.validateNodeAttempt(nodeId, challenge, debugLog, 1);
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

  private parseJsonValue(value: string | null, source: string, debugLog: string[]): unknown {
    if (!value) {
      debugLog.push(`${source}: empty payload`);
      throw new Error(this.formatBleDiagnostic('BLE payload kosong.', debugLog));
    }

    const rawPreview = truncateForLog(value);
    const candidates = decodeBlePayload(value);
    const errors: string[] = [];

    debugLog.push(`${source}: raw=${rawPreview}`);
    debugLog.push(`${source}: hex=${hexPreview(value)}`);

    for (const [index, candidate] of candidates.entries()) {
      try {
        const parsed = JSON.parse(candidate);
        debugLog.push(`${source}: candidate${index}=${truncateForLog(candidate)}`);
        return parsed;
      } catch (error) {
        errors.push(`candidate${index}:${error instanceof Error ? error.message : String(error)}`);
      }
    }

    debugLog.push(`${source}: parseErrors=${errors.join(' | ')}`);
    throw new Error(this.formatBleDiagnostic('Payload BLE bukan JSON valid.', debugLog));
  }

  private parseSchema<T>(
    payload: unknown,
    parse: (input: unknown) => T,
    context: string,
    debugLog: string[]
  ): T {
    try {
      return parse(payload);
    } catch (error) {
      debugLog.push(`${context}: schemaError=${error instanceof Error ? error.message : String(error)}`);
      debugLog.push(`${context}: payload=${truncateForLog(stringifyForLog(payload))}`);
      throw new Error(this.formatBleDiagnostic('Payload BLE tidak sesuai schema yang diharapkan.', debugLog));
    }
  }

  private formatBleDiagnostic(summary: string, debugLog: string[]): string {
    return `${summary}\n\nLog BLE:\n${debugLog.slice(-12).join('\n')}`;
  }

  private async readNodeStatusForValidation(nodeId: number, debugLog: string[]): Promise<BleValidationResponse | null> {
    await wait(BLE_LEGACY_STATUS_SETTLE_MS);

    try {
      const value = await this.read(loomBleUuids.nodeStatus);
      const payload = this.parseJsonValue(value, 'validation:status-read', debugLog);
      const status = this.parseSchema(payload, bleNodeStatusSchema.parse, 'validation:status-read', debugLog);
      if (status.nodeId === nodeId && status.validated) {
        debugLog.push('validation:status-read confirms validated=true');
        return { validated: true, nodeId };
      }

      debugLog.push(
        `validation:status-read not validated nodeId=${status.nodeId} validated=${status.validated}`
      );
      return null;
    } catch (error) {
      debugLog.push(`validation:status-read failed=${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  private async validateNodeAttempt(
    nodeId: number,
    challenge: string,
    debugLog: string[],
    attempt: 1 | 2
  ): Promise<BleValidationResponse> {
    debugLog.push(`validation:attempt=${attempt}`);
    const payload = await this.writeAndWaitForJsonValue(
      loomBleUuids.validation,
      { nodeId, challenge },
      debugLog,
      `validation:attempt-${attempt}`
    );

    try {
      const response = bleValidationResponseSchema.parse(payload);
      debugLog.push(`validation:response validated=${response.validated}`);
      return response;
    } catch (responseError) {
      debugLog.push(
        `validation:response schemaError=${responseError instanceof Error ? responseError.message : String(responseError)}`
      );
    }

    const fallbackChallenge = bleValidationChallengeSchema.safeParse(payload);
    if (fallbackChallenge.success) {
      debugLog.push(`validation:received challenge instead of response challenge=${fallbackChallenge.data.challenge}`);

      const statusResponse = await this.readNodeStatusForValidation(nodeId, debugLog);
      if (statusResponse) return statusResponse;

      if (attempt === 1) {
        return this.validateNodeAttempt(nodeId, fallbackChallenge.data.challenge, debugLog, 2);
      }
    }

    debugLog.push(`validation:unexpected payload=${truncateForLog(stringifyForLog(payload))}`);
    throw new Error(this.formatBleDiagnostic('Respons validasi node tidak dapat dipakai.', debugLog));
  }

  private async writeAndWaitForJsonValue(
    notificationCharacteristicUuid: string,
    value: unknown,
    debugLog: string[],
    operation: string,
    writeCharacteristicUuid = notificationCharacteristicUuid
  ): Promise<unknown> {
    if (!this.device) throw new Error('BLE device belum terhubung.');

    let settled = false;
    let writeStarted = false;
    let lastDecodeError: Error | null = null;

    return new Promise<unknown>((resolve, reject) => {
      const timeout = setTimeout(async () => {
        if (settled) return;
        settled = true;
        subscription.remove();

        try {
          debugLog.push(`${operation}:timeout fallback read`);
          const fallbackValue = await this.read(notificationCharacteristicUuid);
          resolve(this.parseJsonValue(fallbackValue, `${operation}:fallback-read`, debugLog));
        } catch (error) {
          reject(
            lastDecodeError ??
              (error instanceof Error ? error : new Error(this.formatBleDiagnostic('Respons BLE tidak diterima dari node.', debugLog)))
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
            reject(error instanceof Error ? error : new Error(this.formatBleDiagnostic('Gagal menerima notifikasi BLE.', debugLog)));
            return;
          }

          if (!characteristic?.value) return;

          if (!writeStarted) {
            debugLog.push(`${operation}:notify before write ignored`);
            return;
          }

          try {
            const parsed = this.parseJsonValue(characteristic.value, `${operation}:notify`, debugLog);
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
        .then(async () => {
          if (settled) return;
          writeStarted = true;
          debugLog.push(`${operation}:write ${truncateForLog(stringifyForLog(value))}`);
          await this.write(writeCharacteristicUuid, value);
          debugLog.push(`${operation}:write complete`);
        })
        .catch(error => {
          if (settled) return;
          settled = true;
          clearTimeout(timeout);
          subscription.remove();
          reject(error instanceof Error ? error : new Error(this.formatBleDiagnostic('Gagal menulis payload BLE.', debugLog)));
        });
    });
  }

  private async writeAndWaitForJsonNotification<T>(
    notificationCharacteristicUuid: string,
    value: unknown,
    parse: (input: unknown) => T,
    writeCharacteristicUuid = notificationCharacteristicUuid
  ): Promise<T> {
    if (!this.device) throw new Error('BLE device belum terhubung.');
    const debugLog = [`response:start characteristic=${notificationCharacteristicUuid}`];
    const payload = await this.writeAndWaitForJsonValue(
      notificationCharacteristicUuid,
      value,
      debugLog,
      'response',
      writeCharacteristicUuid
    );
    return this.parseSchema(payload, parse, 'response', debugLog);
  }
}
