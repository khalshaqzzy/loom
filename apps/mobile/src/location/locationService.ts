import * as ExpoLocation from 'expo-location';

export type MobileLocation = {
  lat: number;
  lon: number;
  latE6: number;
  lonE6: number;
  accuracy: number | null;
  timestamp: number;
};

export const toE6 = (value: number): number => Math.round(value * 1_000_000);

export const getCurrentMobileLocation = async (): Promise<MobileLocation | null> => {
  try {
    const permission = await ExpoLocation.requestForegroundPermissionsAsync();
    if (permission.status !== 'granted') return null;

    const location = await ExpoLocation.getCurrentPositionAsync({
      accuracy: ExpoLocation.Accuracy.Balanced
    });

    const lat = location.coords.latitude;
    const lon = location.coords.longitude;
    return {
      lat,
      lon,
      latE6: toE6(lat),
      lonE6: toE6(lon),
      accuracy: location.coords.accuracy,
      timestamp: location.timestamp
    };
  } catch (error) {
    console.warn('[Location] Unable to read location', error);
    return null;
  }
};

export const formatCoords = (lat: number, lon: number): string =>
  `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
