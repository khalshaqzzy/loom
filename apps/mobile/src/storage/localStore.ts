/**
 * localStore.ts
 * Penyimpanan lokal untuk backlog BLE dan riwayat laporan.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { BurstMessage } from '../api/burst';

const BACKLOG_KEY = '@loom_backlog';
const REPORTS_KEY = '@loom_reports';
const NODE_KEY = '@loom_selected_node';
const DEVICE_ID_KEY = '@loom_device_id';

export type ReportStatus = 'diterima_node' | 'terkirim' | 'gagal';
export type ReportType = 'aman' | 'butuh_bantuan' | 'darurat_kritis';

export type LocalReport = {
  id: string;
  type: ReportType;
  message: string;
  timestamp: number;
  status: ReportStatus;
  nodeId: string;
  sentVia: string;
  location?: { lat: number; lon: number } | null;
};

// ===== BACKLOG (pesan dari ESP32 yang belum ter-burst ke backend) =====

export async function saveToBacklog(message: BurstMessage): Promise<void> {
  const existing = await getBacklog();
  existing.push(message);
  await AsyncStorage.setItem(BACKLOG_KEY, JSON.stringify(existing));
}

export async function getBacklog(): Promise<BurstMessage[]> {
  const data = await AsyncStorage.getItem(BACKLOG_KEY);
  return data ? JSON.parse(data) : [];
}

export async function clearBacklog(): Promise<void> {
  await AsyncStorage.removeItem(BACKLOG_KEY);
}

// ===== RIWAYAT LAPORAN =====

export async function saveReport(report: LocalReport): Promise<void> {
  const existing = await getReports();
  existing.unshift(report); // terbaru di atas
  // Simpan max 50 laporan lokal
  const trimmed = existing.slice(0, 50);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(trimmed));
}

export async function getReports(): Promise<LocalReport[]> {
  const data = await AsyncStorage.getItem(REPORTS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function updateReportStatus(id: string, status: ReportStatus): Promise<void> {
  const reports = await getReports();
  const updated = reports.map(r => r.id === id ? { ...r, status } : r);
  await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(updated));
}

export async function retryReport(id: string): Promise<LocalReport | null> {
  const reports = await getReports();
  return reports.find(r => r.id === id) || null;
}

// ===== NODE TERSIMPAN =====

export async function saveSelectedNode(nodeId: string, nodeName: string): Promise<void> {
  await AsyncStorage.setItem(NODE_KEY, JSON.stringify({ nodeId, nodeName }));
}

export async function getSelectedNode(): Promise<{ nodeId: string; nodeName: string } | null> {
  const data = await AsyncStorage.getItem(NODE_KEY);
  return data ? JSON.parse(data) : null;
}

// ===== DEVICE ID =====

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  // Generate unique device ID
  const id = 'mob_' + Math.random().toString(36).substring(2, 9).toUpperCase();
  await AsyncStorage.setItem(DEVICE_ID_KEY, id);
  return id;
}
