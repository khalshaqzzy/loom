/**
 * useBleScanner.ts
 * Hook untuk scanning BLE node LOOM.
 *
 * Kalau BLE tidak tersedia (mock mode / iOS Simulator),
 * hook ini akan menampilkan dummy nodes agar UI tetap testable.
 */

import { useState, useCallback } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { getLoomBleManager } from './BleManager';

export type LoomNode = {
  id: string;
  name: string;
  rssi: number | null;
  distance: 'dekat' | 'sedang' | 'jauh';
  rawDevice?: any;
};

// Mock nodes untuk tampil di iOS Simulator / testing
const MOCK_NODES: LoomNode[] = [
  { id: 'mock-A12', name: 'LOOM-Node-A12', rssi: -55, distance: 'dekat' },
  { id: 'mock-B07', name: 'LOOM-Node-B07', rssi: -72, distance: 'sedang' },
  { id: 'mock-C03', name: 'LOOM-Node-C03', rssi: -88, distance: 'jauh' },
];

function rssiToDistance(rssi: number | null): 'dekat' | 'sedang' | 'jauh' {
  if (rssi === null) return 'jauh';
  if (rssi >= -65) return 'dekat';
  if (rssi >= -80) return 'sedang';
  return 'jauh';
}

function rssiToMeters(rssi: number | null): string {
  if (rssi === null) return '> 50 m';
  const meters = Math.round(Math.pow(10, (-59 - rssi) / 20));
  return `± ${meters} m`;
}

export function useBleScanner() {
  const [nodes, setNodes] = useState<LoomNode[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);

  const requestPermissions = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      if ((Platform.Version as number) >= 31) {
        const result = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
          PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
        ]);
        return (
          result['android.permission.BLUETOOTH_SCAN'] === 'granted' &&
          result['android.permission.BLUETOOTH_CONNECT'] === 'granted'
        );
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === 'granted';
      }
    }
    // iOS: permission dihandle otomatis saat BLE dipanggil
    return true;
  };

  const startScan = useCallback(async () => {
    const { isMockMode, manager } = getLoomBleManager();

    setScanComplete(false);
    setIsScanning(true);
    setNodes([]);

    if (isMockMode) {
      // Mock mode: simulasikan scanning dengan delay
      console.log('[BLE MOCK] Simulating node scan...');
      setTimeout(() => {
        setNodes(MOCK_NODES);
        setIsScanning(false);
        setScanComplete(true);
        console.log('[BLE MOCK] Found', MOCK_NODES.length, 'mock nodes');
      }, 2000);
      return;
    }

    // Native BLE mode
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses Bluetooth untuk mencari Node LOOM.');
      setIsScanning(false);
      return;
    }

    manager!.startDeviceScan(null, null, (error: any, device: any) => {
      if (error) {
        console.error('[BLE] Scan error:', error.message);
        setIsScanning(false);
        return;
      }

      // Hanya tampilkan device bernama LOOM
      if (device && device.name && device.name.startsWith('LOOM')) {
        setNodes(prev => {
          if (prev.find(d => d.id === device.id)) return prev;
          const node: LoomNode = {
            id: device.id,
            name: device.name || 'Unknown LOOM Node',
            rssi: device.rssi,
            distance: rssiToDistance(device.rssi),
            rawDevice: device,
          };
          return [...prev, node].sort((a, b) => (b.rssi || -999) - (a.rssi || -999));
        });
      }
    });

    // Stop scan setelah 10 detik
    setTimeout(() => {
      manager!.stopDeviceScan();
      setIsScanning(false);
      setScanComplete(true);
    }, 10000);
  }, []);

  const stopScan = useCallback(() => {
    const { isMockMode, manager } = getLoomBleManager();
    if (!isMockMode && manager) {
      manager.stopDeviceScan();
    }
    setIsScanning(false);
    setScanComplete(true);
  }, []);

  return { nodes, isScanning, scanComplete, startScan, stopScan, rssiToMeters };
}
