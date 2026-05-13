import { useState } from 'react';
import { PermissionsAndroid, Platform, Alert } from 'react-native';
import { Device } from 'react-native-ble-plx';
import { bleManager } from './BleManager';

export function useBleScanner() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  // Fungsi untuk memunculkan pop-up izin Bluetooth & Lokasi
  const requestPermissions = async () => {
    if (Platform.OS === 'android') {
      // Untuk Android 12 ke atas
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
        // Untuk Android 11 ke bawah (butuh lokasi untuk scan BLE)
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        return result === 'granted';
      }
    }
    return true; // iOS biasanya menangani ini secara otomatis saat BLE dipanggil
  };

  const startScan = async () => {
    // 1. Minta izin dulu sebelum mulai mencari
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert('Izin Ditolak', 'Aplikasi membutuhkan akses Bluetooth untuk mencari Node LOOM.');
      return;
    }

    // 2. Jika diizinkan, mulai mencari
    setIsScanning(true);
    setDevices([]);
    
    // Scan perangkat tanpa filter service UUID dulu agar semua terlihat
    bleManager.startDeviceScan(null, null, (error, device) => {
      if (error) {
        console.error("Scan error:", error.message);
        setIsScanning(false);
        return;
      }
      
      // Filter: Hanya tampilkan perangkat yang punya nama
      if (device && device.name) {
        setDevices(prev => {
          // Cegah duplikasi perangkat di list
          if (!prev.find(d => d.id === device.id)) {
            return [...prev, device]; 
          }
          return prev;
        });
      }
    });

    // Hentikan scan otomatis setelah 10 detik agar hemat baterai
    setTimeout(() => {
      bleManager.stopDeviceScan();
      setIsScanning(false);
    }, 10000);
  };

  return { devices, isScanning, startScan };
}