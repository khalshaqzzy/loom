import type { BleMessageAck, BleMobileMessage, MessageValue } from "@loom/contracts";
import { getDatabase } from "./database";

export type SentMessageStatus = "draft" | "sent_to_node" | "queued" | "synced" | "failed";
export type SentMessageKind = "safe" | "emergency";

export type LocalSentMessage = {
  clientMessageId: string;
  connectedNodeId: number;
  senderNodeId: number | null;
  seqId: number | null;
  message: MessageValue;
  rawText: string | null;
  kind: SentMessageKind;
  status: SentMessageStatus;
  createdAt: string;
  sentToNodeAt: string | null;
  syncedAt: string | null;
  failureReason: string | null;
  lat: number | null;
  lon: number | null;
  latE6: number | null;
  lonE6: number | null;
};

type SentMessageRow = {
  client_message_id: string;
  connected_node_id: number;
  sender_node_id: number | null;
  seq_id: number | null;
  message: MessageValue;
  raw_text: string | null;
  kind: SentMessageKind;
  status: SentMessageStatus;
  created_at: string;
  sent_to_node_at: string | null;
  synced_at: string | null;
  failure_reason: string | null;
  lat: number | null;
  lon: number | null;
  lat_e6: number | null;
  lon_e6: number | null;
};

const toSentMessage = (row: SentMessageRow): LocalSentMessage => ({
  clientMessageId: row.client_message_id,
  connectedNodeId: row.connected_node_id,
  senderNodeId: row.sender_node_id,
  seqId: row.seq_id,
  message: row.message,
  rawText: row.raw_text,
  kind: row.kind,
  status: row.status,
  createdAt: row.created_at,
  sentToNodeAt: row.sent_to_node_at,
  syncedAt: row.synced_at,
  failureReason: row.failure_reason,
  lat: row.lat,
  lon: row.lon,
  latE6: row.lat_e6,
  lonE6: row.lon_e6
});

export const saveSentDraft = async (
  payload: BleMobileMessage,
  connectedNodeId: number,
  rawText: string | null
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT OR REPLACE INTO sent_messages (
      client_message_id, connected_node_id, message, raw_text, kind, status, created_at,
      lat, lon, lat_e6, lon_e6
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    payload.clientMessageId,
    connectedNodeId,
    payload.message,
    rawText,
    payload.kind,
    "draft",
    payload.timestamp,
    payload.lat ?? null,
    payload.lon ?? null,
    payload.latE6 ?? null,
    payload.lonE6 ?? null
  );
};

export const applyMessageAck = async (ack: BleMessageAck): Promise<void> => {
  const db = await getDatabase();
  const status: SentMessageStatus = ack.accepted
    ? ack.queued
      ? "queued"
      : "sent_to_node"
    : "failed";

  await db.runAsync(
    `UPDATE sent_messages
     SET sender_node_id = ?, seq_id = ?, status = ?, sent_to_node_at = ?, failure_reason = ?
     WHERE client_message_id = ?`,
    ack.senderNodeId ?? null,
    ack.seqId ?? null,
    status,
    new Date().toISOString(),
    ack.error ?? null,
    ack.clientMessageId
  );
};

export const markSentMessageFailed = async (
  clientMessageId: string,
  reason: string
): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE sent_messages SET status = ?, failure_reason = ? WHERE client_message_id = ?`,
    "failed",
    reason,
    clientMessageId
  );
};

export const listSentMessages = async (): Promise<LocalSentMessage[]> => {
  const db = await getDatabase();
  const rows = await db.getAllAsync<SentMessageRow>(
    `SELECT * FROM sent_messages ORDER BY created_at DESC LIMIT 100`
  );
  return rows.map(toSentMessage);
};

export const clearSentMessages = async (): Promise<void> => {
  const db = await getDatabase();
  await db.runAsync("DELETE FROM sent_messages");
};
