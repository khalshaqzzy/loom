// src/ble/BleManager.ts
import { BleManager, Device } from 'react-native-ble-plx';
import * as Network from 'expo-network';
import { Buffer } from 'buffer';

export const bleManager = new BleManager();

// Fungsi untuk memberitahu ESP32 status internet HP
export async function notifyNodeInternetStatus(device: Device) {
    const networkState = await Network.getNetworkStateAsync();
    const hasInternet = networkState.isInternetReachable ? 1 : 0;
    
    // Konversi status ke base64 (tergantung protokol byte Anda)
    const payloadBuffer = Buffer.from([hasInternet]).toString('base64');
    
    // TODO: Ganti SERVICE_UUID dan CHARACTERISTIC_UUID sesuai firmware ESP32 Anda
    await device.writeCharacteristicWithResponseForService(
        'YOUR_SERVICE_UUID',
        'YOUR_INTERNET_STATUS_CHAR_UUID',
        payloadBuffer
    );
}