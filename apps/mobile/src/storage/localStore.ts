import AsyncStorage from '@react-native-async-storage/async-storage';
import type { BleBacklogItem, MessageValue } from '@loom/contracts';
import {
  clearBacklogItems,
  countBacklogItems,
  listBacklogItems,
  upsertBacklogItem
} from './backlogItems';
import {
  clearSentMessages,
  listSentMessages,
  type LocalSentMessage,
  type SentMessageStatus
} from './sentMessages';
import { getOrCreateMobileInstallationId } from '../config/appConfig';

const LEGACY_NODE_KEY = '@loom_selected_node';

export type ReportStatus = SentMessageStatus;
export type ReportType = 'safe' | 'emergency';

export type LocalReport = {
  id: string;
  type: ReportType;
  message: MessageValue;
  rawText?: string | null;
  timestamp: number;
  status: ReportStatus;
  nodeId: string;
  sentVia: string;
  location?: { lat: number; lon: number } | null;
};

export const saveToBacklog = async (message: BleBacklogItem): Promise<void> => {
  await upsertBacklogItem(message);
};

export const getBacklog = async () => listBacklogItems();

export const getBacklogCount = async (): Promise<number> => countBacklogItems();

export const clearBacklog = async (): Promise<void> => {
  await clearBacklogItems();
};

export const saveReport = async (): Promise<void> => {
  // Sent messages are created through sentMessages.saveSentDraft so firmware ack can update them.
};

export const getReports = async (): Promise<LocalReport[]> => {
  const messages = await listSentMessages();
  return messages.map(toLocalReport);
};

export const updateReportStatus = async (): Promise<void> => {
  // Retained for old call sites; new status transitions happen from BLE ack/sync services.
};

export const retryReport = async (id: string): Promise<LocalReport | null> => {
  const reports = await getReports();
  return reports.find((report) => report.id === id) ?? null;
};

export const saveSelectedNode = async (nodeId: string, nodeName: string): Promise<void> => {
  await AsyncStorage.setItem(LEGACY_NODE_KEY, JSON.stringify({ nodeId, nodeName }));
};

export const getSelectedNode = async (): Promise<{ nodeId: string; nodeName: string } | null> => {
  const data = await AsyncStorage.getItem(LEGACY_NODE_KEY);
  return data ? JSON.parse(data) : null;
};

export const getOrCreateDeviceId = getOrCreateMobileInstallationId;

export const clearAllLocalData = async (): Promise<void> => {
  await clearBacklogItems();
  await clearSentMessages();
};

const toLocalReport = (message: LocalSentMessage): LocalReport => ({
  id: message.clientMessageId,
  type: message.kind,
  message: message.message,
  rawText: message.rawText,
  timestamp: new Date(message.createdAt).getTime(),
  status: message.status,
  nodeId: String(message.connectedNodeId),
  sentVia: `LOOM-Node-${message.connectedNodeId}`,
  location:
    message.lat !== null && message.lon !== null
      ? {
          lat: message.lat,
          lon: message.lon
        }
      : null
});
