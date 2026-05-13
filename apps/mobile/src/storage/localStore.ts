import AsyncStorage from '@react-native-async-storage/async-storage';
import { BurstMessage } from '../api/burst';

const BACKLOG_KEY = '@loom_backlog';
const HISTORY_KEY = '@loom_sent_history';

// Menyimpan pesan yang diterima dari ESP32 untuk di-burst nanti
export async function saveToBacklog(message: BurstMessage) {
  const existing = await getBacklog();
  existing.push(message);
  await AsyncStorage.setItem(BACKLOG_KEY, JSON.stringify(existing));
}

export async function getBacklog(): Promise<BurstMessage[]> {
  const data = await AsyncStorage.getItem(BACKLOG_KEY);
  return data ? JSON.parse(data) : [];
}

export async function clearBacklog() {
  await AsyncStorage.removeItem(BACKLOG_KEY);
}