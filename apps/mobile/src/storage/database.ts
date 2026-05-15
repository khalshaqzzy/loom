import * as SQLite from 'expo-sqlite';

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export const getDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync('loom_mobile.db').then(async (db) => {
      await db.execAsync(`
        PRAGMA journal_mode = WAL;
        CREATE TABLE IF NOT EXISTS schema_migrations (
          version INTEGER PRIMARY KEY,
          applied_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS sent_messages (
          client_message_id TEXT PRIMARY KEY NOT NULL,
          connected_node_id INTEGER NOT NULL,
          sender_node_id INTEGER,
          seq_id INTEGER,
          message TEXT NOT NULL,
          raw_text TEXT,
          kind TEXT NOT NULL,
          status TEXT NOT NULL,
          created_at TEXT NOT NULL,
          sent_to_node_at TEXT,
          synced_at TEXT,
          failure_reason TEXT,
          lat REAL,
          lon REAL,
          lat_e6 INTEGER,
          lon_e6 INTEGER
        );
        CREATE TABLE IF NOT EXISTS backlog_items (
          backlog_id TEXT PRIMARY KEY NOT NULL,
          sender_node_id INTEGER NOT NULL,
          seq_id INTEGER NOT NULL,
          sender_range_to_gateway INTEGER NOT NULL,
          last_forwarder_range_to_gateway INTEGER NOT NULL,
          timestamp TEXT NOT NULL,
          message TEXT NOT NULL,
          received_by_node_id INTEGER,
          source TEXT NOT NULL,
          lat REAL,
          lon REAL,
          lat_e6 INTEGER,
          lon_e6 INTEGER,
          sync_status TEXT NOT NULL,
          sync_attempts INTEGER NOT NULL DEFAULT 0,
          last_sync_error TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_backlog_sync_status ON backlog_items(sync_status);
        CREATE INDEX IF NOT EXISTS idx_sent_created_at ON sent_messages(created_at);
      `);
      return db;
    });
  }

  return databasePromise;
};

export const resetLocalData = async (): Promise<void> => {
  const db = await getDatabase();
  await db.execAsync(`
    DELETE FROM sent_messages;
    DELETE FROM backlog_items;
  `);
};
