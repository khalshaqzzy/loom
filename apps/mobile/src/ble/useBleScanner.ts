import { useCallback, useState } from 'react';
import { Alert } from 'react-native';
import type { DiscoveredNode } from './client';
import { rssiToMeters } from './client';
import { getBleClient } from './bleClientFactory';

export type LoomNode = DiscoveredNode;

export const useBleScanner = () => {
  const [nodes, setNodes] = useState<LoomNode[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [stopCurrentScan, setStopCurrentScan] = useState<(() => void) | null>(null);

  const startScan = useCallback(async () => {
    const client = getBleClient();
    const permitted = await client.requestPermissions();
    if (!permitted) {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan Bluetooth untuk mencari Node LOOM.');
      return;
    }

    stopCurrentScan?.();
    setNodes([]);
    setScanComplete(false);
    setIsScanning(true);

    const unsubscribe = await client.scanForNodes((node) => {
      setNodes((previous) => {
        if (previous.some((candidate) => candidate.deviceId === node.deviceId)) return previous;
        return [...previous, node].sort((a, b) => (b.rssi ?? -999) - (a.rssi ?? -999));
      });
    });

    setStopCurrentScan(() => unsubscribe);
    setTimeout(() => {
      unsubscribe();
      setIsScanning(false);
      setScanComplete(true);
    }, 10000);
  }, [stopCurrentScan]);

  const stopScan = useCallback(() => {
    stopCurrentScan?.();
    setStopCurrentScan(null);
    setIsScanning(false);
    setScanComplete(true);
  }, [stopCurrentScan]);

  return {
    nodes,
    isScanning,
    scanComplete,
    startScan,
    stopScan,
    rssiToMeters
  };
};
