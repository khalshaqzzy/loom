import type { AppConfig } from "../config/env";
import type { MongoContext } from "../db/client";
import { loadConfig } from "../config/env";
import { ensureIndexes, getCollections } from "../db/client";
import { createApp } from "../app";
import { createAuditWriter } from "../modules/audit/auditService";
import { bootstrapAdmin } from "../modules/auth/authService";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Db, MongoClient } from "mongodb";
import pino from "pino";

export interface TestServer {
  config: AppConfig;
  mongo: MongoContext;
  app: ReturnType<typeof createApp>;
  replSet: MongoMemoryReplSet;
  reset(): Promise<void>;
  close(): Promise<void>;
}

export const createTestServer = async (): Promise<TestServer> => {
  const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  const config = loadConfig({
    NODE_ENV: "test",
    MONGO_URI: replSet.getUri(),
    MONGO_DB_NAME: "loom_test",
    CORS_ORIGIN: "https://loomnetwork.site",
    SESSION_SECRET: "test-session-secret-000000000000000000",
    OWNER_BIRTHDATE_HASH_SECRET: "test-birthdate-secret-000000000000000",
    ADMIN_BOOTSTRAP_USERNAME: "admin",
    ADMIN_BOOTSTRAP_PASSWORD: "change-me-test-password",
    ADMIN_BOOTSTRAP_DISPLAY_NAME: "LOOM Admin",
    COOKIE_SECURE: "false"
  });
  const client = new MongoClient(config.MONGO_URI);
  await client.connect();
  const db: Db = client.db(config.MONGO_DB_NAME);
  const mongo: MongoContext = {
    client,
    db,
    collections: getCollections(db)
  };

  await ensureIndexes(mongo.collections);
  await bootstrapAdmin({
    config,
    mongo,
    logger: pino({ level: "silent" }),
    audit: createAuditWriter(mongo.collections)
  });

  return {
    config,
    mongo,
    replSet,
    app: createApp(config, mongo),
    async reset() {
      await db.dropDatabase();
      mongo.collections = getCollections(db);
      await ensureIndexes(mongo.collections);
      await bootstrapAdmin({
        config,
        mongo,
        logger: pino({ level: "silent" }),
        audit: createAuditWriter(mongo.collections)
      });
    },
    async close() {
      await client.close();
      await replSet.stop();
    }
  };
};
