import AsyncStorage from "@react-native-async-storage/async-storage";

const INSTALLATION_ID_KEY = "@loom_mobile_installation_id";
const API_BASE_URL_KEY = "@loom_api_base_url";

export const DEFAULT_API_BASE_URL = "https://api.loomnetwork.site";

export const getApiBaseUrl = async (): Promise<string> => {
  const saved = await AsyncStorage.getItem(API_BASE_URL_KEY);
  return saved || DEFAULT_API_BASE_URL;
};

export const setApiBaseUrl = async (url: string): Promise<void> => {
  const normalized = url.trim().replace(/\/+$/, "");
  if (!normalized) {
    await AsyncStorage.removeItem(API_BASE_URL_KEY);
    return;
  }

  await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
};

export const getOrCreateMobileInstallationId = async (): Promise<string> => {
  const existing = await AsyncStorage.getItem(INSTALLATION_ID_KEY);
  if (existing) return existing;

  const randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
  const id = `mob_${Date.now().toString(36)}_${randomPart}`;
  await AsyncStorage.setItem(INSTALLATION_ID_KEY, id);
  return id;
};
