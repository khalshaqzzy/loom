import type { BleBacklogItem, BurstIngestMessage } from '@loom/contracts';
import { bleBacklogItemSchema } from '@loom/contracts';
import { getDatabase } from './database';

export type BacklogSyncStatus = 'pending' | 'syncing' | 'synced' | 'rejected' | 'failed';

export type LocalBacklogItem = BurstIngestMessage & {
  backlogId: string;
  syncStatus: BacklogSyncStatus;
  syncAttempts: number;
  lastSyncError: string | null;
};

type BacklogRow = {
  backlog_id: string;
  sender_node_id: number;
  seq_id: number;
  sender_range_to_gateway: number;
  last_forwarder_range_to_gateway: number;
  timestamp: string;
  message: BurstIngestMessage['message'];
  received_by_node_id: number | null;
  source: BurstIngestMessage['source'];
  lat: number | null;
  lon: number | null;
  lat_e6: number | null;
  lon_e6: number | null;
  sync_status: BacklogSyncStatus;
  sync_attempts: number;
  last_sync_error: string | null;
};

const toBacklogItem = (row: BacklogRow): LocalBacklogItem => ({
  backlogId: row.backlog_id,
  senderNodeId: row.sender_node_id,
  seqId: row.seq_id,
  senderRangeToGateway: row.sender_range_to_gateway,
  lastForwarderRangeToGateway: row.last_forwarder_range_to_gateway,
  timestamp: row.timestamp,
  lat: row.lat,
  lon: row.lon,
  latE6: row.lat_e6,
  lonE6: row.lon_e6,
  message: row.message,
  receivedByNodeId: row.received_by_node_id,
  source: row.source,
  syncStatus: row.sync_status,
  syncAttempts: row.sync_attempts,
  lastSyncError: row.last_sync_error
});

const normalizeLocation = (item: BleBacklogItem): BleBacklogItem => {
  if ((item.latE6 ?? 0) === 0 && (item.lonE6 ?? 0) === 0) {
    return {
      ...item,
      lat: null,
      lon: null,
      latE6: null,
      lonE6: null
    };
  }

  return item;
};

export const upsertBacklogItem = async (input: BleBacklogItem): Promise<LocalBacklogItem> => {
  const item = normalizeLocation(bleBacklogItemSchema.parse(input));
  const now = new Date().toISOString();
  const db = await getDatabase();

  await db.runAsync(
    `INSERT INTO backlog_items (
      backlog_id, sender_node_id, seq_id, sender_range_to_gateway,
      last_forwarder_range_to_gateway, timestamp, message, received_by_node_id,
      source, lat, lon, lat_e6, lon_e6, sync_status, sync_attempts,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(backlog_id) DO UPDATE SET
      sender_range_to_gateway = excluded.sender_range_to_gateway,
      last_forwarder_range_to_gateway = excluded.last_forwarder_range_to_gateway,
      timestamp = excluded.timestamp,
      message = excluded.message,
      received_by_node_id = excluded.received_by_node_id,
      source = excluded.source,
      lat = excluded.lat,
      lon = excluded.lon,
      lat_e6 = excluded.lat_e6,
      lon_e6 = excluded.lon_e6,
      updated_at = excluded.updated_at`,
    item.backlogId,
    item.senderNodeId,
    item.seqId,
    item.senderRangeToGateway,
    item.lastForwarderRangeToGateway,
    item.timestamp,
    item.message,
    item.receivedByNodeId ?? null,
    item.source,
    item.lat ?? null,
    item.lon ?? null,
    item.latE6 ?? null,
    item.lonE6 ?? null,
    'pending',
    0,
    now,
    now
  );

  return {
    ...item,
    syncStatus: 'pending',
    syncAttempts: 0,
    lastSyncError: null
  };
};

export const listBacklogItems = async (
  statuses: BacklogSyncStatus[] = ['pending', 'failed', 'rejected']
): Promise<LocalBacklogItem[]> => {
  const db = await getDatabase();
  const placeholders = statuses.map(() => '?').join(',');
  const rows = await db.getAllAsync<BacklogRow>(
    `SELECT * FROM backlog_items WHERE sync_status IN (${placeholders}) ORDER BY updated_at ASC`,
    statuses
  );
  return rows.map(toBacklogItem);
};

export const countBacklogItems = async (): Promise<number> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ count: number }>(
    `SELECT COUNT(*) AS count FROM backlog_items WHERE sync_status IN ('pending', 'failed', 'rejected')`
  );
  return rows[0]?.count ?? 0;
};

export const markBacklogSyncing = async (ids: string[]): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE backlog_items SET sync_status = 'syncing', updated_at = ? WHERE backlog_id IN (${placeholders})`,
    [new Date().toISOString(), ...ids]
  );
};

export const markBacklogSynced = async (senderNodeId: number, seqId: number): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE backlog_items
     SET sync_status = 'synced', last_sync_error = NULL, updated_at = ?
     WHERE sender_node_id = ? AND seq_id = ?`,
    new Date().toISOString(),
    senderNodeId,
    seqId
  );
};

export const markBacklogRejected = async (
  indexKey: { senderNodeId?: number; seqId?: number; backlogId?: string },
  reason: string
): Promise<void> => {
  const db = await getDatabase();
  if (indexKey.backlogId) {
    await db.runAsync(
      `UPDATE backlog_items SET sync_status = 'rejected', last_sync_error = ?, updated_at = ? WHERE backlog_id = ?`,
      reason,
      new Date().toISOString(),
      indexKey.backlogId
    );
    return;
  }

  await db.runAsync(
    `UPDATE backlog_items
     SET sync_status = 'rejected', last_sync_error = ?, updated_at = ?
     WHERE sender_node_id = ? AND seq_id = ?`,
    reason,
    new Date().toISOString(),
    indexKey.senderNodeId ?? -1,
    indexKey.seqId ?? -1
  );
};

export const markBacklogFailed = async (ids: string[], reason: string): Promise<void> => {
  if (ids.length === 0) return;
  const db = await getDatabase();
  const placeholders = ids.map(() => '?').join(',');
  await db.runAsync(
    `UPDATE backlog_items
     SET sync_status = 'failed',
         sync_attempts = sync_attempts + 1,
         last_sync_error = ?,
         updated_at = ?
     WHERE backlog_id IN (${placeholders})`,
    [reason, new Date().toISOString(), ...ids]
  );
};

export const clearBacklogItems = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM backlog_items');
};
