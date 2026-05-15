/**
 * location.ts
 * Utilitas untuk mendapatkan lokasi GPS pengguna.
 */

import * as ExpoLocation from 'expo-location';

export type LocationData = {
  lat: number;
  lon: number;
  accuracy: number | null;
  timestamp: number;
};

export async function getCurrentLocation(): Promise<LocationData | null> {
  try {
    const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      console.warn('[Location] Permission denied');
      return null;
    }

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced,
    });

    return {
      lat: location.coords.latitude,
      lon: location.coords.longitude,
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp,
    };
  } catch (err) {
    console.error('[Location] Failed to get location:', err);
    return null;
  }
}

export function formatCoords(lat: number, lon: number): string {
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}
