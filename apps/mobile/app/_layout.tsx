import { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as Network from 'expo-network';
import { getBacklog, clearBacklog } from '../src/storage/localStore';
import { burstBacklogToBackend } from '../src/api/burst';

export default function Layout() {
  useEffect(() => {
    // Mengecek status jaringan secara berkala atau menggunakan library NetInfo
    const checkNetworkAndBurst = async () => {
      const net = await Network.getNetworkStateAsync();
      if (net.isInternetReachable) {
        const backlog = await getBacklog();
        if (backlog.length > 0) {
          console.log("Internet detected! Bursting", backlog.length, "messages...");
          // Gunakan ID instalasi yang unik dan ID Node yang sedang terkoneksi
          const result = await burstBacklogToBackend(backlog, 123456, 'mob_abc');
          if (result.success) {
            await clearBacklog();
            // TODO: Beritahu ESP32 bahwa internet menyala via notifyNodeInternetStatus()
          }
        }
      }
    };

    const interval = setInterval(checkNetworkAndBurst, 15000); // Cek tiap 15 detik
    return () => clearInterval(interval);
  }, []);

  return <Stack />;
}