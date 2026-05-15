import { MockBleClient } from './mockClient';
import { NativeBleClient } from './nativeClient';
import type { BleClient } from './client';

let client: BleClient | null = null;

export const getBleClient = (): BleClient => {
  if (client) return client;

  try {
    const { BleManager } = require('react-native-ble-plx');
    client = new NativeBleClient(new BleManager());
    return client;
  } catch (error) {
    console.warn('[BLE] Native BLE unavailable, using mock client.', error);
    client = new MockBleClient();
    return client;
  }
};
