/**
 * BleManager.ts
 * iOS-safe BLE wrapper untuk LOOM.
 *
 * Di iOS, BLE butuh native build (expo run:ios) dan device fisik.
 * Kalau BLE gagal init (misal di Simulator), otomatis masuk MOCK MODE
 * supaya UI tetap bisa di-test tanpa crash.
 */

import { Platform } from 'react-native';
import * as Network from 'expo-network';
import { Buffer } from 'buffer';

// UUID sesuai firmware ESP32 LOOM
export const LOOM_SERVICE_UUID = 'YOUR_SERVICE_UUID';
export const LOOM_REPORT_CHAR_UUID = 'YOUR_REPORT_CHAR_UUID';
export const LOOM_INTERNET_STATUS_CHAR_UUID = 'YOUR_INTERNET_STATUS_CHAR_UUID';

export type LoomBleManagerType = {
  isReady: boolean;
  isMockMode: boolean;
  manager: any | null;
};

let _instance: LoomBleManagerType | null = null;

export function getLoomBleManager(): LoomBleManagerType {
  if (_instance) return _instance;

  try {
    // Coba import BleManager dari react-native-ble-plx
    // Ini akan gagal di iOS Simulator tapi berhasil di device fisik
    const { BleManager } = require('react-native-ble-plx');
    const manager = new BleManager();
    _instance = { isReady: true, isMockMode: false, manager };
    console.log('[BLE] BleManager initialized (native mode)');
  } catch (err) {
    // Fallback ke mock mode — aman untuk testing di Simulator
    console.warn('[BLE] Gagal init BleManager, masuk MOCK MODE:', err);
    _instance = { isReady: false, isMockMode: true, manager: null };
  }

  return _instance;
}

/**
 * Memberitahu ESP32 Node status internet HP via BLE.
 * No-op kalau di mock mode.
 */
export async function notifyNodeInternetStatus(device: any) {
  const { isMockMode } = getLoomBleManager();
  if (isMockMode || !device) {
    console.log('[BLE MOCK] notifyNodeInternetStatus called (skipped)');
    return;
  }

  try {
    const networkState = await Network.getNetworkStateAsync();
    const hasInternet = networkState.isInternetReachable ? 1 : 0;
    const payloadBuffer = Buffer.from([hasInternet]).toString('base64');

    await device.writeCharacteristicWithResponseForService(
      LOOM_SERVICE_UUID,
      LOOM_INTERNET_STATUS_CHAR_UUID,
      payloadBuffer
    );
    console.log('[BLE] Internet status sent to node:', hasInternet);
  } catch (err) {
    console.error('[BLE] Failed to notify internet status:', err);
  }
}

/**
 * Mengirim payload laporan darurat ke ESP32 Node via BLE.
 * No-op kalau di mock mode.
 */
export async function sendReportToNode(device: any, payload: string): Promise<boolean> {
  const { isMockMode } = getLoomBleManager();
  if (isMockMode || !device) {
    console.log('[BLE MOCK] sendReportToNode called, simulating success');
    return true; // Mock: always "success"
  }

  try {
    const encoded = Buffer.from(payload).toString('base64');
    await device.writeCharacteristicWithResponseForService(
      LOOM_SERVICE_UUID,
      LOOM_REPORT_CHAR_UUID,
      encoded
    );
    return true;
  } catch (err) {
    console.error('[BLE] Failed to send report:', err);
    return false;
  }
}
